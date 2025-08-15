"""
用户活动跟踪中间件
用于自动更新用户最后活动时间，支持在线状态判断
"""

from datetime import datetime, timezone
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.application.services.user_service import UserService
from app.infrastructure.persistence.database import get_db
from app.infrastructure.repositories.user_repository_impl import (
    UserRepository,
    UserSessionRepository, 
    UserVerificationRepository
)
from app.infrastructure.securities.security import verify_token


class UserActivityMiddleware(BaseHTTPMiddleware):
    """用户活动跟踪中间件
    
    自动更新已认证用户的最后活动时间，用于在线状态判断。
    只对需要认证的API端点生效，跳过静态资源和健康检查。
    """
    
    def __init__(
        self,
        app,
        exclude_paths: list[str] = None,
        activity_update_interval: int = 60  # 60秒内只更新一次，避免频繁写数据库
    ):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/",
            "/health",
            "/metrics", 
            "/docs",
            "/redoc",
            "/openapi.json",
            "/static",
            "/favicon.ico"
        ]
        self.activity_update_interval = activity_update_interval
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """处理请求并更新用户活动时间"""
        
        # 跳过不需要跟踪的路径
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # 执行请求
        response = await call_next(request)
        
        # 更新用户活动时间（异步执行，不影响响应速度）
        await self._update_user_activity(request)
        
        return response
    
    async def _update_user_activity(self, request: Request) -> None:
        """更新用户最后活动时间"""
        try:
            # 从请求头获取认证token
            authorization = request.headers.get("authorization")
            if not authorization or not authorization.startswith("Bearer "):
                return
            
            token = authorization.split(" ")[1]
            
            # 解析token获取用户ID
            payload = verify_token(token, "access")
            user_id = payload.get("sub") if payload else None
            
            if not user_id:
                return
            
            # 获取数据库会话
            async for db in get_db():
                # 创建服务实例
                user_repo = UserRepository(db)
                session_repo = UserSessionRepository(db)
                verification_repo = UserVerificationRepository(db)
                user_service = UserService(user_repo, session_repo, verification_repo)
                
                # 获取用户当前活动时间
                user = await user_service.get_by_id(user_id)
                if not user:
                    return
                
                current_time = datetime.now(timezone.utc)
                
                # 如果距离上次更新超过间隔时间，才更新数据库
                if (not user.last_activity or 
                    (current_time - user.last_activity.replace(tzinfo=timezone.utc)).total_seconds() > self.activity_update_interval):
                    
                    await user_service.update_user_activity(user_id, current_time)
                
                break  # 只使用第一个session
                
        except Exception:
            # 活动跟踪失败不应该影响正常业务，静默处理异常
            pass