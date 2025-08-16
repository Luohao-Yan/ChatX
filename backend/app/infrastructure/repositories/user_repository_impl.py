from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timezone

from app.domain.repositories.user_repository import (
    IUserRepository, IUserSessionRepository, IUserVerificationRepository
)
from app.models.user_models import User, UserSession, UserVerification, UserProfile


class UserRepository(IUserRepository):
    """用户仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, user_data: dict) -> User:
        """创建用户"""
        import uuid
        
        # 如果没有提供ID，生成一个
        if 'id' not in user_data:
            user_data['id'] = str(uuid.uuid4())
        
        user = User(**user_data)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # 创建对应的用户信息记录
        profile_data = {
            'id': str(uuid.uuid4()),
            'user_id': user.id,
            'nickname': user_data.get('full_name', user.username),
            'full_name': user_data.get('full_name'),
        }
        
        profile = UserProfile(**profile_data)
        self.db.add(profile)
        self.db.commit()
        
        return user
    
    async def get_by_id(self, user_id: str) -> Optional[User]:
        """根据ID获取用户"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    async def get_user_with_profile(self, user_id: str) -> Optional[dict]:
        """获取用户完整信息（包括Profile）"""
        user = await self.get_by_id(user_id)
        if not user:
            return None
            
        profile = self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        
        # 合并用户信息
        user_data = {
            # 来自User表的核心信息
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "status": user.status,
            "is_superuser": user.is_superuser,
            "is_staff": user.is_staff,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "roles": user.roles or [],
            "permissions": user.permissions or [],
            "current_tenant_id": user.current_tenant_id,
            "tenant_ids": user.tenant_ids or [],
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "last_login": user.last_login,
        }
        
        # 添加来自UserProfile表的详细信息
        if profile:
            profile_data = {
                "nickname": profile.nickname,
                "full_name": profile.full_name,
                "phone": profile.phone,
                "avatar_url": profile.avatar_url,
                "bio": profile.bio,
                "date_of_birth": profile.date_of_birth,
                "gender": profile.gender,
                "country": profile.country,
                "city": profile.city,
                "address": profile.address,
                "preferred_language": profile.preferred_language,
                "timezone": profile.timezone,
                "theme": profile.theme,
                "notification_settings": profile.notification_settings,
                "privacy_settings": profile.privacy_settings,
                "urls": profile.urls,
                "settings": profile.settings,
            }
            user_data.update(profile_data)
        
        # 计算display_name
        user_data["display_name"] = (
            user_data.get("nickname") or 
            user_data.get("full_name") or 
            user.username
        )
        
        return user_data
    
    async def get_by_email(self, email: str, tenant_id: str = None) -> Optional[User]:
        """根据邮箱获取用户"""
        query = self.db.query(User).filter(User.email == email)
        if tenant_id:
            query = query.filter(User.current_tenant_id == tenant_id)
        return query.first()
    
    async def get_by_username(self, username: str, tenant_id: str = None) -> Optional[User]:
        """根据用户名获取用户"""
        query = self.db.query(User).filter(User.username == username)
        if tenant_id:
            query = query.filter(User.current_tenant_id == tenant_id)
        return query.first()
    
    async def update(self, user_id: str, update_data: dict) -> Optional[User]:
        """更新用户信息"""
        user = await self.get_by_id(user_id)
        if not user:
            return None
        
        for key, value in update_data.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        user.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(user)
        return user
    
    async def soft_delete(self, user_id: str, deleted_by: str) -> bool:
        """软删除用户"""
        user = await self.get_by_id(user_id)
        if not user:
            return False
        
        user.is_deleted = True
        user.deleted_at = datetime.now(timezone.utc)
        user.deleted_by = deleted_by
        user.is_active = False
        
        self.db.commit()
        return True
    
    async def get_list(self, tenant_id: str = None, skip: int = 0, limit: int = 100, 
                      include_deleted: bool = False, is_superuser: bool = False) -> List[User]:
        """获取用户列表
        
        Args:
            tenant_id: 租户ID，如果为None且is_superuser=True则查询所有租户
            skip: 跳过的记录数
            limit: 限制的记录数
            include_deleted: 是否包含已删除的用户
            is_superuser: 是否为超级管理员
        """
        query = self.db.query(User)
        
        # 超级管理员可以看到所有租户的用户，普通管理员只能看到自己租户的用户
        if not is_superuser and tenant_id:
            query = query.filter(User.current_tenant_id == tenant_id)
        
        if not include_deleted:
            query = query.filter(User.deleted_at.is_(None))
        
        return query.offset(skip).limit(limit).all()
    
    async def get_deleted_list(self, tenant_id: str = None, skip: int = 0, limit: int = 100,
                              is_superuser: bool = False) -> List[User]:
        """获取已删除用户列表（回收站）"""
        query = self.db.query(User)
        
        # 超级管理员可以看到所有租户的已删除用户，普通管理员只能看到自己租户的
        if not is_superuser and tenant_id:
            query = query.filter(User.current_tenant_id == tenant_id)
        
        # 只获取已删除的用户
        query = query.filter(User.deleted_at.isnot(None))
        
        # 按删除时间倒序排列
        query = query.order_by(User.deleted_at.desc())
        
        return query.offset(skip).limit(limit).all()
    
    async def exists_by_email(self, email: str, tenant_id: str = None, exclude_id: str = None) -> bool:
        """检查邮箱是否已存在"""
        query = self.db.query(User).filter(User.email == email)
        
        if tenant_id:
            query = query.filter(User.current_tenant_id == tenant_id)
        
        if exclude_id:
            query = query.filter(User.id != exclude_id)
        
        return query.first() is not None
    
    async def exists_by_username(self, username: str, tenant_id: str = None, exclude_id: str = None) -> bool:
        """检查用户名是否已存在"""
        query = self.db.query(User).filter(User.username == username)
        
        if tenant_id:
            query = query.filter(User.current_tenant_id == tenant_id)
        
        if exclude_id:
            query = query.filter(User.id != exclude_id)
        
        return query.first() is not None
    
    async def hard_delete(self, user_id: str) -> bool:
        """硬删除用户"""
        user = await self.get_by_id_including_deleted(user_id)
        if not user:
            return False
        
        # 删除用户相关的Profile记录
        self.db.query(UserProfile).filter(UserProfile.user_id == user_id).delete()
        
        # 删除用户记录
        self.db.delete(user)
        self.db.commit()
        return True
    
    async def get_by_id_including_deleted(self, user_id: str) -> Optional[User]:
        """根据ID获取用户，包括已删除的用户"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    async def get_all_users_including_deleted(self, tenant_id: str = None) -> List[User]:
        """获取所有用户，包括已删除的用户"""
        query = self.db.query(User)
        
        if tenant_id:
            query = query.filter(User.current_tenant_id == tenant_id)
        
        return query.all()


class UserSessionRepository(IUserSessionRepository):
    """用户会话仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_session(self, session_data: dict) -> UserSession:
        """创建用户会话"""
        import uuid
        
        # 如果没有提供ID，生成一个
        if 'id' not in session_data:
            session_data['id'] = str(uuid.uuid4())
            
        session = UserSession(**session_data)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session
    
    async def get_by_refresh_token(self, refresh_token: str) -> Optional[UserSession]:
        """根据刷新令牌获取会话"""
        return self.db.query(UserSession).filter(
            UserSession.refresh_token == refresh_token,
            UserSession.is_active == True
        ).first()
    
    async def update_session(self, session_id: str, update_data: dict) -> Optional[UserSession]:
        """更新会话信息"""
        session = self.db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session:
            return None
        
        for key, value in update_data.items():
            if hasattr(session, key):
                setattr(session, key, value)
        
        self.db.commit()
        self.db.refresh(session)
        return session
    
    async def deactivate_session(self, session_id: str) -> bool:
        """停用会话"""
        session = self.db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session:
            return False
        
        session.is_active = False
        self.db.commit()
        return True
    
    async def deactivate_all_user_sessions(self, user_id: str) -> bool:
        """停用用户所有会话"""
        self.db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        ).update({"is_active": False})
        self.db.commit()
        return True
    
    async def get_user_active_sessions(self, user_id: str) -> List[UserSession]:
        """获取用户活跃会话列表"""
        return self.db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        ).order_by(UserSession.last_used.desc()).all()


class UserVerificationRepository(IUserVerificationRepository):
    """用户验证仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_verification(self, verification_data: dict) -> UserVerification:
        """创建验证记录"""
        verification = UserVerification(**verification_data)
        self.db.add(verification)
        self.db.commit()
        self.db.refresh(verification)
        return verification
    
    async def get_valid_verification(self, user_id: str, verification_type: str, 
                                   verification_code: str) -> Optional[UserVerification]:
        """获取有效的验证记录"""
        return self.db.query(UserVerification).filter(
            UserVerification.user_id == user_id,
            UserVerification.verification_type == verification_type,
            UserVerification.verification_code == verification_code,
            UserVerification.is_used == False,
            UserVerification.expires_at > datetime.now(timezone.utc)
        ).first()
    
    async def mark_as_used(self, verification_id: str) -> bool:
        """标记验证码为已使用"""
        verification = self.db.query(UserVerification).filter(
            UserVerification.id == verification_id
        ).first()
        if not verification:
            return False
        
        verification.is_used = True
        self.db.commit()
        return True
    
    async def cleanup_expired(self) -> int:
        """清理过期的验证记录"""
        expired_count = self.db.query(UserVerification).filter(
            UserVerification.expires_at < datetime.now(timezone.utc)
        ).count()
        
        self.db.query(UserVerification).filter(
            UserVerification.expires_at < datetime.now(timezone.utc)
        ).delete()
        self.db.commit()
        
        return expired_count