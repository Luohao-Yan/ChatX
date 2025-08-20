from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from app.models.rbac_models import Role, Permission, UserPermission


class IRoleRepository(ABC):
    """角色仓储接口"""
    
    @abstractmethod
    async def create(self, role_data: dict) -> Role:
        """创建角色"""
        pass
    
    @abstractmethod
    async def get_by_id(self, role_id: int) -> Optional[Role]:
        """根据ID获取角色"""
        pass
    
    @abstractmethod
    async def get_by_name(self, name: str, tenant_id: str) -> Optional[Role]:
        """根据名称获取角色"""
        pass
    
    @abstractmethod
    async def get_tenant_roles(self, tenant_id: str, include_deleted: bool = False) -> List[Role]:
        """获取租户角色列表"""
        pass
    
    @abstractmethod
    async def update(self, role_id: int, update_data: dict) -> Optional[Role]:
        """更新角色"""
        pass
    
    @abstractmethod
    async def soft_delete(self, role_id: int, deleted_by: int) -> bool:
        """软删除角色"""
        pass
    
    @abstractmethod
    async def get_role_hierarchy(self, tenant_id: str) -> List[Dict]:
        """获取角色层级结构"""
        pass
    
    @abstractmethod
    async def get_user_roles(self, user_id: int) -> List[Role]:
        """获取用户角色列表"""
        pass
    
    @abstractmethod
    async def assign_user_role(self, user_id: int, role_id: int, assigned_by: int, expires_at=None) -> bool:
        """分配用户角色"""
        pass
    
    @abstractmethod
    async def revoke_user_role(self, user_id: int, role_id: int) -> bool:
        """撤销用户角色"""
        pass
    
    @abstractmethod
    async def get_role_users(self, role_id: int) -> List[Dict]:
        """获取角色用户列表"""
        pass
    
    @abstractmethod
    async def exists_by_name(self, name: str, tenant_id: str, exclude_id: int = None) -> bool:
        """检查角色名是否已存在"""
        pass


class IPermissionRepository(ABC):
    """权限仓储接口"""
    
    @abstractmethod
    async def create(self, permission_data: dict) -> Permission:
        """创建权限"""
        pass
    
    @abstractmethod
    async def get_by_id(self, permission_id: int) -> Optional[Permission]:
        """根据ID获取权限"""
        pass
    
    @abstractmethod
    async def get_by_name(self, name: str) -> Optional[Permission]:
        """根据名称获取权限"""
        pass
    
    @abstractmethod
    async def get_all_permissions(self, include_deleted: bool = False) -> List[Permission]:
        """获取所有权限"""
        pass
    
    @abstractmethod
    async def get_permissions_by_category(self, category: str) -> List[Permission]:
        """根据分类获取权限"""
        pass
    
    @abstractmethod
    async def update(self, permission_id: int, update_data: dict) -> Optional[Permission]:
        """更新权限"""
        pass
    
    @abstractmethod
    async def soft_delete(self, permission_id: int, deleted_by: int) -> bool:
        """软删除权限"""
        pass
    
    @abstractmethod
    async def get_permission_hierarchy(self) -> List[Dict]:
        """获取权限层级结构"""
        pass
    
    @abstractmethod
    async def get_role_permissions(self, role_id: int) -> List[Permission]:
        """获取角色权限列表"""
        pass
    
    @abstractmethod
    async def assign_role_permission(self, role_id: int, permission_id: int) -> bool:
        """分配角色权限"""
        pass
    
    @abstractmethod
    async def revoke_role_permission(self, role_id: int, permission_id: int) -> bool:
        """撤销角色权限"""
        pass
    
    @abstractmethod
    async def get_user_permissions(self, user_id: int) -> List[Permission]:
        """获取用户权限（通过角色继承 + 直接分配）"""
        pass
    
    @abstractmethod
    async def exists_by_name(self, name: str, exclude_id: int = None) -> bool:
        """检查权限名是否已存在"""
        pass


class IUserPermissionRepository(ABC):
    """用户直接权限仓储接口"""
    
    @abstractmethod
    async def grant_permission(self, permission_data: dict) -> UserPermission:
        """授予用户直接权限"""
        pass
    
    @abstractmethod
    async def revoke_permission(self, user_id: int, permission_id: int, resource_id: str = None) -> bool:
        """撤销用户直接权限"""
        pass
    
    @abstractmethod
    async def get_user_direct_permissions(self, user_id: int) -> List[UserPermission]:
        """获取用户直接权限列表"""
        pass
    
    @abstractmethod
    async def check_user_permission(self, user_id: int, permission_name: str, resource_id: str = None) -> bool:
        """检查用户是否有特定权限"""
        pass
    
    @abstractmethod
    async def get_user_all_permissions(self, user_id: int) -> Dict[str, Any]:
        """获取用户所有权限（角色 + 直接）"""
        pass
    
    @abstractmethod
    async def cleanup_expired_permissions(self) -> int:
        """清理过期的权限"""
        pass