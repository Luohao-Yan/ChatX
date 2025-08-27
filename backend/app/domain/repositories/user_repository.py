from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from app.models.user_models import User, UserSession, UserVerification


class IUserRepository(ABC):
    """用户仓储接口 - 定义用户数据访问的抽象方法"""
    
    @abstractmethod
    async def create(self, user_data: dict) -> User:
        """创建用户"""
        pass
    
    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]:
        """根据ID获取用户"""
        pass
    
    @abstractmethod
    async def get_by_email(self, email: str, tenant_id: str = None) -> Optional[User]:
        """根据邮箱获取用户"""
        pass
    
    @abstractmethod
    async def get_by_username(self, username: str, tenant_id: str = None) -> Optional[User]:
        """根据用户名获取用户"""
        pass
    
    @abstractmethod
    async def get_by_phone(self, phone: str, tenant_id: str = None) -> Optional[User]:
        """根据手机号获取用户"""
        pass
    
    @abstractmethod
    async def update(self, user_id: str, update_data: dict) -> Optional[User]:
        """更新用户信息"""
        pass
    
    @abstractmethod
    async def soft_delete(self, user_id: str, deleted_by: str) -> bool:
        """软删除用户"""
        pass
    
    @abstractmethod
    async def get_list(self, tenant_id: str = None, skip: int = 0, limit: int = 100, 
                      include_deleted: bool = False, is_superuser: bool = False,
                      status: Optional[str] = None, organization_id: Optional[str] = None,
                      search: Optional[str] = None) -> List[User]:
        """获取用户列表"""
        pass
    
    @abstractmethod
    async def get_deleted_list(self, tenant_id: str = None, skip: int = 0, limit: int = 100,
                              is_superuser: bool = False) -> List[User]:
        """获取已删除用户列表（回收站）"""
        pass
    
    @abstractmethod
    async def exists_by_email(self, email: str, tenant_id: str = None, exclude_id: str = None) -> bool:
        """检查邮箱是否已存在"""
        pass
    
    @abstractmethod
    async def exists_by_username(self, username: str, tenant_id: str = None, exclude_id: str = None) -> bool:
        """检查用户名是否已存在"""
        pass
    
    @abstractmethod
    async def hard_delete(self, user_id: str) -> bool:
        """硬删除用户"""
        pass
    
    @abstractmethod
    async def get_by_id_including_deleted(self, user_id: str) -> Optional[User]:
        """根据ID获取用户，包括已删除的用户"""
        pass
    
    @abstractmethod
    async def get_all_users_including_deleted(self, tenant_id: str = None) -> List[User]:
        """获取所有用户，包括已删除的用户"""
        pass


class IUserSessionRepository(ABC):
    """用户会话仓储接口"""
    
    @abstractmethod
    async def create_session(self, session_data: dict) -> UserSession:
        """创建用户会话"""
        pass
    
    @abstractmethod
    async def get_by_refresh_token(self, refresh_token: str) -> Optional[UserSession]:
        """根据刷新令牌获取会话"""
        pass
    
    @abstractmethod
    async def update_session(self, session_id: str, update_data: dict) -> Optional[UserSession]:
        """更新会话信息"""
        pass
    
    @abstractmethod
    async def deactivate_session(self, session_id: str) -> bool:
        """停用会话"""
        pass
    
    @abstractmethod
    async def deactivate_all_user_sessions(self, user_id: str) -> bool:
        """停用用户所有会话"""
        pass
    
    @abstractmethod
    async def get_user_active_sessions(self, user_id: str) -> List[UserSession]:
        """获取用户活跃会话列表"""
        pass


class IUserVerificationRepository(ABC):
    """用户验证仓储接口"""
    
    @abstractmethod
    async def create_verification(self, verification_data: dict) -> UserVerification:
        """创建验证记录"""
        pass
    
    @abstractmethod
    async def get_valid_verification(self, user_id: str, verification_type: str, 
                                   verification_code: str) -> Optional[UserVerification]:
        """获取有效的验证记录"""
        pass
    
    @abstractmethod
    async def mark_as_used(self, verification_id: str) -> bool:
        """标记验证码为已使用"""
        pass
    
    @abstractmethod
    async def cleanup_expired(self) -> int:
        """清理过期的验证记录"""
        pass
    
    @abstractmethod
    async def get_user_statistics(self, tenant_id: Optional[str] = None,
                                organization_id: Optional[str] = None) -> Dict[str, Any]:
        """获取用户统计信息"""
        pass