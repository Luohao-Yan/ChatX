"""
请求日志中间件
记录HTTP请求和响应信息，支持链路追踪
"""

import time
import uuid
import json
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import logging

from app.core.logging_config import (
    set_request_context, 
    clear_request_context,
    log_performance_event,
    get_logger
)
from app.core.tenant import tenant_context

logger = get_logger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """请求日志中间件"""
    
    def __init__(
        self, 
        app: ASGIApp,
        exclude_paths: list = None,
        log_request_body: bool = False,
        log_response_body: bool = False,
        max_body_size: int = 1024 * 10  # 10KB
    ):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ['/health', '/metrics', '/docs', '/redoc', '/openapi.json']
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body
        self.max_body_size = max_body_size
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 生成请求ID
        request_id = str(uuid.uuid4())
        
        # 检查是否需要跳过日志记录
        if self._should_skip_logging(request):
            return await call_next(request)
        
        # 记录请求开始时间
        start_time = time.time()
        
        # 提取客户端信息
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # 设置请求上下文
        set_request_context(request_id=request_id)
        
        # 记录请求体（如果需要且不是文件上传）
        request_body = None
        if (self.log_request_body and 
            request.method in ["POST", "PUT", "PATCH"] and
            not self._is_file_upload(request)):
            request_body = await self._get_request_body(request)
        
        # 记录请求开始日志
        logger.info(
            "HTTP Request Started",
            extra={
                "http_method": request.method,
                "http_url": str(request.url),
                "http_path": request.url.path,
                "http_query_params": dict(request.query_params),
                "http_headers": dict(request.headers),
                "client_ip": client_ip,
                "user_agent": user_agent,
                "request_body": request_body,
                "request_size": len(request_body or ""),
                "event_type": "request_start"
            }
        )
        
        response = None
        error_info = None
        
        try:
            # 执行请求
            response = await call_next(request)
            
            # 计算响应时间
            end_time = time.time()
            duration_ms = (end_time - start_time) * 1000
            
            # 获取租户和用户信息（如果可用）
            tenant = tenant_context.tenant
            tenant_id = tenant.id if tenant else None
            
            # 记录响应体（如果需要且响应状态正常）
            response_body = None
            if (self.log_response_body and 
                response.status_code < 400 and
                self._should_log_response_body(response)):
                response_body = await self._get_response_body(response)
            
            # 设置完整的请求上下文
            if tenant_id:
                set_request_context(
                    request_id=request_id,
                    tenant_id=str(tenant_id)
                )
            
            # 记录请求完成日志
            log_level = self._get_log_level(response.status_code)
            logger.log(
                log_level,
                f"HTTP Request Completed: {request.method} {request.url.path} - {response.status_code}",
                extra={
                    "http_method": request.method,
                    "http_url": str(request.url),
                    "http_path": request.url.path,
                    "http_status_code": response.status_code,
                    "http_response_headers": dict(response.headers),
                    "response_body": response_body,
                    "response_size": response.headers.get("content-length", 0),
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                    "user_agent": user_agent,
                    "tenant_id": tenant_id,
                    "event_type": "request_complete"
                }
            )
            
            # 记录性能指标
            log_performance_event(
                f"{request.method} {request.url.path}",
                duration_ms,
                {
                    "status_code": response.status_code,
                    "client_ip": client_ip
                }
            )
            
            # 在响应头中添加请求ID
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # 记录异常信息
            end_time = time.time()
            duration_ms = (end_time - start_time) * 1000
            
            error_info = {
                "error_type": type(e).__name__,
                "error_message": str(e)
            }
            
            logger.error(
                f"HTTP Request Failed: {request.method} {request.url.path} - {str(e)}",
                extra={
                    "http_method": request.method,
                    "http_url": str(request.url),
                    "http_path": request.url.path,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                    "user_agent": user_agent,
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "event_type": "request_error"
                }
            )
            
            # 记录错误性能指标
            log_performance_event(
                f"{request.method} {request.url.path}",
                duration_ms,
                {
                    "status": "error",
                    "error_type": type(e).__name__,
                    "client_ip": client_ip
                }
            )
            
            raise
        finally:
            # 清理请求上下文
            clear_request_context()
    
    def _should_skip_logging(self, request: Request) -> bool:
        """检查是否应该跳过日志记录"""
        path = request.url.path.lower()
        
        for exclude_path in self.exclude_paths:
            if path.startswith(exclude_path.lower()):
                return True
        
        return False
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP地址"""
        # 检查代理头部
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # 直接连接IP
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"
    
    def _is_file_upload(self, request: Request) -> bool:
        """检查是否是文件上传请求"""
        content_type = request.headers.get("content-type", "")
        return content_type.startswith("multipart/form-data")
    
    async def _get_request_body(self, request: Request) -> str:
        """获取请求体"""
        try:
            body = await request.body()
            if len(body) > self.max_body_size:
                return f"<Body too large: {len(body)} bytes>"
            
            # 尝试解析为JSON
            try:
                return json.loads(body.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                return body.decode("utf-8", errors="replace")[:self.max_body_size]
                
        except Exception:
            return "<Failed to read request body>"
    
    def _should_log_response_body(self, response: Response) -> bool:
        """检查是否应该记录响应体"""
        content_type = response.headers.get("content-type", "")
        
        # 只记录JSON响应
        if "application/json" in content_type:
            return True
        
        # 跳过二进制内容
        if any(ct in content_type for ct in ["image/", "video/", "audio/", "application/octet-stream"]):
            return False
        
        return False
    
    async def _get_response_body(self, response: Response) -> str:
        """获取响应体"""
        try:
            # 注意：这会消耗response body，需要重新设置
            if hasattr(response, 'body'):
                body = response.body
                if len(body) > self.max_body_size:
                    return f"<Response too large: {len(body)} bytes>"
                
                try:
                    return json.loads(body.decode("utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    return body.decode("utf-8", errors="replace")[:self.max_body_size]
        except Exception:
            pass
        
        return "<Failed to read response body>"
    
    def _get_log_level(self, status_code: int) -> int:
        """根据状态码确定日志级别"""
        if status_code >= 500:
            return logging.ERROR
        elif status_code >= 400:
            return logging.WARNING
        else:
            return logging.INFO

class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    """安全日志中间件"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.security_logger = logging.getLogger("security")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 检查可疑的请求模式
        suspicious_patterns = [
            "eval(",
            "script>",
            "SELECT * FROM",
            "UNION SELECT",
            "../../../",
            "passwd",
            "etc/shadow"
        ]
        
        request_url = str(request.url).lower()
        user_agent = request.headers.get("user-agent", "").lower()
        
        # 检查URL中的可疑模式
        for pattern in suspicious_patterns:
            if pattern.lower() in request_url:
                self.security_logger.warning(
                    f"Suspicious request pattern detected: {pattern}",
                    extra={
                        "pattern": pattern,
                        "request_url": str(request.url),
                        "client_ip": self._get_client_ip(request),
                        "user_agent": request.headers.get("user-agent", ""),
                        "security_event_type": "suspicious_request"
                    }
                )
                break
        
        # 检查User-Agent
        bot_patterns = ["bot", "crawler", "spider", "scraper"]
        if any(pattern in user_agent for pattern in bot_patterns):
            self.security_logger.info(
                f"Bot request detected",
                extra={
                    "user_agent": request.headers.get("user-agent", ""),
                    "client_ip": self._get_client_ip(request),
                    "request_path": request.url.path,
                    "security_event_type": "bot_request"
                }
            )
        
        response = await call_next(request)
        
        # 记录认证失败
        if response.status_code == 401:
            self.security_logger.warning(
                "Authentication failed",
                extra={
                    "client_ip": self._get_client_ip(request),
                    "user_agent": request.headers.get("user-agent", ""),
                    "request_path": request.url.path,
                    "security_event_type": "auth_failed"
                }
            )
        
        # 记录权限被拒绝
        elif response.status_code == 403:
            self.security_logger.warning(
                "Access denied",
                extra={
                    "client_ip": self._get_client_ip(request),
                    "user_agent": request.headers.get("user-agent", ""),
                    "request_path": request.url.path,
                    "security_event_type": "access_denied"
                }
            )
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP地址"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"