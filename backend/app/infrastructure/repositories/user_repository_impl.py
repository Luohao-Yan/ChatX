from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timezone

from app.domain.repositories.user_repository import (
    IUserRepository, IUserSessionRepository, IUserVerificationRepository
)
from app.models.user_models import User, UserSession, UserVerification


class UserRepository(IUserRepository):
    """用户仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, user_data: dict) -> User:
        """创建用户"""
        user = User(**user_data)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        """根据ID获取用户"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    async def get_by_email(self, email: str, tenant_id: int = None) -> Optional[User]:
        """根据邮箱获取用户"""
        query = self.db.query(User).filter(User.email == email)
        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)
        return query.first()
    
    async def get_by_username(self, username: str, tenant_id: int = None) -> Optional[User]:
        """根据用户名获取用户"""
        query = self.db.query(User).filter(User.username == username)
        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)
        return query.first()
    
    async def update(self, user_id: int, update_data: dict) -> Optional[User]:
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
    
    async def soft_delete(self, user_id: int, deleted_by: int) -> bool:
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
    
    async def get_list(self, tenant_id: int, skip: int = 0, limit: int = 100, 
                      include_deleted: bool = False) -> List[User]:
        """获取用户列表"""
        query = self.db.query(User).filter(User.tenant_id == tenant_id)
        
        if not include_deleted:
            query = query.filter(User.is_deleted == False)
        
        return query.offset(skip).limit(limit).all()
    
    async def exists_by_email(self, email: str, tenant_id: int, exclude_id: int = None) -> bool:
        """检查邮箱是否已存在"""
        query = self.db.query(User).filter(
            User.email == email,
            User.tenant_id == tenant_id
        )
        
        if exclude_id:
            query = query.filter(User.id != exclude_id)
        
        return query.first() is not None
    
    async def exists_by_username(self, username: str, tenant_id: int, exclude_id: int = None) -> bool:
        """检查用户名是否已存在"""
        query = self.db.query(User).filter(
            User.username == username,
            User.tenant_id == tenant_id
        )
        
        if exclude_id:
            query = query.filter(User.id != exclude_id)
        
        return query.first() is not None


class UserSessionRepository(IUserSessionRepository):
    """用户会话仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_session(self, session_data: dict) -> UserSession:
        """创建用户会话"""
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
    
    async def update_session(self, session_id: int, update_data: dict) -> Optional[UserSession]:
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
    
    async def deactivate_session(self, session_id: int) -> bool:
        """停用会话"""
        session = self.db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session:
            return False
        
        session.is_active = False
        self.db.commit()
        return True
    
    async def deactivate_all_user_sessions(self, user_id: int) -> bool:
        """停用用户所有会话"""
        self.db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        ).update({"is_active": False})
        self.db.commit()
        return True
    
    async def get_user_active_sessions(self, user_id: int) -> List[UserSession]:
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
    
    async def get_valid_verification(self, user_id: int, verification_type: str, 
                                   verification_code: str) -> Optional[UserVerification]:
        """获取有效的验证记录"""
        return self.db.query(UserVerification).filter(
            UserVerification.user_id == user_id,
            UserVerification.verification_type == verification_type,
            UserVerification.verification_code == verification_code,
            UserVerification.is_used == False,
            UserVerification.expires_at > datetime.now(timezone.utc)
        ).first()
    
    async def mark_as_used(self, verification_id: int) -> bool:
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