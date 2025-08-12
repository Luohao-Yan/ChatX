from typing import Optional, Tuple
from app.core import security
from app.models.user_models import User, UserStatus
from datetime import datetime, timezone


class UserDomainService:
    """用户领域服务 - 包含用户相关的核心业务逻辑"""
    
    @staticmethod
    def validate_user_registration(email: str, username: str, password: str) -> Tuple[bool, Optional[str]]:
        """验证用户注册数据"""
        # 密码强度验证
        is_valid, message = security.validate_password_strength(password)
        if not is_valid:
            return False, message
        
        # 邮箱格式已在 Pydantic schema 中验证
        # 用户名长度和格式验证
        if len(username) < 3:
            return False, "用户名长度至少3位"
        
        if len(username) > 50:
            return False, "用户名长度不能超过50位"
        
        # 可以添加更多业务规则
        return True, None
    
    @staticmethod
    def can_user_be_deleted(user: User, operator_id: int) -> Tuple[bool, Optional[str]]:
        """检查用户是否可以被删除"""
        # 不能删除自己
        if user.id == operator_id:
            return False, "不能删除自己的账户"
        
        # 超级管理员不能被删除
        if user.is_superuser:
            return False, "不能删除超级管理员账户"
        
        # 已删除的用户不能再次删除
        if user.is_deleted:
            return False, "用户已被删除"
        
        return True, None
    
    @staticmethod
    def can_user_login(user: User) -> Tuple[bool, Optional[str]]:
        """检查用户是否可以登录"""
        if not user.is_active:
            return False, "账号已被禁用"
        
        if user.status == UserStatus.SUSPENDED:
            return False, "账号已被暂停"
        
        if user.status == UserStatus.DELETED:
            return False, "账号不存在"
        
        if not user.hashed_password:
            return False, "该账号不支持密码登录"
        
        return True, None
    
    @staticmethod
    def authenticate_user(user: User, password: str) -> bool:
        """验证用户密码"""
        if not user or not user.hashed_password:
            return False
        
        return security.verify_password(password, user.hashed_password)
    
    @staticmethod
    def prepare_user_for_deletion(user: User, deleted_by: int) -> dict:
        """准备用户删除数据"""
        return {
            "is_deleted": True,
            "deleted_at": datetime.now(timezone.utc),
            "deleted_by": deleted_by,
            "status": UserStatus.DELETED,
            "is_active": False
        }
    
    @staticmethod
    def hash_password(password: str) -> str:
        """密码加密"""
        return security.get_password_hash(password)
    
    @staticmethod
    def can_user_access_user_data(current_user: User, target_user_id: int) -> bool:
        """检查用户是否可以访问其他用户数据"""
        # 可以访问自己的数据
        if current_user.id == target_user_id:
            return True
        
        # 超级管理员可以访问所有数据
        if current_user.is_superuser:
            return True
        
        # 同租户内的用户管理权限检查
        # 这里可以根据角色权限进一步细化
        return False