"""
权限管理核心功能
包括权限检查、装饰器和权限工具函数
"""

from typing import List, Optional, Set, Dict, Any, Union
from functools import wraps
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user_models import User, Role, Permission, UserPermission
from app.utils.deps import get_current_active_user
import logging

logger = logging.getLogger(__name__)

class PermissionManager:
    """权限管理器"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def has_permission(
        self, 
        user: User, 
        permission_name: str, 
        resource_id: Optional[str] = None
    ) -> bool:
        """检查用户是否有指定权限"""
        try:
            # 1. 检查超级用户
            if user.is_superuser:
                return True
            
            # 2. 检查用户直接权限
            direct_permission = self.db.query(UserPermission).join(Permission).filter(
                UserPermission.user_id == user.id,
                Permission.name == permission_name,
                UserPermission.is_active == True,
                UserPermission.granted == True
            )
            
            if resource_id:
                direct_permission = direct_permission.filter(
                    UserPermission.resource_id == resource_id
                )
            
            if direct_permission.first():
                return True
            
            # 3. 检查角色权限
            user_roles = self.db.query(Role).join(User.roles).filter(
                User.id == user.id,
                Role.is_active == True
            ).all()
            
            for role in user_roles:
                if self._role_has_permission(role, permission_name):
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"权限检查失败: {e}")
            return False
    
    def _role_has_permission(self, role: Role, permission_name: str) -> bool:
        """检查角色是否有指定权限"""
        permission = self.db.query(Permission).filter(
            Permission.name == permission_name,
            Permission.is_active == True
        ).first()
        
        if not permission:
            return False
        
        return permission in role.permissions
    
    def get_user_permissions(self, user: User) -> Set[str]:
        """获取用户所有权限"""
        permissions = set()
        
        # 超级用户拥有所有权限
        if user.is_superuser:
            all_permissions = self.db.query(Permission).filter(
                Permission.is_active == True
            ).all()
            return {p.name for p in all_permissions}
        
        # 角色权限
        user_roles = self.db.query(Role).join(User.roles).filter(
            User.id == user.id,
            Role.is_active == True
        ).all()
        
        for role in user_roles:
            for permission in role.permissions:
                if permission.is_active:
                    permissions.add(permission.name)
        
        # 直接权限
        direct_permissions = self.db.query(Permission).join(UserPermission).filter(
            UserPermission.user_id == user.id,
            UserPermission.is_active == True,
            UserPermission.granted == True,
            Permission.is_active == True
        ).all()
        
        for permission in direct_permissions:
            permissions.add(permission.name)
        
        return permissions
    
    def get_user_roles(self, user: User) -> List[Role]:
        """获取用户所有角色"""
        return self.db.query(Role).join(User.roles).filter(
            User.id == user.id,
            Role.is_active == True
        ).all()
    
    def assign_role_to_user(
        self, 
        user_id: int, 
        role_id: int, 
        assigned_by: int,
        expires_at: Optional[str] = None
    ) -> bool:
        """为用户分配角色"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            role = self.db.query(Role).filter(Role.id == role_id).first()
            
            if not user or not role:
                return False
            
            # 检查用户是否已有此角色
            if role not in user.roles:
                user.roles.append(role)
                self.db.commit()
                logger.info(f"用户 {user_id} 获得角色 {role.name}")
                return True
            
            return True
            
        except Exception as e:
            logger.error(f"分配角色失败: {e}")
            self.db.rollback()
            return False
    
    def revoke_role_from_user(self, user_id: int, role_id: int) -> bool:
        """撤销用户角色"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            role = self.db.query(Role).filter(Role.id == role_id).first()
            
            if not user or not role:
                return False
            
            if role in user.roles:
                user.roles.remove(role)
                self.db.commit()
                logger.info(f"用户 {user_id} 失去角色 {role.name}")
                return True
            
            return True
            
        except Exception as e:
            logger.error(f"撤销角色失败: {e}")
            self.db.rollback()
            return False
    
    def grant_permission_to_user(
        self,
        user_id: int,
        permission_name: str,
        granted_by: int,
        resource_id: Optional[str] = None,
        expires_at: Optional[str] = None
    ) -> bool:
        """直接授予用户权限"""
        try:
            permission = self.db.query(Permission).filter(
                Permission.name == permission_name
            ).first()
            
            if not permission:
                return False
            
            # 检查是否已存在
            existing = self.db.query(UserPermission).filter(
                UserPermission.user_id == user_id,
                UserPermission.permission_id == permission.id,
                UserPermission.resource_id == resource_id
            ).first()
            
            if existing:
                existing.granted = True
                existing.is_active = True
            else:
                user_permission = UserPermission(
                    user_id=user_id,
                    permission_id=permission.id,
                    resource_id=resource_id,
                    granted=True,
                    granted_by=granted_by,
                    expires_at=expires_at
                )
                self.db.add(user_permission)
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"授予权限失败: {e}")
            self.db.rollback()
            return False


# 权限装饰器
def require_permission(permission_name: str, resource_id_param: Optional[str] = None):
    """
    权限检查装饰器
    
    Args:
        permission_name: 权限名称
        resource_id_param: 资源ID参数名（从路径参数中获取）
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 获取依赖注入的参数
            current_user = None
            db = None
            resource_id = None
            
            # 从kwargs中找到用户和数据库会话
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                elif isinstance(value, Session):
                    db = value
                elif key == resource_id_param:
                    resource_id = str(value)
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=500,
                    detail="权限检查失败：缺少必要参数"
                )
            
            # 权限检查
            permission_manager = PermissionManager(db)
            if not permission_manager.has_permission(current_user, permission_name, resource_id):
                raise HTTPException(
                    status_code=403,
                    detail=f"权限不足：需要 {permission_name} 权限"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_roles(role_names: Union[str, List[str]]):
    """
    角色检查装饰器
    
    Args:
        role_names: 角色名称或角色名称列表
    """
    if isinstance(role_names, str):
        role_names = [role_names]
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 获取依赖注入的参数
            current_user = None
            db = None
            
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                elif isinstance(value, Session):
                    db = value
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=500,
                    detail="角色检查失败：缺少必要参数"
                )
            
            # 角色检查
            permission_manager = PermissionManager(db)
            user_roles = permission_manager.get_user_roles(current_user)
            user_role_names = {role.name for role in user_roles}
            
            # 检查是否有任一所需角色
            if not any(role_name in user_role_names for role_name in role_names):
                raise HTTPException(
                    status_code=403,
                    detail=f"角色权限不足：需要以下角色之一 {role_names}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# 权限依赖函数
def get_permission_manager(db: Session = Depends(get_db)) -> PermissionManager:
    """获取权限管理器"""
    return PermissionManager(db)


def check_permission(
    permission_name: str, 
    resource_id: Optional[str] = None
):
    """权限检查依赖函数"""
    def permission_checker(
        current_user: User = Depends(get_current_active_user),
        permission_manager: PermissionManager = Depends(get_permission_manager)
    ):
        if not permission_manager.has_permission(current_user, permission_name, resource_id):
            raise HTTPException(
                status_code=403,
                detail=f"权限不足：需要 {permission_name} 权限"
            )
        return current_user
    
    return permission_checker


# 常用权限常量
class Permissions:
    """权限常量定义"""
    
    # 用户管理
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_MANAGE = "user:manage"
    
    # 角色管理
    ROLE_CREATE = "role:create"
    ROLE_READ = "role:read"
    ROLE_UPDATE = "role:update"
    ROLE_DELETE = "role:delete"
    ROLE_ASSIGN = "role:assign"
    
    # 权限管理
    PERMISSION_CREATE = "permission:create"
    PERMISSION_READ = "permission:read"
    PERMISSION_UPDATE = "permission:update"
    PERMISSION_DELETE = "permission:delete"
    PERMISSION_ASSIGN = "permission:assign"
    
    # 文件管理
    FILE_CREATE = "file:create"
    FILE_READ = "file:read"
    FILE_UPDATE = "file:update"
    FILE_DELETE = "file:delete"
    FILE_SHARE = "file:share"
    FILE_UPLOAD = "file:upload"
    FILE_DOWNLOAD = "file:download"
    
    # 组织管理
    ORG_CREATE = "org:create"
    ORG_READ = "org:read"
    ORG_UPDATE = "org:update"
    ORG_DELETE = "org:delete"
    ORG_MANAGE = "org:manage"
    
    # 系统管理
    SYSTEM_CONFIG = "system:config"
    SYSTEM_MONITOR = "system:monitor"
    SYSTEM_BACKUP = "system:backup"


# 预定义角色
class DefaultRoles:
    """默认角色定义"""
    
    SUPER_ADMIN = "super_admin"
    TENANT_ADMIN = "tenant_admin"
    ORG_ADMIN = "org_admin"
    DEPT_MANAGER = "dept_manager"
    USER = "user"
    GUEST = "guest"