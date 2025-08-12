from typing import Optional, List, Dict, Any
from fastapi import HTTPException

from app.domain.repositories.rbac_repository import (
    IRoleRepository, IPermissionRepository, IUserPermissionRepository
)
from app.domain.services.rbac_domain_service import (
    RoleDomainService, PermissionDomainService, UserPermissionDomainService
)
from app.schemas.rbac_schemas import (
    RoleCreate, RoleUpdate, PermissionCreate, PermissionUpdate,
    UserRoleAssign, RolePermissionAssign, UserPermissionAssign
)
from app.models.user_models import Role, Permission, UserPermission, User


class RoleApplicationService:
    """角色应用服务 - 协调角色管理的业务流程"""
    
    def __init__(self, role_repo: IRoleRepository):
        self.role_repo = role_repo
        self.domain_service = RoleDomainService()
    
    async def create_role(self, role_data: RoleCreate, current_user: User) -> Role:
        """创建角色"""
        # 1. 领域验证
        parent_role = None
        if role_data.parent_id:
            parent_role = await self.role_repo.get_by_id(role_data.parent_id)
            if not parent_role or parent_role.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=404, detail="父角色不存在")
        
        is_valid, error_msg = self.domain_service.validate_role_creation(
            role_data.name, role_data.display_name, current_user.tenant_id, parent_role
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 2. 检查角色名是否已存在
        if await self.role_repo.exists_by_name(role_data.name, current_user.tenant_id):
            raise HTTPException(status_code=400, detail="角色名已存在")
        
        # 3. 准备角色数据
        create_data = self.domain_service.prepare_role_data(
            name=role_data.name,
            display_name=role_data.display_name,
            description=role_data.description,
            tenant_id=current_user.tenant_id,
            role_type=role_data.role_type or "custom",
            level=(parent_role.level + 1) if parent_role else 0,
            parent_id=role_data.parent_id,
            max_users=role_data.max_users,
            created_by=current_user.id
        )
        
        # 4. 创建角色
        return await self.role_repo.create(create_data)
    
    async def get_role_by_id(self, role_id: int, current_user: User) -> Optional[Role]:
        """获取角色详情"""
        role = await self.role_repo.get_by_id(role_id)
        if not role:
            return None
        
        # 权限检查
        can_manage, error_msg = self.domain_service.can_user_manage_role(current_user, role)
        if not can_manage:
            raise HTTPException(status_code=403, detail=error_msg)
        
        return role
    
    async def get_tenant_roles(self, current_user: User, include_deleted: bool = False) -> List[Role]:
        """获取租户角色列表"""
        return await self.role_repo.get_tenant_roles(current_user.tenant_id, include_deleted)
    
    async def get_role_hierarchy(self, current_user: User) -> List[Dict]:
        """获取角色层级结构"""
        return await self.role_repo.get_role_hierarchy(current_user.tenant_id)
    
    async def update_role(self, role_id: int, role_update: RoleUpdate, current_user: User) -> Optional[Role]:
        """更新角色"""
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 更新数据
        update_data = role_update.model_dump(exclude_unset=True)
        
        # 如果更新父角色，需要验证
        if "parent_id" in update_data and update_data["parent_id"]:
            parent_role = await self.role_repo.get_by_id(update_data["parent_id"])
            if not parent_role or parent_role.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=404, detail="父角色不存在")
            update_data["level"] = parent_role.level + 1
        
        return await self.role_repo.update(role_id, update_data)
    
    async def delete_role(self, role_id: int, current_user: User) -> bool:
        """删除角色"""
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 检查是否可以删除
        role_users = await self.role_repo.get_role_users(role_id)
        can_delete, error_msg = self.domain_service.can_role_be_deleted(role, len(role_users))
        if not can_delete:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 执行软删除
        delete_data = self.domain_service.prepare_role_deletion_data(current_user.id)
        await self.role_repo.update(role_id, delete_data)
        
        return True
    
    async def assign_user_role(self, assign_data: UserRoleAssign, current_user: User) -> bool:
        """分配用户角色"""
        # 验证角色和用户
        role = await self.role_repo.get_by_id(assign_data.role_id)
        if not role or role.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 检查当前角色用户数量
        role_users = await self.role_repo.get_role_users(assign_data.role_id)
        can_assign, error_msg = self.domain_service.can_assign_role_to_user(
            role, None, len(role_users)  # 这里简化处理，实际需要获取用户对象
        )
        if not can_assign:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 分配角色
        return await self.role_repo.assign_user_role(
            assign_data.user_id, assign_data.role_id, 
            current_user.id, assign_data.expires_at
        )
    
    async def revoke_user_role(self, user_id: int, role_id: int, current_user: User) -> bool:
        """撤销用户角色"""
        role = await self.role_repo.get_by_id(role_id)
        if not role or role.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        return await self.role_repo.revoke_user_role(user_id, role_id)
    
    async def get_user_roles(self, user_id: int, current_user: User) -> List[Role]:
        """获取用户角色列表"""
        return await self.role_repo.get_user_roles(user_id)
    
    async def get_role_users(self, role_id: int, current_user: User) -> List[Dict]:
        """获取角色用户列表"""
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        return await self.role_repo.get_role_users(role_id)


class PermissionApplicationService:
    """权限应用服务 - 协调权限管理的业务流程"""
    
    def __init__(self, permission_repo: IPermissionRepository):
        self.permission_repo = permission_repo
        self.domain_service = PermissionDomainService()
    
    async def create_permission(self, permission_data: PermissionCreate, current_user: User) -> Permission:
        """创建权限"""
        # 1. 领域验证
        is_valid, error_msg = self.domain_service.validate_permission_creation(
            permission_data.name, permission_data.display_name,
            permission_data.resource_type, permission_data.action
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 2. 检查权限名是否已存在
        if await self.permission_repo.exists_by_name(permission_data.name):
            raise HTTPException(status_code=400, detail="权限名已存在")
        
        # 3. 准备权限数据
        create_data = self.domain_service.prepare_permission_data(
            name=permission_data.name,
            display_name=permission_data.display_name,
            description=permission_data.description,
            resource_type=permission_data.resource_type,
            action=permission_data.action,
            category=permission_data.category,
            group_name=permission_data.group_name,
            parent_id=permission_data.parent_id,
            require_owner=permission_data.require_owner or False,
            conditions=permission_data.conditions
        )
        
        # 4. 创建权限
        return await self.permission_repo.create(create_data)
    
    async def get_all_permissions(self, include_deleted: bool = False) -> List[Permission]:
        """获取所有权限"""
        return await self.permission_repo.get_all_permissions(include_deleted)
    
    async def get_permission_hierarchy(self) -> List[Dict]:
        """获取权限层级结构"""
        return await self.permission_repo.get_permission_hierarchy()
    
    async def get_permissions_by_category(self, category: str) -> List[Permission]:
        """根据分类获取权限"""
        return await self.permission_repo.get_permissions_by_category(category)
    
    async def update_permission(self, permission_id: int, permission_update: PermissionUpdate, 
                              current_user: User) -> Optional[Permission]:
        """更新权限"""
        permission = await self.permission_repo.get_by_id(permission_id)
        if not permission:
            raise HTTPException(status_code=404, detail="权限不存在")
        
        update_data = permission_update.model_dump(exclude_unset=True)
        return await self.permission_repo.update(permission_id, update_data)
    
    async def delete_permission(self, permission_id: int, current_user: User) -> bool:
        """删除权限"""
        permission = await self.permission_repo.get_by_id(permission_id)
        if not permission:
            raise HTTPException(status_code=404, detail="权限不存在")
        
        # 检查是否可以删除
        can_delete, error_msg = self.domain_service.can_permission_be_deleted(permission)
        if not can_delete:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 执行软删除
        delete_data = self.domain_service.prepare_permission_deletion_data(current_user.id)
        await self.permission_repo.update(permission_id, delete_data)
        
        return True
    
    async def assign_role_permission(self, assign_data: RolePermissionAssign, current_user: User) -> bool:
        """分配角色权限"""
        # 验证角色和权限
        role = await self._get_role_by_id(assign_data.role_id)  # 需要注入角色仓储
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        permission = await self.permission_repo.get_by_id(assign_data.permission_id)
        if not permission:
            raise HTTPException(status_code=404, detail="权限不存在")
        
        return await self.permission_repo.assign_role_permission(
            assign_data.role_id, assign_data.permission_id
        )
    
    async def revoke_role_permission(self, role_id: int, permission_id: int, current_user: User) -> bool:
        """撤销角色权限"""
        return await self.permission_repo.revoke_role_permission(role_id, permission_id)
    
    async def get_role_permissions(self, role_id: int, current_user: User) -> List[Permission]:
        """获取角色权限列表"""
        return await self.permission_repo.get_role_permissions(role_id)
    
    async def get_user_permissions(self, user_id: int, current_user: User) -> List[Permission]:
        """获取用户权限（通过角色继承）"""
        return await self.permission_repo.get_user_permissions(user_id)
    
    async def _get_role_by_id(self, role_id: int) -> Optional[Role]:
        """获取角色（需要注入角色仓储）"""
        # 这里简化处理，实际应该注入角色仓储
        return None


class UserPermissionApplicationService:
    """用户权限应用服务 - 协调用户直接权限管理"""
    
    def __init__(self, user_permission_repo: IUserPermissionRepository, 
                 permission_repo: IPermissionRepository):
        self.user_permission_repo = user_permission_repo
        self.permission_repo = permission_repo
        self.domain_service = UserPermissionDomainService()
    
    async def grant_user_permission(self, grant_data: UserPermissionAssign, current_user: User) -> UserPermission:
        """授予用户直接权限"""
        # 验证权限
        permission = await self.permission_repo.get_by_id(grant_data.permission_id)
        if not permission:
            raise HTTPException(status_code=404, detail="权限不存在")
        
        # 领域验证
        is_valid, error_msg = self.domain_service.validate_user_permission_grant(
            None, permission, current_user, grant_data.resource_id  # 这里简化处理
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 准备权限数据
        permission_data = self.domain_service.prepare_user_permission_data(
            user_id=grant_data.user_id,
            permission_id=grant_data.permission_id,
            granted=grant_data.granted,
            resource_id=grant_data.resource_id,
            conditions=grant_data.conditions,
            granted_by=current_user.id,
            reason=grant_data.reason,
            expires_at=grant_data.expires_at
        )
        
        return await self.user_permission_repo.grant_permission(permission_data)
    
    async def revoke_user_permission(self, user_id: int, permission_id: int, 
                                   resource_id: str = None, current_user: User = None) -> bool:
        """撤销用户直接权限"""
        return await self.user_permission_repo.revoke_permission(user_id, permission_id, resource_id)
    
    async def get_user_direct_permissions(self, user_id: int, current_user: User) -> List[UserPermission]:
        """获取用户直接权限列表"""
        return await self.user_permission_repo.get_user_direct_permissions(user_id)
    
    async def get_user_all_permissions(self, user_id: int, current_user: User) -> Dict[str, Any]:
        """获取用户所有权限（角色 + 直接）"""
        permissions_data = await self.user_permission_repo.get_user_all_permissions(user_id)
        
        # 使用领域服务合并权限
        merged_permissions = self.domain_service.merge_user_permissions(
            permissions_data["role_permissions"],
            permissions_data["direct_permissions"]
        )
        
        return {
            "merged_permissions": merged_permissions,
            "role_permissions": permissions_data["role_permissions"],
            "direct_permissions": permissions_data["direct_permissions"]
        }
    
    async def check_user_permission(self, user_id: int, permission_name: str, 
                                  resource_id: str = None, context: dict = None) -> bool:
        """检查用户是否有特定权限"""
        # 基础权限检查
        has_permission = await self.user_permission_repo.check_user_permission(
            user_id, permission_name, resource_id
        )
        
        if not has_permission:
            return False
        
        # 条件权限检查
        permission = await self.permission_repo.get_by_name(permission_name)
        if permission and context:
            return self.domain_service.check_permission_conditions(permission, context)
        
        return True
    
    async def cleanup_expired_permissions(self) -> int:
        """清理过期的权限"""
        return await self.user_permission_repo.cleanup_expired_permissions()