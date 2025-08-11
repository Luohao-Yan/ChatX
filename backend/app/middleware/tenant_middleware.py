from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.tenant import (
    get_tenant_from_request, 
    get_tenant_by_identifier, 
    validate_tenant_status,
    tenant_context
)
from app.models.tenant_models import TenantStatus
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class TenantMiddleware(BaseHTTPMiddleware):
    """租户中间件 - 处理多租户路由和上下文设置"""
    
    def __init__(self, app, exclude_paths: list = None):
        super().__init__(app)
        # 不需要租户验证的路径
        self.exclude_paths = exclude_paths or [
            "/",
            "/health", 
            "/docs", 
            "/redoc", 
            "/openapi.json",
            "/api/public",  # 公开API
            "/api/system",  # 系统管理API
        ]
    
    async def dispatch(self, request: Request, call_next):
        # 清理之前的租户上下文
        tenant_context.clear()
        
        # 检查是否需要跳过租户验证
        if self._should_skip_tenant_check(request):
            response = await call_next(request)
            return response
        
        db: Session = SessionLocal()
        try:
            # 从请求中提取租户标识
            tenant_identifier = get_tenant_from_request(request)
            
            if not tenant_identifier:
                logger.warning(f"No tenant identifier found in request: {request.url}")
                return Response(
                    content="租户标识未找到",
                    status_code=400
                )
            
            # 获取租户信息
            tenant = await get_tenant_by_identifier(db, tenant_identifier)
            
            if not tenant:
                logger.warning(f"Tenant not found: {tenant_identifier}")
                return Response(
                    content="租户不存在",
                    status_code=404
                )
            
            # 验证租户状态
            if not await validate_tenant_status(tenant):
                logger.warning(f"Tenant inactive or expired: {tenant_identifier}")
                status_messages = {
                    TenantStatus.SUSPENDED: "租户已被暂停",
                    TenantStatus.EXPIRED: "租户已过期",
                    TenantStatus.CANCELLED: "租户已取消"
                }
                return Response(
                    content=status_messages.get(tenant.status, "租户状态异常"),
                    status_code=403
                )
            
            # 设置租户上下文
            tenant_context.set_tenant(tenant)
            
            # 更新最后活动时间
            tenant.last_activity_at = datetime.now()
            db.commit()
            
            # 在响应头中添加租户信息
            response = await call_next(request)
            response.headers["X-Tenant-ID"] = str(tenant.id)
            response.headers["X-Tenant-Slug"] = tenant.slug
            
            return response
            
        except Exception as e:
            logger.error(f"Tenant middleware error: {e}")
            return Response(
                content="租户处理错误",
                status_code=500
            )
        finally:
            db.close()
            # 清理租户上下文
            tenant_context.clear()
    
    def _should_skip_tenant_check(self, request: Request) -> bool:
        """检查是否应该跳过租户验证"""
        path = request.url.path.lower()
        
        # 检查排除路径
        for exclude_path in self.exclude_paths:
            if path.startswith(exclude_path.lower()):
                return True
        
        # 系统管理员路径
        if path.startswith("/admin/") or path.startswith("/system/"):
            return True
        
        return False

class TenantQuotaMiddleware(BaseHTTPMiddleware):
    """租户配额中间件 - 限制API调用频率"""
    
    def __init__(self, app):
        super().__init__(app)
        # 需要计入API调用配额的方法
        self.quota_methods = ["POST", "PUT", "PATCH", "DELETE"]
    
    async def dispatch(self, request: Request, call_next):
        # 检查是否需要计入配额
        if not self._should_count_quota(request):
            return await call_next(request)
        
        tenant = tenant_context.tenant
        if not tenant:
            return await call_next(request)
        
        # 检查API调用配额
        if tenant.current_api_calls >= tenant.max_api_calls:
            logger.warning(f"API quota exceeded for tenant: {tenant.slug}")
            return Response(
                content="API调用配额已用完",
                status_code=429,
                headers={"Retry-After": "3600"}  # 1小时后重试
            )
        
        # 执行请求
        response = await call_next(request)
        
        # 如果请求成功，增加API调用计数
        if 200 <= response.status_code < 300:
            db: Session = SessionLocal()
            try:
                db_tenant = db.query(tenant.__class__).filter(
                    tenant.__class__.id == tenant.id
                ).first()
                if db_tenant:
                    db_tenant.current_api_calls += 1
                    db.commit()
                    # 更新上下文中的租户信息
                    tenant.current_api_calls += 1
            except Exception as e:
                logger.error(f"Failed to update API quota: {e}")
            finally:
                db.close()
        
        # 在响应头中添加配额信息
        response.headers["X-API-Quota-Used"] = str(tenant.current_api_calls)
        response.headers["X-API-Quota-Limit"] = str(tenant.max_api_calls)
        response.headers["X-API-Quota-Remaining"] = str(
            tenant.max_api_calls - tenant.current_api_calls
        )
        
        return response
    
    def _should_count_quota(self, request: Request) -> bool:
        """检查是否应该计入API调用配额"""
        # 只对特定HTTP方法计入配额
        if request.method not in self.quota_methods:
            return False
        
        # 排除健康检查等路径
        path = request.url.path.lower()
        exclude_paths = ["/health", "/metrics", "/docs"]
        for exclude_path in exclude_paths:
            if path.startswith(exclude_path):
                return False
        
        return True

class TenantSecurityMiddleware(BaseHTTPMiddleware):
    """租户安全中间件 - IP白名单等安全检查"""
    
    async def dispatch(self, request: Request, call_next):
        tenant = tenant_context.tenant
        if not tenant:
            return await call_next(request)
        
        # IP白名单检查
        if tenant.allowed_ips:
            client_ip = self._get_client_ip(request)
            if client_ip not in tenant.allowed_ips:
                logger.warning(f"Access denied for IP {client_ip} in tenant {tenant.slug}")
                return Response(
                    content="访问被拒绝：IP地址不在白名单中",
                    status_code=403
                )
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP地址"""
        # 检查代理头部
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # 直接连接IP
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"