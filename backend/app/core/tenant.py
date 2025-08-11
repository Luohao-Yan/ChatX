from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.tenant_models import Tenant, TenantStatus
import logging
from contextvars import ContextVar

logger = logging.getLogger(__name__)

# 使用ContextVar存储当前请求的租户信息
current_tenant_context: ContextVar[Optional[Tenant]] = ContextVar('current_tenant', default=None)

class TenantContext:
    """租户上下文管理器"""
    
    def __init__(self):
        self._tenant: Optional[Tenant] = None
    
    @property
    def tenant(self) -> Optional[Tenant]:
        return current_tenant_context.get()
    
    def set_tenant(self, tenant: Optional[Tenant]):
        current_tenant_context.set(tenant)
    
    def clear(self):
        current_tenant_context.set(None)
    
    @property
    def tenant_id(self) -> Optional[int]:
        tenant = self.tenant
        return tenant.id if tenant else None
    
    @property
    def is_active(self) -> bool:
        tenant = self.tenant
        return tenant and tenant.status == TenantStatus.ACTIVE
    
    def check_feature_access(self, feature_name: str) -> bool:
        """检查租户是否有权限使用某个功能"""
        tenant = self.tenant
        if not tenant:
            return False
        
        features = tenant.features or {}
        return features.get(feature_name, False)
    
    def check_quota_limit(self, resource_type: str, amount: int = 1) -> bool:
        """检查是否超过配额限制"""
        tenant = self.tenant
        if not tenant:
            return False
        
        if resource_type == "users":
            return tenant.current_users + amount <= tenant.max_users
        elif resource_type == "storage":
            return tenant.current_storage + amount <= tenant.max_storage
        elif resource_type == "files":
            return tenant.current_files + amount <= tenant.max_files
        elif resource_type == "api_calls":
            return tenant.current_api_calls + amount <= tenant.max_api_calls
        
        return True

# 全局租户上下文实例
tenant_context = TenantContext()

def get_tenant_from_request(request: Request) -> Optional[str]:
    """从请求中提取租户标识"""
    # 方法1: 从子域名提取
    host = request.headers.get("host", "")
    if "." in host:
        subdomain = host.split(".")[0]
        if subdomain and subdomain != "www" and subdomain != "api":
            return subdomain
    
    # 方法2: 从自定义头部提取
    tenant_header = request.headers.get("X-Tenant-Slug")
    if tenant_header:
        return tenant_header
    
    # 方法3: 从查询参数提取（调试用）
    tenant_param = request.query_params.get("tenant")
    if tenant_param:
        return tenant_param
    
    # 方法4: 从路径前缀提取 /tenant/{slug}/...
    path = request.url.path
    if path.startswith("/tenant/"):
        parts = path.split("/")
        if len(parts) >= 3:
            return parts[2]
    
    return None

async def get_tenant_by_identifier(db: Session, identifier: str) -> Optional[Tenant]:
    """根据标识符获取租户"""
    tenant = db.query(Tenant).filter(
        Tenant.slug == identifier,
        Tenant.is_deleted == False
    ).first()
    
    if not tenant:
        # 尝试通过域名查找
        tenant = db.query(Tenant).filter(
            Tenant.domain == identifier,
            Tenant.is_deleted == False
        ).first()
    
    if not tenant:
        # 尝试通过子域名查找
        tenant = db.query(Tenant).filter(
            Tenant.subdomain == identifier,
            Tenant.is_deleted == False
        ).first()
    
    return tenant

async def validate_tenant_status(tenant: Tenant) -> bool:
    """验证租户状态"""
    if tenant.status != TenantStatus.ACTIVE:
        return False
    
    # 检查订阅是否过期
    if tenant.subscription_ends_at:
        from datetime import datetime
        if datetime.now(tenant.subscription_ends_at.tzinfo) > tenant.subscription_ends_at:
            return False
    
    return True

def get_current_tenant() -> Tenant:
    """依赖注入：获取当前租户"""
    tenant = tenant_context.tenant
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="租户信息未找到"
        )
    return tenant

def get_current_tenant_optional() -> Optional[Tenant]:
    """依赖注入：获取当前租户（可选）"""
    return tenant_context.tenant

def require_active_tenant() -> Tenant:
    """依赖注入：要求活跃的租户"""
    tenant = get_current_tenant()
    if not tenant_context.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="租户已被暂停或已过期"
        )
    return tenant

def require_feature(feature_name: str):
    """依赖注入工厂：要求特定功能权限"""
    def _require_feature(tenant: Tenant = Depends(require_active_tenant)):
        if not tenant_context.check_feature_access(feature_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"租户无权限使用功能: {feature_name}"
            )
        return tenant
    return _require_feature

def check_quota(resource_type: str, amount: int = 1):
    """依赖注入工厂：检查配额限制"""
    def _check_quota(tenant: Tenant = Depends(require_active_tenant)):
        if not tenant_context.check_quota_limit(resource_type, amount):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"已达到{resource_type}配额限制"
            )
        return tenant
    return _check_quota

class TenantService:
    """租户服务类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_tenant(self, tenant_data: Dict[str, Any]) -> Tenant:
        """创建新租户"""
        tenant = Tenant(**tenant_data)
        self.db.add(tenant)
        self.db.commit()
        self.db.refresh(tenant)
        return tenant
    
    def update_usage_metrics(self, tenant_id: int, metric_name: str, increment: int):
        """更新使用量指标"""
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return
        
        if metric_name == "users":
            tenant.current_users += increment
        elif metric_name == "storage":
            tenant.current_storage += increment
        elif metric_name == "files":
            tenant.current_files += increment
        elif metric_name == "api_calls":
            tenant.current_api_calls += increment
        
        self.db.commit()
    
    def reset_monthly_metrics(self, tenant_id: int):
        """重置月度指标"""
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if tenant:
            tenant.current_api_calls = 0
            self.db.commit()
    
    def get_tenant_stats(self, tenant_id: int) -> Dict[str, Any]:
        """获取租户统计信息"""
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return {}
        
        return {
            "users": {
                "current": tenant.current_users,
                "limit": tenant.max_users,
                "usage_percent": (tenant.current_users / tenant.max_users) * 100
            },
            "storage": {
                "current": tenant.current_storage,
                "limit": tenant.max_storage,
                "usage_percent": (tenant.current_storage / tenant.max_storage) * 100
            },
            "files": {
                "current": tenant.current_files,
                "limit": tenant.max_files,
                "usage_percent": (tenant.current_files / tenant.max_files) * 100
            },
            "api_calls": {
                "current": tenant.current_api_calls,
                "limit": tenant.max_api_calls,
                "usage_percent": (tenant.current_api_calls / tenant.max_api_calls) * 100
            }
        }