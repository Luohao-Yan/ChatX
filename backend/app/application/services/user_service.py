from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status

from app.domain.repositories.user_repository import (
    IUserRepository, IUserSessionRepository, IUserVerificationRepository
)
from app.domain.services.user_domain_service import UserDomainService
from app.schemas.user_schemas import UserCreate, UserUpdate, LoginRequest
from app.models.user_models import User, UserSession, UserVerification
from app.infrastructure.securities import security
from app.application.middleware.verification_service import get_verification_service
from app.application.middleware.session_cache_service import get_session_cache_service
from app.application.middleware.api_cache_service import get_api_cache_service, cached_api
from app.application.middleware.rate_limiter_service import get_rate_limiter_service
from app.tasks.user_tasks import send_verification_email
from app.application.services.email_service import get_email_service


class UserService:
    """用户应用服务 - 协调各种操作和业务流程"""
    
    def __init__(
        self,
        user_repo: IUserRepository,
        session_repo: IUserSessionRepository,
        verification_repo: IUserVerificationRepository
    ):
        self.user_repo = user_repo
        self.session_repo = session_repo
        self.verification_repo = verification_repo
        self.domain_service = UserDomainService()
    
    async def register_user(self, user_data: UserCreate, client_ip: str = None) -> User:
        """用户注册"""
        # 0. 检查注册限流
        rate_limiter = await get_rate_limiter_service()
        identifier = client_ip or user_data.email
        
        allowed, limit_info = await rate_limiter.check_rate_limit(identifier, "register")
        if not allowed:
            raise HTTPException(status_code=429, detail=limit_info["message"])
        
        # 记录注册请求
        await rate_limiter.record_request(identifier, "register")
        
        # 1. 领域验证
        is_valid, error_msg = self.domain_service.validate_user_registration(
            user_data.email, user_data.username, user_data.password
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 2. 检查邮箱是否已存在
        if await self.user_repo.exists_by_email(user_data.email, tenant_id=1):
            raise HTTPException(status_code=400, detail="该邮箱已被注册")
        
        # 3. 检查用户名是否已存在
        if await self.user_repo.exists_by_username(user_data.username, tenant_id=1):
            raise HTTPException(status_code=400, detail="该用户名已被使用")
        
        # 4. 密码加密
        hashed_password = self.domain_service.hash_password(user_data.password)
        
        # 5. 创建用户
        user_create_data = {
            "email": user_data.email,
            "username": user_data.username,
            "full_name": user_data.full_name,
            "hashed_password": hashed_password,
            "tenant_id": 1,  # 默认租户
            "is_active": True,
            "is_verified": False,
        }
        
        user = await self.user_repo.create(user_create_data)
        
        # 6. 创建邮箱验证码
        await self._create_email_verification(user.id, user.email)
        
        return user
    
    async def authenticate_and_login(self, login_data: LoginRequest, 
                                   client_ip: str = None) -> Dict[str, Any]:
        """用户认证和登录"""
        # 确定登录标识符（用于限流记录）
        login_identifier = login_data.email or login_data.username
        
        # 0. 检查登录限流和黑名单
        rate_limiter = await get_rate_limiter_service()
        
        # 检查登录尝试次数
        login_check = await rate_limiter.check_login_attempts(login_identifier, client_ip)
        if not login_check["allowed"]:
            raise HTTPException(status_code=429, detail=login_check["message"])
        
        # 检查登录频率限制
        identifier = client_ip or login_identifier
        allowed, limit_info = await rate_limiter.check_rate_limit(identifier, "login")
        if not allowed:
            raise HTTPException(status_code=429, detail=limit_info["message"])
        
        # 记录登录请求
        await rate_limiter.record_request(identifier, "login")
        
        # 1. 获取用户 - 支持邮箱或用户名登录
        user = None
        if login_data.email:
            user = await self.user_repo.get_by_email(login_data.email, tenant_id=1)
        elif login_data.username:
            user = await self.user_repo.get_by_username(login_data.username, tenant_id=1)
        
        if not user:
            # 记录失败登录
            await rate_limiter.record_failed_login(login_identifier, client_ip)
            raise HTTPException(status_code=400, detail="用户名/邮箱或密码错误")
        
        # 2. 检查用户状态
        can_login, error_msg = self.domain_service.can_user_login(user)
        if not can_login:
            await rate_limiter.record_failed_login(login_identifier, client_ip)
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 3. 验证密码
        if not self.domain_service.authenticate_user(user, login_data.password):
            # 记录失败登录
            await rate_limiter.record_failed_login(login_identifier, client_ip)
            raise HTTPException(status_code=400, detail="用户名/邮箱或密码错误")
        
        # 登录成功，清除失败记录
        await rate_limiter.clear_login_attempts(login_identifier, client_ip)
        
        # 4. 生成令牌，包含用户信息
        user_data = {
            "email": user.email,
            "username": user.username,
            "roles": [role.name for role in user.roles] if user.roles else []
        }
        access_token = security.create_access_token(subject=user.id, user_data=user_data)
        refresh_token = security.create_refresh_token(subject=user.id)
        
        # 5. 创建会话
        session_data = {
            "user_id": user.id,
            "refresh_token": refresh_token,
            "device_info": login_data.device_info,
            "ip_address": client_ip,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "is_active": True,
        }
        
        session = await self.session_repo.create_session(session_data)
        
        # 缓存会话到Redis
        if session:
            session_cache = await get_session_cache_service()
            await session_cache.cache_session(session)
        
        # 6. 更新最后登录时间
        await self.user_repo.update(user.id, {"last_login": datetime.now(timezone.utc)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": refresh_token
        }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """刷新访问令牌"""
        # 1. 验证刷新令牌
        payload = security.verify_token(refresh_token, "refresh")
        if not payload:
            raise HTTPException(status_code=401, detail="无效的刷新令牌")
        
        # 2. 先从Redis缓存检查会话
        session_cache = await get_session_cache_service()
        cached_session = await session_cache.get_session_by_refresh_token(refresh_token)
        
        session = None
        if cached_session:
            # 从缓存获取到会话
            if cached_session.get("expires_at"):
                expires_at = datetime.fromisoformat(cached_session["expires_at"].replace('Z', '+00:00'))
                if expires_at > datetime.now(timezone.utc):
                    session = cached_session
        
        # 如果缓存中没有或已过期，从数据库获取
        if not session:
            db_session = await self.session_repo.get_by_refresh_token(refresh_token)
            if not db_session or db_session.expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="刷新令牌已过期")
            
            # 重新缓存会话
            await session_cache.cache_session(db_session)
            session = session_cache._session_to_cache_data(db_session)
        
        # 3. 检查用户状态
        user = await self.user_repo.get_by_id(payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="用户不存在或已被禁用")
        
        # 4. 生成新的访问令牌，包含用户信息
        user_data = {
            "email": user.email,
            "username": user.username,
            "roles": [role.name for role in user.roles] if user.roles else []
        }
        access_token = security.create_access_token(subject=user.id, user_data=user_data)
        
        # 5. 更新会话最后使用时间（同时更新数据库和缓存）
        session_id = session.get("id")
        if session_id:
            await self.session_repo.update_session(
                session_id, 
                {"last_used": datetime.now(timezone.utc)}
            )
            await session_cache.update_session_last_used(session_id)
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    async def logout(self, refresh_token: str) -> bool:
        """用户登出"""
        session = await self.session_repo.get_by_refresh_token(refresh_token)
        if session:
            # 同时删除数据库和缓存中的会话
            await self.session_repo.deactivate_session(session.id)
            
            session_cache = await get_session_cache_service()
            await session_cache.deactivate_session(session.id)
        return True
    
    async def logout_all_devices(self, user_id: int) -> bool:
        """用户登出所有设备"""
        # 同时删除数据库和缓存中的所有会话
        db_result = await self.session_repo.deactivate_all_user_sessions(user_id)
        
        session_cache = await get_session_cache_service()
        await session_cache.deactivate_all_user_sessions(user_id)
        
        return db_result
    
    async def verify_email(self, email: str, verification_code: str) -> bool:
        """验证邮箱"""
        # 1. 获取用户
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 2. 使用Redis验证码服务验证
        verification_service = await get_verification_service()
        result = await verification_service.verify_code(
            user.id, "email", verification_code
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400, 
                detail=result["error"]
            )
        
        # 3. 更新用户状态
        await self.user_repo.update(user.id, {"is_verified": True})
        
        return True
    
    async def get_user_by_id(self, user_id: int, current_user: User) -> Optional[User]:
        """获取用户信息"""
        # 权限检查
        if not self.domain_service.can_user_access_user_data(current_user, user_id):
            raise HTTPException(status_code=403, detail="无权限访问此用户信息")
        
        # 尝试从缓存获取用户信息
        cache_service = await get_api_cache_service()
        cached_user = await cache_service.get_cached_user_data(user_id, "profile")
        
        if cached_user:
            return cached_user
        
        # 从数据库获取并缓存
        user = await self.user_repo.get_by_id(user_id)
        if user:
            # 缓存用户信息（30分钟）
            user_data = {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "is_superuser": user.is_superuser,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            }
            await cache_service.cache_user_data(user_id, "profile", user_data, 1800)
        
        return user
    
    async def get_users_list(self, current_user: User, skip: int = 0, 
                           limit: int = 100, include_deleted: bool = False) -> List[User]:
        """获取用户列表"""
        return await self.user_repo.get_list(
            current_user.tenant_id, skip, limit, include_deleted
        )
    
    async def update_user(self, user_id: int, update_data: UserUpdate, 
                         current_user: User) -> Optional[User]:
        """更新用户信息"""
        # 权限检查
        if not self.domain_service.can_user_access_user_data(current_user, user_id):
            raise HTTPException(status_code=403, detail="无权限修改此用户信息")
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        # 如果更新密码，需要加密
        if "password" in update_dict:
            update_dict["hashed_password"] = self.domain_service.hash_password(
                update_dict.pop("password")
            )
        
        # 更新数据库
        updated_user = await self.user_repo.update(user_id, update_dict)
        
        # 清除用户相关缓存
        if updated_user:
            cache_service = await get_api_cache_service()
            await cache_service.invalidate_user_cache(user_id)
            
            # 如果用户状态发生变化，也要清除会话缓存
            if "is_active" in update_dict and not update_dict["is_active"]:
                await self.logout_all_devices(user_id)
        
        return updated_user
    
    async def delete_user(self, user_id: int, current_user: User) -> bool:
        """删除用户"""
        # 1. 获取目标用户
        target_user = await self.user_repo.get_by_id(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 2. 领域验证
        can_delete, error_msg = self.domain_service.can_user_be_deleted(
            target_user, current_user.id
        )
        if not can_delete:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 3. 执行软删除
        delete_data = self.domain_service.prepare_user_for_deletion(
            target_user, current_user.id
        )
        await self.user_repo.update(user_id, delete_data)
        
        return True
    
    async def get_user_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """获取用户会话列表"""
        # 优先从Redis缓存获取
        session_cache = await get_session_cache_service()
        cached_sessions = await session_cache.get_user_active_sessions(user_id)
        
        if cached_sessions:
            return cached_sessions
        
        # 如果缓存中没有，从数据库获取并缓存
        db_sessions = await self.session_repo.get_user_active_sessions(user_id)
        
        # 缓存到Redis
        session_data_list = []
        for session in db_sessions:
            await session_cache.cache_session(session)
            session_data_list.append(session_cache._session_to_cache_data(session))
        
        return session_data_list
    
    async def revoke_user_session(self, session_id: int, current_user: User) -> bool:
        """撤销用户会话"""
        # 这里可以添加权限检查，确保只能撤销自己的会话
        return await self.session_repo.deactivate_session(session_id)
    
    async def send_password_reset_code(self, email: str, client_ip: str = None) -> Dict[str, Any]:
        """发送密码重置验证码"""
        # 0. 检查发送验证码限流
        rate_limiter = await get_rate_limiter_service()
        identifier = client_ip or email
        
        allowed, limit_info = await rate_limiter.check_rate_limit(identifier, "send_code")
        if not allowed:
            raise HTTPException(status_code=429, detail=limit_info["message"])
        
        # 记录发送请求
        await rate_limiter.record_request(identifier, "send_code")
        
        # 1. 检查用户是否存在
        user = await self.user_repo.get_by_email(email)
        if not user:
            # 为了安全起见，即使用户不存在也返回成功
            return {"success": True, "message": "如果该邮箱存在，验证码已发送"}
        
        # 2. 创建密码重置验证码
        verification_service = await get_verification_service()
        verification_code = await verification_service.create_verification_code(
            user.id, "password_reset", expire_seconds=3600  # 1小时过期
        )
        
        if verification_code:
            # 发送验证邮件
            send_verification_email.delay(email, verification_code, "password_reset")
            return {"success": True, "message": "密码重置验证码已发送"}
        else:
            raise HTTPException(
                status_code=429, 
                detail="验证码发送过于频繁，请稍后再试"
            )
    
    async def reset_password_with_code(
        self, 
        email: str, 
        verification_code: str, 
        new_password: str
    ) -> bool:
        """使用验证码重置密码"""
        # 1. 获取用户
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 2. 验证验证码
        verification_service = await get_verification_service()
        result = await verification_service.verify_code(
            user.id, "password_reset", verification_code
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400, 
                detail=result["error"]
            )
        
        # 3. 验证新密码强度
        is_valid, error_msg = security.validate_password_strength(new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 4. 更新密码
        hashed_password = self.domain_service.hash_password(new_password)
        await self.user_repo.update(user.id, {"hashed_password": hashed_password})
        
        # 5. 注销所有会话
        await self.logout_all_devices(user.id)
        
        return True
    
    async def get_verification_status(
        self, 
        user_id: int, 
        verification_type: str
    ) -> Optional[Dict[str, Any]]:
        """获取验证码状态"""
        verification_service = await get_verification_service()
        return await verification_service.get_verification_info(user_id, verification_type)
    
    async def resend_verification_code(self, email: str, verification_type: str = "email", client_ip: str = None) -> Dict[str, Any]:
        """重新发送验证码"""
        # 0. 检查发送验证码限流
        rate_limiter = await get_rate_limiter_service()
        identifier = client_ip or email
        
        allowed, limit_info = await rate_limiter.check_rate_limit(identifier, "send_code")
        if not allowed:
            raise HTTPException(status_code=429, detail=limit_info["message"])
        
        # 记录发送请求
        await rate_limiter.record_request(identifier, "send_code")
        
        # 1. 获取用户
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 2. 创建新的验证码
        verification_service = await get_verification_service()
        verification_code = await verification_service.create_verification_code(
            user.id, verification_type, expire_seconds=3600
        )
        
        if verification_code:
            # 发送验证邮件
            send_verification_email.delay(email, verification_code, verification_type)
            return {"success": True, "message": f"{verification_type}验证码已重新发送"}
        else:
            # 获取冷却时间信息
            info = await verification_service.get_verification_info(user.id, verification_type)
            cooldown_remaining = info.get("cooldown_remaining", 0) if info else 0
            
            raise HTTPException(
                status_code=429, 
                detail=f"验证码发送过于频繁，请等待 {cooldown_remaining} 秒后重试"
            )

    async def _create_email_verification(self, user_id: int, email: str) -> None:
        """创建邮箱验证码"""
        # 使用Redis验证码服务
        verification_service = await get_verification_service()
        verification_code = await verification_service.create_verification_code(
            user_id, "email_verification", expire_seconds=3600  # 1小时过期
        )
        
        if verification_code:
            # 发送验证邮件
            email_service = await get_email_service()
            success = await email_service.send_verification_email(
                email, verification_code, "email_verification"
            )
            if not success:
                # 如果邮件发送失败，仍可使用Celery任务作为备份
                send_verification_email.delay(email, verification_code)
        else:
            raise HTTPException(
                status_code=429, 
                detail="验证码发送过于频繁，请稍后再试"
            )
    
    async def update_user_activity(self, user_id: int, activity_time: datetime = None) -> bool:
        """更新用户最后活动时间
        
        Args:
            user_id: 用户ID
            activity_time: 活动时间，默认为当前时间
            
        Returns:
            bool: 更新是否成功
        """
        if activity_time is None:
            activity_time = datetime.now(timezone.utc)
        
        try:
            await self.user_repo.update(user_id, {"last_activity": activity_time})
            return True
        except Exception:
            return False