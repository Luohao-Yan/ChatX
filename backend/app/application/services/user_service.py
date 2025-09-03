from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
import uuid
import logging

logger = logging.getLogger(__name__)

from app.domain.repositories.user_repository import (
    IUserRepository, IUserSessionRepository, IUserVerificationRepository
)
from app.domain.services.user_domain_service import UserDomainService
from app.schemas.user_schemas import UserCreate, UserUpdate, LoginRequest, UserBatchImportResponse
from app.schemas.batch_schemas import BatchOperationResponse
from app.models.user_models import User, UserSession, UserVerification, UserType
from app.models.org_models import UserOrganization
from app.infrastructure.securities import security
from app.application.middleware.verification_service import get_verification_service
from app.application.middleware.session_cache_service import get_session_cache_service
from app.application.middleware.api_cache_service import get_api_cache_service, cached_api
from app.application.middleware.rate_limiter_service import get_rate_limiter_service
from app.tasks.user_tasks import send_verification_email
from app.application.services.email_service import get_email_service
from app.domain.initialization.tenant_init import ensure_public_tenant_exists, ensure_public_default_organization_exists


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
        if await self.user_repo.exists_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="该邮箱已被注册")
        
        # 3. 检查用户名是否已存在
        if await self.user_repo.exists_by_username(user_data.username):
            raise HTTPException(status_code=400, detail="该用户名已被使用")
        
        # 4. 密码加密
        hashed_password = self.domain_service.hash_password(user_data.password)
        
        # 5. 获取public租户ID - 个人用户注册时自动分配到public租户
        public_tenant_id = ensure_public_tenant_exists(self.user_repo.db)
        
        # 5.1. 确保公共租户的默认组织存在
        public_org_id = ensure_public_default_organization_exists(self.user_repo.db)
        
        # 6. 创建用户 - 个人用户类型，分配到public租户
        user_create_data = {
            "email": user_data.email,
            "username": user_data.username,
            "hashed_password": hashed_password,
            "user_type": UserType.INDIVIDUAL,  # 个人用户类型
            "current_tenant_id": public_tenant_id,  # 使用public租户
            "tenant_ids": [public_tenant_id],  # 租户列表
            "is_active": True,
            "is_verified": False,
        }
        
        user = await self.user_repo.create(user_create_data)
        
        # 6.1. 创建用户资料（如果有full_name）
        if user_data.full_name:
            await self._create_user_profile(user.id, user_data.full_name)
        
        # 7. 将用户自动加入公共组织
        await self._add_user_to_public_organization(user.id, public_org_id, public_tenant_id)
        
        # 8. 创建邮箱验证码
        await self._create_email_verification(user.id, user.email)
        
        return user
    
    async def create_user_by_admin(self, user_data: UserCreate, current_user: User) -> User:
        """管理员创建用户"""
        # 1. 权限检查 - 只有管理员可以创建用户
        if not current_user.is_superuser and not current_user.is_active:
            raise HTTPException(
                status_code=403, 
                detail="权限不足，只有管理员可以创建用户"
            )
        
        # 2. 领域验证
        is_valid, error_msg = self.domain_service.validate_user_registration(
            user_data.email, user_data.username, user_data.password
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 3. 检查邮箱是否已存在
        if await self.user_repo.exists_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="该邮箱已被注册")
        
        # 4. 检查用户名是否已存在
        if await self.user_repo.exists_by_username(user_data.username):
            raise HTTPException(status_code=400, detail="该用户名已被使用")
        
        # 5. 密码加密
        hashed_password = self.domain_service.hash_password(user_data.password)
        
        # 6. 创建用户数据（只包含User模型的字段）- 企业用户由管理员创建
        tenant_id = getattr(user_data, 'tenant_id', current_user.current_tenant_id or "1")
        user_create_data = {
            "email": user_data.email,
            "username": user_data.username,
            "hashed_password": hashed_password,
            "user_type": UserType.ENTERPRISE,  # 企业用户类型
            "current_tenant_id": tenant_id,
            "tenant_ids": [tenant_id],
            "is_active": getattr(user_data, 'is_active', True),
            "is_verified": getattr(user_data, 'is_verified', True),  # 管理员创建的用户默认已验证
        }
        
        # 7. 创建用户
        user = await self.user_repo.create(user_create_data)
        
        # 8. 创建用户资料（如果有full_name或其他资料信息）
        if hasattr(user_data, 'full_name') and user_data.full_name:
            try:
                from app.models.user_models import UserProfile
                from app.infrastructure.persistence.database import get_async_session
                from sqlalchemy import select
                
                # 创建用户资料
                profile_data = {
                    "id": str(uuid.uuid4()),
                    "user_id": user.id,
                    "full_name": user_data.full_name,
                    "phone": getattr(user_data, 'phone', None),
                }
                
                async with get_async_session() as session:
                    profile = UserProfile(**profile_data)
                    session.add(profile)
                    await session.commit()
                    
            except Exception as e:
                logger.warning(f"Failed to create user profile for user {user.id}: {e}")
                # 资料创建失败不影响用户创建
        
        # 9. 如果指定了角色，分配角色
        if hasattr(user_data, 'roles') and user_data.roles:
            try:
                # 这里假设有角色分配的方法，如果没有可以先留空
                # await self.assign_user_roles(user.id, user_data.roles, current_user)
                pass
            except Exception as e:
                # 角色分配失败不影响用户创建
                logger.warning(f"Role assignment failed for user {user.id}: {e}")
        
        # 10. 如果指定了组织，自动关联到组织
        if hasattr(user_data, 'organization_id') and user_data.organization_id:
            try:
                from app.application.services.org_service import OrgService
                from app.schemas.org_schemas import UserOrganizationCreate
                
                # 使用现有的数据库会话（从仓库获取）
                org_service = OrgService(self.user_repo.db, current_user.id, tenant_id)
                
                # 创建用户-组织关联数据
                user_org_data = UserOrganizationCreate(
                    user_id=user.id,
                    organization_id=user_data.organization_id,
                    team_id=getattr(user_data, 'team_id', None),
                    role="member"  # 默认角色
                )
                
                # 添加用户到组织
                success = org_service.add_user_to_organization(user_org_data)
                if not success:
                    logger.warning(f"Failed to add user {user.id} to organization {user_data.organization_id}")
                        
            except Exception as e:
                # 组织关联失败不影响用户创建
                logger.warning(f"Organization association failed for user {user.id}: {e}")
        
        # 11. 如果需要邮箱验证且未验证，创建验证码
        if not user.is_verified:
            try:
                await self._create_email_verification(user.id, user.email)
            except Exception as e:
                # 验证码创建失败不影响用户创建
                logger.warning(f"Email verification creation failed for user {user.id}: {e}")
        
        return user
    
    async def authenticate_and_login(self, login_data: LoginRequest, 
                                   client_ip: str = None) -> Dict[str, Any]:
        """用户认证和登录"""
        # 确定登录标识符（用于限流记录）
        login_identifier = login_data.identifier or login_data.email or login_data.username
        
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
        
        # 1. 获取用户 - 支持邮箱、用户名或手机号登录（智能识别）
        user = None
        
        # 优先使用新的identifier字段
        if login_data.identifier:
            # 智能识别登录方式
            identifier_value = login_data.identifier.strip()
            
            # 邮箱格式检测
            if '@' in identifier_value and '.' in identifier_value.split('@')[-1]:
                user = await self.user_repo.get_by_email(identifier_value)
            # 手机号格式检测（中国手机号）
            elif identifier_value.isdigit() and len(identifier_value) == 11 and identifier_value.startswith('1'):
                user = await self.user_repo.get_by_phone(identifier_value)
            # 用户名格式（字母、数字、下划线、连字符）
            else:
                user = await self.user_repo.get_by_username(identifier_value)
        
        # 向后兼容：支持旧的email和username字段
        elif login_data.email:
            user = await self.user_repo.get_by_email(login_data.email)
        elif login_data.username:
            user = await self.user_repo.get_by_username(login_data.username)
        
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
            "roles": user.role_list  # 使用property方法获取角色列表
        }
        access_token = security.create_access_token(subject=user.id, user_data=user_data)
        refresh_token = security.create_refresh_token(subject=user.id)
        
        # 5. 创建会话
        # 生成简短的设备ID（取User-Agent的前80个字符作为设备标识）
        device_id = None
        if login_data.device_info:
            device_id = login_data.device_info[:80] if len(login_data.device_info) > 80 else login_data.device_info
        
        session_data = {
            "user_id": str(user.id),  # 确保是字符串
            "session_token": refresh_token,  # refresh_token 作为 session_token
            "device_id": device_id,  # 截断后的设备标识
            "user_agent": login_data.device_info,  # 完整的user_agent存储到Text字段
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
            "roles": user.role_list  # 使用property方法获取角色列表
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
    
    async def logout_all_devices(self, user_id: str) -> bool:
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
    
    async def get_user_by_id(self, user_id: str, current_user: User) -> Optional[User]:
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
                           limit: int = 100, include_deleted: bool = False,
                           status: Optional[str] = None, organization_id: Optional[str] = None,
                           search: Optional[str] = None, tenant_id: Optional[str] = None) -> List[User]:
        """获取用户列表
        
        根据用户角色决定可见范围：
        - 超级管理员：可以查看指定租户的用户（通过tenant_id参数）
        - 普通管理员：只能看到自己租户的用户
        """
        # 🎯 修复：超级管理员权限检查逻辑
        if current_user.is_superuser:
            # ✅ 超级管理员：可以查看任何租户的用户数据
            if tenant_id:
                target_tenant_id = tenant_id  # 使用前端指定的租户ID
            else:
                target_tenant_id = current_user.current_tenant_id  # 默认使用自己的租户ID
        else:
            # 非超级管理员：只能查看自己租户的用户
            target_tenant_id = current_user.current_tenant_id
        
        logger.debug(f"获取用户列表 - 超级管理员: {current_user.is_superuser}, 目标租户ID: {target_tenant_id}")
        
        return await self.user_repo.get_list(
            tenant_id=target_tenant_id,
            skip=skip, 
            limit=limit, 
            include_deleted=include_deleted,
            status=status,
            organization_id=organization_id,
            search=search
        )
    
    async def get_deleted_users(self, current_user: User, skip: int = 0, limit: int = 100) -> List[User]:
        """获取回收站中的已删除用户"""
        return await self.user_repo.get_deleted_list(
            tenant_id=current_user.current_tenant_id,
            skip=skip,
            limit=limit
        )
    
    async def update_user(self, user_id: str, update_data: UserUpdate, 
                         current_user: User) -> Optional[User]:
        """更新用户信息"""
        # 权限检查
        if not self.domain_service.can_user_access_user_data(current_user, user_id):
            raise HTTPException(status_code=403, detail="无权限修改此用户信息")
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        # 如果要停用用户，需要额外的权限检查
        if "is_active" in update_dict and not update_dict["is_active"]:
            target_user = await self.user_repo.get_by_id(user_id)
            if not target_user:
                raise HTTPException(status_code=404, detail="用户不存在")
            
            can_disable, error_msg = self.domain_service.can_user_be_disabled(
                target_user, current_user.id
            )
            if not can_disable:
                raise HTTPException(status_code=400, detail=error_msg)
        
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
    
    async def delete_user(self, user_id: str, current_user: User) -> bool:
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
    
    async def batch_disable_users(self, user_ids: List[str], current_user: User) -> BatchOperationResponse:
        """批量停用用户"""
        success_ids = []
        failed_ids = []
        
        for user_id in user_ids:
            try:
                # 检查权限
                target_user = await self.user_repo.get_by_id(user_id)
                if not target_user:
                    failed_ids.append(user_id)
                    continue
                
                # 使用领域服务检查权限
                can_disable, _ = self.domain_service.can_user_be_disabled(
                    target_user, current_user.id
                )
                if not can_disable:
                    failed_ids.append(user_id)
                    continue
                
                # 更新用户状态
                await self.user_repo.update(user_id, {"is_active": False})
                
                # 停用用户后注销其所有会话
                await self.logout_all_devices(user_id)
                
                success_ids.append(user_id)
                
            except Exception:
                failed_ids.append(user_id)
        
        return BatchOperationResponse(
            message=f"批量停用完成，成功 {len(success_ids)} 个，失败 {len(failed_ids)} 个",
            affected_count=len(success_ids),
            success_ids=success_ids,
            failed_ids=failed_ids
        )
    
    async def batch_delete_users(self, user_ids: List[str], current_user: User) -> BatchOperationResponse:
        """批量软删除用户"""
        success_ids = []
        failed_ids = []
        
        for user_id in user_ids:
            try:
                # 检查用户是否可以被删除
                target_user = await self.user_repo.get_by_id(user_id)
                if not target_user:
                    failed_ids.append(user_id)
                    continue
                
                can_delete, _ = self.domain_service.can_user_be_deleted(target_user, current_user.id)
                if not can_delete:
                    failed_ids.append(user_id)
                    continue
                
                # 执行软删除
                delete_data = self.domain_service.prepare_user_for_deletion(target_user, current_user.id)
                await self.user_repo.update(user_id, delete_data)
                success_ids.append(user_id)
                
            except Exception:
                failed_ids.append(user_id)
        
        return BatchOperationResponse(
            message=f"批量删除完成，成功 {len(success_ids)} 个，失败 {len(failed_ids)} 个",
            affected_count=len(success_ids),
            success_ids=success_ids,
            failed_ids=failed_ids
        )
    
    async def restore_user(self, user_id: str, current_user: User) -> bool:
        """从回收站恢复用户"""
        # 获取已删除的用户（不使用await，因为这是同步方法）
        target_user = self.user_repo.db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 检查用户是否已被删除
        if not target_user.deleted_at:
            raise HTTPException(status_code=400, detail="用户未被删除，无需恢复")
        
        # 恢复用户（清除删除标记）
        restore_data = {
            "deleted_at": None,
            "deleted_by": None,
            "is_active": True  # 恢复时默认激活用户
        }
        await self.user_repo.update(user_id, restore_data)
        
        return True
    
    async def permanently_delete_user(self, user_id: str, current_user: User) -> bool:
        """彻底删除用户（不可恢复）"""
        # 获取已删除的用户（不使用await，因为这是同步方法）
        target_user = self.user_repo.db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 检查用户是否已被软删除
        if not target_user.deleted_at:
            raise HTTPException(status_code=400, detail="只能彻底删除回收站中的用户")
        
        # 执行硬删除
        success = await self.user_repo.hard_delete(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="删除失败")
        
        # 清除用户相关缓存
        cache_service = await get_api_cache_service()
        await cache_service.invalidate_user_cache(user_id)
        
        return True
    
    async def batch_restore_users(self, user_ids: List[str], current_user: User) -> BatchOperationResponse:
        """批量恢复用户"""
        success_ids = []
        failed_ids = []
        
        for user_id in user_ids:
            try:
                await self.restore_user(user_id, current_user)
                success_ids.append(user_id)
            except Exception:
                failed_ids.append(user_id)
        
        return BatchOperationResponse(
            message=f"批量恢复完成，成功 {len(success_ids)} 个，失败 {len(failed_ids)} 个",
            affected_count=len(success_ids),
            success_ids=success_ids,
            failed_ids=failed_ids
        )
    
    async def batch_permanently_delete_users(self, user_ids: List[str], current_user: User) -> BatchOperationResponse:
        """批量彻底删除用户"""
        success_ids = []
        failed_ids = []
        
        for user_id in user_ids:
            try:
                await self.permanently_delete_user(user_id, current_user)
                success_ids.append(user_id)
            except Exception:
                failed_ids.append(user_id)
        
        return BatchOperationResponse(
            message=f"批量彻底删除完成，成功 {len(success_ids)} 个，失败 {len(failed_ids)} 个",
            affected_count=len(success_ids),
            success_ids=success_ids,
            failed_ids=failed_ids
        )
    
    async def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
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
    
    async def revoke_user_session(self, session_id: str, current_user: User) -> bool:
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
        user_id: str, 
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

    async def _add_user_to_public_organization(self, user_id: str, org_id: str, tenant_id: str) -> bool:
        """将用户添加到公共组织"""
        try:
            # 检查是否已存在关联
            existing_relation = self.user_repo.db.query(UserOrganization).filter(
                UserOrganization.user_id == user_id,
                UserOrganization.organization_id == org_id
            ).first()
            
            if existing_relation:
                return True  # 已存在关联，无需重复创建
            
            # 创建用户-组织关联
            user_org_relation = UserOrganization(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                user_id=user_id,
                organization_id=org_id,
                role="member",  # 普通成员
                is_admin=False,
                is_active=True
            )
            
            self.user_repo.db.add(user_org_relation)
            self.user_repo.db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"将用户 {user_id} 添加到公共组织失败: {e}")
            self.user_repo.db.rollback()
            return False

    async def _create_email_verification(self, user_id: str, email: str) -> None:
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
    
    async def _create_user_profile(self, user_id: str, full_name: str) -> None:
        """创建用户资料"""
        try:
            from app.models.user_models import UserProfile
            from app.infrastructure.persistence.database import get_async_session
            from uuid import uuid4
            
            # 创建UserProfile数据
            profile_data = {
                "id": str(uuid4()),
                "user_id": user_id,
                "full_name": full_name,
                "nickname": full_name,  # 默认使用full_name作为nickname
            }
            
            # 使用异步数据库会话创建UserProfile
            async with get_async_session() as session:
                profile = UserProfile(**profile_data)
                session.add(profile)
                await session.commit()
            
        except Exception as e:
            logger.error(f"创建用户资料失败: {e}")
            # 不抛出异常，因为用户已经创建成功，只是资料创建失败
    
    async def update_user_activity(self, user_id: str, activity_time: datetime = None) -> bool:
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

    async def batch_import_users(self, excel_content: bytes, operator: User) -> UserBatchImportResponse:
        """批量导入用户
        
        Args:
            excel_content: Excel文件内容
            operator: 操作者
            
        Returns:
            UserBatchImportResponse: 导入结果
        """
        import pandas as pd
        import io
        import logging
        from app.schemas.user_schemas import UserBatchImportResult
        
        logger = logging.getLogger(__name__)
        logger.info(f"开始批量导入用户，操作者: {operator.username}")
        
        if not excel_content:
            raise HTTPException(status_code=400, detail="Excel文件内容为空")
        
        try:
            # 读取Excel文件
            df = pd.read_excel(io.BytesIO(excel_content), engine='openpyxl')
            
            # 跳过前两行（标题和说明），从第3行开始读取数据
            if len(df) > 2:
                df = df.iloc[2:].reset_index(drop=True)
            
            # 定义字段映射
            column_mapping = {
                '用户名*': 'username',
                '电子邮箱*': 'email', 
                '密码*': 'password',
                '真实姓名*': 'full_name',
                '手机号码': 'phone',
                '租户ID': 'tenant_id',
                '组织ID': 'organization_id',
                '团队ID（部门）': 'team_id',
                '角色': 'roles',
                '是否激活': 'is_active',
                '邮箱已验证': 'is_verified',
                '个人简介': 'bio',
                '偏好语言': 'preferred_language',
                '性别': 'gender',
                '国家': 'country',
                '城市': 'city'
            }
            
            # 重命名列
            df = df.rename(columns=column_mapping)
            
            # 删除所有为空的行
            df = df.dropna(how='all')
            
            results = []
            success_count = 0
            error_count = 0
            warning_count = 0
            
            for index, row in df.iterrows():
                row_number = index + 4  # 考虑跳过的行数
                result = UserBatchImportResult(
                    row_number=row_number,
                    username=str(row.get('username', '')),
                    email=str(row.get('email', '')),
                    status='success',
                    message='',
                    user_id=None
                )
                
                try:
                    # 检查必填字段
                    required_fields = ['username', 'email', 'password', 'full_name']
                    missing_fields = []
                    for field in required_fields:
                        if pd.isna(row.get(field)) or str(row.get(field)).strip() == '':
                            missing_fields.append(field)
                    
                    if missing_fields:
                        result.status = 'error'
                        result.message = f"缺少必填字段: {', '.join(missing_fields)}"
                        error_count += 1
                        results.append(result)
                        continue
                    
                    # 处理布尔值字段
                    is_active = True
                    if not pd.isna(row.get('is_active')):
                        is_active_str = str(row.get('is_active')).lower()
                        is_active = is_active_str in ['true', '1', 'yes', '是']
                    
                    is_verified = False
                    if not pd.isna(row.get('is_verified')):
                        is_verified_str = str(row.get('is_verified')).lower()
                        is_verified = is_verified_str in ['true', '1', 'yes', '是']
                    
                    # 处理角色字段
                    roles = None
                    if not pd.isna(row.get('roles')):
                        roles_str = str(row.get('roles')).strip()
                        if roles_str:
                            roles = [role.strip() for role in roles_str.split(',')]
                    
                    # 创建用户数据
                    user_create_data = {
                        "username": str(row.get('username')).strip(),
                        "email": str(row.get('email')).strip(), 
                        "password": str(row.get('password')).strip(),
                        "full_name": str(row.get('full_name')).strip()
                    }
                    
                    # 检查用户名和邮箱是否已存在
                    existing_user = await self.user_repo.get_by_email(user_create_data["email"])
                    if existing_user:
                        result.status = 'error'
                        result.message = f"邮箱 {user_create_data['email']} 已被使用"
                        error_count += 1
                        results.append(result)
                        continue
                        
                    existing_user = await self.user_repo.get_by_username(user_create_data["username"])
                    if existing_user:
                        result.status = 'error'
                        result.message = f"用户名 {user_create_data['username']} 已被使用"
                        error_count += 1
                        results.append(result)
                        continue
                    
                    # 验证密码复杂度
                    is_valid, error_msg = self.domain_service.validate_user_registration(
                        user_create_data["email"], user_create_data["username"], user_create_data["password"]
                    )
                    if not is_valid:
                        result.status = 'error'
                        result.message = error_msg
                        error_count += 1
                        results.append(result)
                        continue
                    
                    # 创建用户
                    new_user = await self.user_repo.create(user_create_data)
                    
                    # 更新可选字段
                    update_data = {}
                    optional_fields = {
                        'phone': 'phone',
                        'bio': 'bio', 
                        'preferred_language': 'preferred_language',
                        'gender': 'gender',
                        'country': 'country',
                        'city': 'city'
                    }
                    
                    for excel_field, db_field in optional_fields.items():
                        if not pd.isna(row.get(excel_field)):
                            value = str(row.get(excel_field)).strip()
                            if value:
                                update_data[db_field] = value
                    
                    # 更新状态字段
                    update_data['is_active'] = is_active
                    update_data['is_verified'] = is_verified
                    
                    # 处理角色
                    if roles:
                        update_data['roles'] = roles
                    
                    if update_data:
                        await self.user_repo.update(new_user.id, update_data)
                    
                    result.status = 'success'
                    result.message = '用户创建成功'
                    result.user_id = new_user.id
                    success_count += 1
                    
                    # 检查是否有租户、组织、团队信息的警告
                    warnings = []
                    if not pd.isna(row.get('tenant_id')) and str(row.get('tenant_id')).strip():
                        warnings.append('租户ID已记录但需要手动关联')
                    if not pd.isna(row.get('organization_id')) and str(row.get('organization_id')).strip():
                        warnings.append('组织ID已记录但需要手动关联')
                    if not pd.isna(row.get('team_id')) and str(row.get('team_id')).strip():
                        warnings.append('团队ID已记录但需要手动关联')
                    
                    if warnings:
                        result.status = 'warning'
                        result.message += f" (警告: {'; '.join(warnings)})"
                        warning_count += 1
                        success_count -= 1  # 从成功计数中减去，加入警告计数
                    
                except Exception as e:
                    result.status = 'error'
                    result.message = f"创建失败: {str(e)}"
                    error_count += 1
                
                results.append(result)
            
            # 生成摘要
            total_count = len(results)
            summary = f"导入完成。总计 {total_count} 条记录，成功 {success_count} 条，警告 {warning_count} 条，失败 {error_count} 条。"
            
            return UserBatchImportResponse(
                total_count=total_count,
                success_count=success_count,
                error_count=error_count,
                warning_count=warning_count,
                results=results,
                summary=summary
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Excel文件处理失败: {str(e)}"
            )
    
    async def enable_user(self, user_id: str, current_user: User) -> bool:
        """启用用户"""
        # 1. 获取目标用户
        target_user = await self.user_repo.get_by_id(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 2. 权限检查
        if not self.domain_service.can_user_access_user_data(current_user, user_id):
            raise HTTPException(status_code=403, detail="无权限启用此用户")
        
        # 3. 检查用户是否已经启用
        if target_user.is_active:
            raise HTTPException(status_code=400, detail="用户已处于启用状态")
        
        # 4. 检查用户是否已删除
        if target_user.deleted_at:
            raise HTTPException(status_code=400, detail="已删除的用户无法启用")
        
        # 5. 启用用户
        await self.user_repo.update(user_id, {"is_active": True})
        
        # 6. 清除缓存
        cache_service = await get_api_cache_service()
        await cache_service.invalidate_user_cache(user_id)
        
        return True
    
    async def disable_user(self, user_id: str, current_user: User) -> bool:
        """停用用户"""
        # 1. 获取目标用户
        target_user = await self.user_repo.get_by_id(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 2. 领域验证
        can_disable, error_msg = self.domain_service.can_user_be_disabled(
            target_user, current_user.id
        )
        if not can_disable:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 3. 停用用户
        await self.user_repo.update(user_id, {"is_active": False})
        
        # 4. 清除缓存和注销所有会话
        cache_service = await get_api_cache_service()
        await cache_service.invalidate_user_cache(user_id)
        await self.logout_all_devices(user_id)
        
        return True
    
    async def get_user_statistics(self, current_user: User, tenant_id: Optional[str] = None,
                                organization_id: Optional[str] = None) -> Dict[str, Any]:
        """获取用户统计信息
        
        Args:
            current_user: 当前用户
            tenant_id: 租户ID（超级管理员可指定）
            organization_id: 组织ID（可选）
            
        Returns:
            用户统计数据
        """
        # 权限检查和租户ID确定
        effective_tenant_id = self._determine_effective_tenant_id(current_user, tenant_id)
        
        # 通过仓储获取统计数据
        stats = self.user_repo.get_user_statistics(
            tenant_id=effective_tenant_id,
            organization_id=organization_id
        )
        
        return stats
    
    def _determine_effective_tenant_id(self, current_user: User, requested_tenant_id: Optional[str]) -> str:
        """确定有效的租户ID，处理权限检查"""
        if current_user.is_superuser:
            # 超级管理员：可以查看任何租户的统计数据
            if requested_tenant_id:
                return requested_tenant_id
            else:
                # 如果没有指定租户ID，使用当前用户的租户ID
                return current_user.current_tenant_id
        else:
            # 非超级管理员：只能查看自己租户的统计，忽略请求中的租户ID
            if requested_tenant_id and requested_tenant_id != current_user.current_tenant_id:
                # 如果请求的租户ID与当前用户不匹配，记录警告并使用用户自己的租户ID
                logger.warning(f"用户 {current_user.username} 尝试访问其他租户 {requested_tenant_id} 的数据")
            return current_user.current_tenant_id