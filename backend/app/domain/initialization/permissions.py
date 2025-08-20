"""
权限管理核心功能
包括权限检查、装饰器和权限工具函数
"""

from typing import List, Optional, Set, Dict, Any, Union
from functools import wraps
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.infrastructure.persistence.database import get_db
from app.models.user_models import User
from app.models.rbac_models import Role, Permission
from app.models.relationship_models import user_role_association, role_permission_association
from app.utils.deps import get_current_active_user
import logging
import uuid

logger = logging.getLogger(__name__)


class PermissionManager:
    """权限管理器"""

    def __init__(self, db: Session):
        self.db = db

    def has_permission(
        self, user: User, permission_name: str, resource_id: Optional[str] = None
    ) -> bool:
        """检查用户是否有指定权限"""
        # Note: resource_id 参数保留用于未来的资源级权限控制
        _ = resource_id  # 暂时未使用，避免警告
        
        try:
            # 1. 检查超级用户
            if user.is_superuser:
                return True

            # 2. 检查用户直接权限（从JSON字段）
            user_permissions = user.permission_list
            if permission_name in user_permissions:
                return True

            # 3. 检查角色权限
            # 通过关联表查询用户角色
            user_roles_query = (
                self.db.query(Role)
                .join(user_role_association, Role.id == user_role_association.c.role_id)
                .filter(
                    user_role_association.c.user_id == str(user.id),
                    Role.is_active == True
                )
                .all()
            )

            for role in user_roles_query:
                if self._role_has_permission(role, permission_name):
                    return True

            return False

        except Exception as e:
            logger.error(f"权限检查失败: {e}")
            return False

    def _role_has_permission(self, role: Role, permission_name: str) -> bool:
        """检查角色是否有指定权限"""
        permission = (
            self.db.query(Permission)
            .filter(Permission.name == permission_name, Permission.is_active == True)
            .first()
        )

        if not permission:
            return False

        # 通过关联表检查角色是否有此权限
        role_permission = self.db.execute(
            role_permission_association.select().where(
                role_permission_association.c.role_id == role.id,
                role_permission_association.c.permission_id == permission.id
            )
        ).fetchone()
        
        return role_permission is not None

    def get_user_permissions(self, user: User) -> Set[str]:
        """获取用户所有权限"""
        permissions = set()

        # 超级用户拥有所有权限
        if user.is_superuser:
            all_permissions = (
                self.db.query(Permission).filter(Permission.is_active == True).all()
            )
            return {p.name for p in all_permissions}

        # 1. 用户直接权限（从JSON字段）
        user_permissions = user.permission_list
        permissions.update(user_permissions)

        # 2. 角色权限
        user_roles = (
            self.db.query(Role)
            .join(user_role_association, Role.id == user_role_association.c.role_id)
            .filter(
                user_role_association.c.user_id == str(user.id),
                Role.is_active == True
            )
            .all()
        )

        for role in user_roles:
            # 获取角色的权限
            role_permissions = (
                self.db.query(Permission)
                .join(role_permission_association, Permission.id == role_permission_association.c.permission_id)
                .filter(
                    role_permission_association.c.role_id == role.id,
                    Permission.is_active == True
                )
                .all()
            )
            for permission in role_permissions:
                permissions.add(permission.name)

        return permissions

    def get_user_roles(self, user: User) -> List[Role]:
        """获取用户所有角色"""
        return (
            self.db.query(Role)
            .join(user_role_association, Role.id == user_role_association.c.role_id)
            .filter(
                user_role_association.c.user_id == str(user.id),
                Role.is_active == True
            )
            .all()
        )

    def assign_role_to_user(
        self,
        user_id: str,
        role_id: str,
        assigned_by: str,
        expires_at: Optional[str] = None,
    ) -> bool:
        """为用户分配角色"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            role = self.db.query(Role).filter(Role.id == role_id).first()

            if not user or not role:
                return False

            # 检查用户是否已有此角色
            existing = self.db.execute(
                user_role_association.select().where(
                    user_role_association.c.user_id == user_id,
                    user_role_association.c.role_id == role_id
                )
            ).fetchone()

            if not existing:
                # 通过关联表分配角色
                self.db.execute(
                    user_role_association.insert().values(
                        id=uuid.uuid4(),
                        tenant_id=user.current_tenant_id,
                        user_id=user_id,
                        role_id=role_id,
                        granted_by=assigned_by,
                        expires_at=expires_at
                    )
                )
                self.db.commit()
                logger.info(f"用户 {user_id} 获得角色 {role.name}")
                return True

            return True

        except Exception as e:
            logger.error(f"分配角色失败: {e}")
            self.db.rollback()
            return False

    def revoke_role_from_user(self, user_id: str, role_id: str) -> bool:
        """撤销用户角色"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            role = self.db.query(Role).filter(Role.id == role_id).first()

            if not user or not role:
                return False

            # 通过关联表删除角色
            result = self.db.execute(
                user_role_association.delete().where(
                    user_role_association.c.user_id == user_id,
                    user_role_association.c.role_id == role_id
                )
            )
            
            if result.rowcount > 0:
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
        user_id: str,
        permission_name: str,
        granted_by: str,
        resource_id: Optional[str] = None,
        expires_at: Optional[str] = None,
    ) -> bool:
        """直接授予用户权限"""
        # Note: granted_by, resource_id, expires_at 参数保留用于未来扩展
        _ = granted_by, resource_id, expires_at  # 暂时未使用，避免警告
        
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            permission = (
                self.db.query(Permission)
                .filter(Permission.name == permission_name)
                .first()
            )

            if not user or not permission:
                return False

            # 更新用户模型的权限JSON字段
            current_permissions = user.permission_list
            if permission_name not in current_permissions:
                current_permissions.append(permission_name)
                user.permissions = current_permissions

            self.db.commit()
            logger.info(f"为用户 {user_id} 授予权限 {permission_name}")
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
                    status_code=500, detail="权限检查失败：缺少必要参数"
                )

            # 权限检查
            permission_manager = PermissionManager(db)
            if not permission_manager.has_permission(
                current_user, permission_name, resource_id
            ):
                raise HTTPException(
                    status_code=403, detail=f"权限不足：需要 {permission_name} 权限"
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

            for _, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                elif isinstance(value, Session):
                    db = value

            if not current_user or not db:
                raise HTTPException(
                    status_code=500, detail="角色检查失败：缺少必要参数"
                )

            # 角色检查
            permission_manager = PermissionManager(db)
            user_roles = permission_manager.get_user_roles(current_user)
            user_role_names = {role.name for role in user_roles}

            # 检查是否有任一所需角色
            if not any(role_name in user_role_names for role_name in role_names):
                raise HTTPException(
                    status_code=403,
                    detail=f"角色权限不足：需要以下角色之一 {role_names}",
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator


# 权限依赖函数
def get_permission_manager(db: Session = Depends(get_db)) -> PermissionManager:
    """获取权限管理器"""
    return PermissionManager(db)


def check_permission(permission_name: str, resource_id: Optional[str] = None):
    """权限检查依赖函数"""

    def permission_checker(
        current_user: User = Depends(get_current_active_user),
        permission_manager: PermissionManager = Depends(get_permission_manager),
    ):
        if not permission_manager.has_permission(
            current_user, permission_name, resource_id
        ):
            raise HTTPException(
                status_code=403, detail=f"权限不足：需要 {permission_name} 权限"
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

    # 回收站管理
    RECYCLE_BIN_READ = "recycle_bin:read"
    RECYCLE_BIN_RESTORE = "recycle_bin:restore"
    RECYCLE_BIN_DELETE = "recycle_bin:delete"
    RECYCLE_BIN_MANAGE = "recycle_bin:manage"

    # 租户管理
    TENANT_CREATE = "tenant:create"
    TENANT_READ = "tenant:read"
    TENANT_UPDATE = "tenant:update"
    TENANT_DELETE = "tenant:delete"
    TENANT_MANAGE = "tenant:manage"


# 预定义角色
class DefaultRoles:
    """默认角色定义"""

    SUPER_ADMIN = "super_admin"
    TENANT_ADMIN = "tenant_admin"
    ORG_ADMIN = "org_admin"
    DEPT_MANAGER = "dept_manager"
    USER = "user"
    GUEST = "guest"
