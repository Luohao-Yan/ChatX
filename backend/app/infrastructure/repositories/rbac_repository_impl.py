from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, timezone

from app.domain.repositories.rbac_repository import (
    IRoleRepository, IPermissionRepository, IUserPermissionRepository
)
from app.models.user_models import User
from app.models.rbac_models import Role, Permission, UserPermission
from app.models.relationship_models import (
    user_role_association as user_roles, 
    role_permission_association as role_permissions
)


class RoleRepository(IRoleRepository):
    """角色仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, role_data: dict) -> Role:
        """创建角色"""
        role = Role(**role_data)
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role
    
    def get_by_id(self, role_id: str) -> Optional[Role]:
        """根据ID获取角色"""
        return self.db.query(Role).filter(Role.id == role_id).first()
    
    def get_by_name(self, name: str, tenant_id: str) -> Optional[Role]:
        """根据名称获取角色"""
        return self.db.query(Role).filter(
            Role.name == name,
            Role.tenant_id == tenant_id
        ).first()
    
    def get_tenant_roles(self, tenant_id: str, include_deleted: bool = False) -> List[Role]:
        """获取租户角色列表"""
        query = self.db.query(Role).filter(Role.tenant_id == tenant_id)
        
        if not include_deleted:
            query = query.filter(Role.deleted_at.is_(None))
        
        return query.order_by(Role.level, Role.name).all()
    
    def update(self, role_id: str, update_data: dict) -> Optional[Role]:
        """更新角色"""
        role = self.get_by_id(role_id)
        if not role:
            return None
        
        for key, value in update_data.items():
            if hasattr(role, key):
                setattr(role, key, value)
        
        role.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(role)
        return role
    
    def soft_delete(self, role_id: str, deleted_by: str) -> bool:
        """软删除角色"""
        role = self.get_by_id(role_id)
        if not role:
            return False
        
        role.deleted_at = datetime.now(timezone.utc)
        role.deleted_by = deleted_by
        
        self.db.commit()
        return True
    
    def get_role_hierarchy(self, tenant_id: str) -> List[Dict]:
        """获取角色层级结构"""
        roles = self.get_tenant_roles(tenant_id)
        
        role_dict = {r.id: {
            "id": r.id,
            "name": r.name,
            "display_name": r.display_name,
            "description": r.description,
            "level": r.level,
            "parent_id": r.parent_id,
            "role_type": r.role_type,
            "is_active": r.is_active,
            "max_users": r.max_users,
            "children": [],
            "user_count": self.db.query(user_roles).filter(
                user_roles.c.role_id == r.id
            ).count()
        } for r in roles}
        
        root_roles = []
        
        for role in roles:
            if role.parent_id and role.parent_id in role_dict:
                role_dict[role.parent_id]["children"].append(role_dict[role.id])
            else:
                root_roles.append(role_dict[role.id])
        
        return root_roles
    
    def get_user_roles(self, user_id: str) -> List[Role]:
        """获取用户角色列表"""
        return self.db.query(Role).join(
            user_roles, Role.id == user_roles.c.role_id
        ).filter(
            user_roles.c.user_id == user_id,
            Role.is_active == True,
            Role.deleted_at.is_(None),
            or_(
                user_roles.c.expires_at.is_(None),
                user_roles.c.expires_at > datetime.now(timezone.utc)
            )
        ).all()
    
    def assign_user_role(self, user_id: str, role_id: str, assigned_by: str, expires_at=None) -> bool:
        """分配用户角色"""
        # 检查是否已经分配
        existing = self.db.query(user_roles).filter(
            user_roles.c.user_id == user_id,
            user_roles.c.role_id == role_id
        ).first()
        
        if existing:
            return False
        
        # 插入新的角色分配
        insert_stmt = user_roles.insert().values(
            user_id=user_id,
            role_id=role_id,
            assigned_by=assigned_by,
            assigned_at=datetime.now(timezone.utc),
            expires_at=expires_at
        )
        self.db.execute(insert_stmt)
        self.db.commit()
        return True
    
    def revoke_user_role(self, user_id: str, role_id: str) -> bool:
        """撤销用户角色"""
        delete_stmt = user_roles.delete().where(
            and_(
                user_roles.c.user_id == user_id,
                user_roles.c.role_id == role_id
            )
        )
        result = self.db.execute(delete_stmt)
        self.db.commit()
        return result.rowcount > 0
    
    def get_role_users(self, role_id: str) -> List[Dict]:
        """获取角色用户列表"""
        return self.db.query(
            User.id,
            User.username,
            User.email,
            User.full_name,
            user_roles.c.assigned_at,
            user_roles.c.expires_at
        ).join(
            user_roles, User.id == user_roles.c.user_id
        ).filter(
            user_roles.c.role_id == role_id,
            User.deleted_at.is_(None)
        ).all()
    
    def exists_by_name(self, name: str, tenant_id: str, exclude_id: str = None) -> bool:
        """检查角色名是否已存在"""
        query = self.db.query(Role).filter(
            Role.name == name,
            Role.tenant_id == tenant_id,
            Role.deleted_at.is_(None)
        )
        
        if exclude_id:
            query = query.filter(Role.id != exclude_id)
        
        return query.first() is not None


class PermissionRepository(IPermissionRepository):
    """权限仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, permission_data: dict) -> Permission:
        """创建权限"""
        permission = Permission(**permission_data)
        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)
        return permission
    
    async def get_by_id(self, permission_id: int) -> Optional[Permission]:
        """根据ID获取权限"""
        return self.db.query(Permission).filter(Permission.id == permission_id).first()
    
    async def get_by_name(self, name: str) -> Optional[Permission]:
        """根据名称获取权限"""
        return self.db.query(Permission).filter(Permission.name == name).first()
    
    async def get_all_permissions(self, include_deleted: bool = False) -> List[Permission]:
        """获取所有权限"""
        query = self.db.query(Permission)

        if not include_deleted:
            query = query.filter(Permission.deleted_at.is_(None))

        return query.order_by(Permission.category, Permission.resource_type, Permission.action).all()
    
    async def get_permissions_by_category(self, category: str) -> List[Permission]:
        """根据分类获取权限"""
        return self.db.query(Permission).filter(
            Permission.category == category,
            Permission.is_active == True,
            Permission.deleted_at.is_(None)
        ).order_by(Permission.resource_type, Permission.action).all()
    
    async def update(self, permission_id: int, update_data: dict) -> Optional[Permission]:
        """更新权限"""
        permission = await self.get_by_id(permission_id)
        if not permission:
            return None
        
        for key, value in update_data.items():
            if hasattr(permission, key):
                setattr(permission, key, value)
        
        permission.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(permission)
        return permission
    
    async def soft_delete(self, permission_id: int, deleted_by: int) -> bool:
        """软删除权限"""
        permission = await self.get_by_id(permission_id)
        if not permission:
            return False
        
        permission.is_deleted = True
        permission.deleted_at = datetime.now(timezone.utc)
        permission.deleted_by = deleted_by
        
        self.db.commit()
        return True
    
    async def get_permission_hierarchy(self) -> List[Dict]:
        """获取权限层级结构"""
        permissions = await self.get_all_permissions()
        
        # 按分类组织权限
        categories = {}
        for perm in permissions:
            category = perm.category or "其他"
            if category not in categories:
                categories[category] = {
                    "name": category,
                    "permissions": []
                }
            categories[category]["permissions"].append({
                "id": perm.id,
                "name": perm.name,
                "display_name": perm.display_name,
                "description": perm.description,
                "resource_type": perm.resource_type,
                "action": perm.action,
                "is_active": perm.is_active
            })
        
        return list(categories.values())
    
    async def get_role_permissions(self, role_id: str) -> List[Permission]:
        """获取角色权限列表"""
        return self.db.query(Permission).join(
            role_permissions, Permission.id == role_permissions.c.permission_id
        ).filter(
            role_permissions.c.role_id == role_id,
            Permission.is_active == True,
            Permission.deleted_at.is_(None)
        ).all()
    
    async def assign_role_permission(self, role_id: str, permission_id: str) -> bool:
        """分配角色权限"""
        # 检查是否已经分配
        existing = self.db.query(role_permissions).filter(
            role_permissions.c.role_id == role_id,
            role_permissions.c.permission_id == permission_id
        ).first()

        if existing:
            return False

        # 插入新的权限分配
        insert_stmt = role_permissions.insert().values(
            role_id=role_id,
            permission_id=permission_id,
            granted_at=datetime.now(timezone.utc)
        )
        self.db.execute(insert_stmt)
        self.db.commit()
        return True
    
    async def revoke_role_permission(self, role_id: str, permission_id: str) -> bool:
        """撤销角色权限"""
        delete_stmt = role_permissions.delete().where(
            and_(
                role_permissions.c.role_id == role_id,
                role_permissions.c.permission_id == permission_id
            )
        )
        result = self.db.execute(delete_stmt)
        self.db.commit()
        return result.rowcount > 0
    
    async def get_user_permissions(self, user_id: str) -> List[Permission]:
        """获取用户权限（通过角色继承）"""
        return self.db.query(Permission).join(
            role_permissions, Permission.id == role_permissions.c.permission_id
        ).join(
            user_roles, role_permissions.c.role_id == user_roles.c.role_id
        ).filter(
            user_roles.c.user_id == user_id,
            Permission.is_active == True,
            Permission.deleted_at.is_(None),
            or_(
                user_roles.c.expires_at.is_(None),
                user_roles.c.expires_at > datetime.now(timezone.utc)
            )
        ).distinct().all()
    
    async def exists_by_name(self, name: str, exclude_id: str = None) -> bool:
        """检查权限名是否已存在"""
        query = self.db.query(Permission).filter(
            Permission.name == name,
            Permission.deleted_at.is_(None)
        )

        if exclude_id:
            query = query.filter(Permission.id != exclude_id)

        return query.first() is not None


class UserPermissionRepository(IUserPermissionRepository):
    """用户直接权限仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def grant_permission(self, permission_data: dict) -> UserPermission:
        """授予用户直接权限"""
        user_permission = UserPermission(**permission_data)
        self.db.add(user_permission)
        self.db.commit()
        self.db.refresh(user_permission)
        return user_permission
    
    async def revoke_permission(self, user_id: int, permission_id: int, resource_id: str = None) -> bool:
        """撤销用户直接权限"""
        query = self.db.query(UserPermission).filter(
            UserPermission.user_id == user_id,
            UserPermission.permission_id == permission_id
        )
        
        if resource_id:
            query = query.filter(UserPermission.resource_id == resource_id)
        
        user_permission = query.first()
        if not user_permission:
            return False
        
        self.db.delete(user_permission)
        self.db.commit()
        return True
    
    async def get_user_direct_permissions(self, user_id: int) -> List[UserPermission]:
        """获取用户直接权限列表"""
        return self.db.query(UserPermission).filter(
            UserPermission.user_id == user_id,
            UserPermission.is_active == True,
            or_(
                UserPermission.expires_at.is_(None),
                UserPermission.expires_at > datetime.now(timezone.utc)
            )
        ).all()
    
    async def check_user_permission(self, user_id: int, permission_name: str, resource_id: str = None) -> bool:
        """检查用户是否有特定权限"""
        # 检查角色权限
        role_permission = self.db.query(Permission).join(
            role_permissions, Permission.id == role_permissions.c.permission_id
        ).join(
            user_roles, role_permissions.c.role_id == user_roles.c.role_id
        ).filter(
            user_roles.c.user_id == user_id,
            Permission.name == permission_name,
            Permission.is_active == True,
            or_(
                user_roles.c.expires_at.is_(None),
                user_roles.c.expires_at > datetime.now(timezone.utc)
            )
        ).first()
        
        if role_permission:
            return True
        
        # 检查直接权限
        permission = self.db.query(Permission).filter(
            Permission.name == permission_name
        ).first()
        
        if not permission:
            return False
        
        query = self.db.query(UserPermission).filter(
            UserPermission.user_id == user_id,
            UserPermission.permission_id == permission.id,
            UserPermission.is_active == True,
            UserPermission.granted == True,
            or_(
                UserPermission.expires_at.is_(None),
                UserPermission.expires_at > datetime.now(timezone.utc)
            )
        )
        
        if resource_id:
            query = query.filter(
                or_(
                    UserPermission.resource_id == resource_id,
                    UserPermission.resource_id.is_(None)  # 全局权限
                )
            )
        
        return query.first() is not None
    
    async def get_user_all_permissions(self, user_id: int) -> Dict[str, Any]:
        """获取用户所有权限（角色 + 直接）"""
        # 获取角色权限
        role_permissions_list = self.db.query(Permission).join(
            role_permissions, Permission.id == role_permissions.c.permission_id
        ).join(
            user_roles, role_permissions.c.role_id == user_roles.c.role_id
        ).filter(
            user_roles.c.user_id == user_id,
            Permission.is_active == True,
            Permission.is_deleted == False,
            or_(
                user_roles.c.expires_at.is_(None),
                user_roles.c.expires_at > datetime.now(timezone.utc)
            )
        ).distinct().all()
        
        # 获取直接权限
        direct_permissions = await self.get_user_direct_permissions(user_id)
        
        return {
            "role_permissions": role_permissions_list,
            "direct_permissions": [
                {
                    "permission": dp.permission,
                    "granted": dp.granted,
                    "resource_id": dp.resource_id,
                    "conditions": dp.conditions,
                    "expires_at": dp.expires_at
                } for dp in direct_permissions
            ]
        }
    
    async def cleanup_expired_permissions(self) -> int:
        """清理过期的权限"""
        expired_count = self.db.query(UserPermission).filter(
            UserPermission.expires_at < datetime.now(timezone.utc)
        ).count()
        
        self.db.query(UserPermission).filter(
            UserPermission.expires_at < datetime.now(timezone.utc)
        ).delete()
        
        self.db.commit()
        return expired_count