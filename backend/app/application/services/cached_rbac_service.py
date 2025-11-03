"""
RBAC服务 - 带Redis缓存优化版本
包含角色、权限的缓存管理，提高查询性能
"""

import json
import uuid
from typing import Optional, List, Dict, Any
from datetime import timedelta
from fastapi import HTTPException

from app.infrastructure.persistence.database import get_db
from app.infrastructure.cache.redis_cache import redis_cache
from app.domain.repositories.rbac_repository import IRoleRepository, IPermissionRepository
from app.schemas.rbac_schemas import (
    RoleCreate, RoleUpdate, PermissionCreate, PermissionUpdate,
    UserRoleAssign, RolePermissionAssign
)
from app.models.user_models import User
from app.models.rbac_models import Role, Permission


class CachedRoleApplicationService:
    """带缓存的角色应用服务"""

    def __init__(self, role_repo: IRoleRepository, permission_repo: IPermissionRepository = None):
        self.role_repo = role_repo
        self.permission_repo = permission_repo
        self.cache_prefix = "rbac:role"
        self.cache_ttl = timedelta(hours=1)  # 缓存1小时
    
    def _get_cache_key(self, key_type: str, *args) -> str:
        """生成缓存键"""
        return f"{self.cache_prefix}:{key_type}:" + ":".join(str(arg) for arg in args)
    
    async def _clear_tenant_cache(self, tenant_id: str):
        """清除租户相关的缓存"""
        patterns = [
            f"{self.cache_prefix}:tenant_roles:{tenant_id}:*",
            f"{self.cache_prefix}:hierarchy:{tenant_id}",
            f"{self.cache_prefix}:role:*"
        ]
        for pattern in patterns:
            await redis_cache.delete_pattern(pattern)
    
    async def create_role(self, role_data: RoleCreate, current_user: User) -> Role:
        """创建角色"""
        # 生成唯一ID
        role_id = str(uuid.uuid4())[:8]  # 简化的8位ID
        
        # 验证租户权限
        if not current_user.tenant_id:
            raise HTTPException(status_code=400, detail="用户未关联租户")
        
        # 检查角色名是否已存在
        existing_role = await self.get_role_by_name(role_data.name, current_user.tenant_id)
        if existing_role:
            raise HTTPException(status_code=400, detail="角色名已存在")
        
        # 准备创建数据
        create_data = {
            "id": role_id,
            "tenant_id": current_user.tenant_id,
            "name": role_data.name,
            "display_name": role_data.display_name or role_data.name,
            "description": role_data.description,
            "role_type": role_data.role_type or "custom",
            "level": role_data.level or 0,
            "is_system": False,
            "is_default": False,
            "is_active": True
        }
        
        # 创建角色
        role = self.role_repo.create(create_data)
        
        # 清除相关缓存
        await self._clear_tenant_cache(current_user.tenant_id)
        
        return role
    
    async def get_role_by_id(self, role_id: str, current_user: User) -> Optional[Role]:
        """获取角色详情"""
        cache_key = self._get_cache_key("detail", role_id)
        
        # 尝试从缓存获取
        cached_data = await redis_cache.get(cache_key)
        if cached_data:
            return Role(**json.loads(cached_data))
        
        # 从数据库查询
        role = self.role_repo.get_by_id(role_id)
        if not role:
            return None
        
        # 权限检查
        if role.tenant_id != current_user.tenant_id and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="无权访问此角色")
        
        # 缓存结果
        role_dict = {
            "id": role.id,
            "tenant_id": role.tenant_id,
            "name": role.name,
            "display_name": role.display_name,
            "description": role.description,
            "role_type": role.role_type,
            "level": role.level,
            "is_system": role.is_system,
            "is_default": role.is_default,
            "is_active": role.is_active,
            "created_at": role.created_at.isoformat(),
            "updated_at": role.updated_at.isoformat() if role.updated_at else None
        }
        await redis_cache.set(cache_key, json.dumps(role_dict), self.cache_ttl)
        
        return role
    
    async def get_role_by_name(self, name: str, tenant_id: str) -> Optional[Role]:
        """根据名称获取角色"""
        cache_key = self._get_cache_key("name", tenant_id, name)
        
        # 尝试从缓存获取
        cached_data = await redis_cache.get(cache_key)
        if cached_data:
            role_data = json.loads(cached_data)
            return Role(**role_data) if role_data else None
        
        # 从数据库查询
        role = self.role_repo.get_by_name(name, tenant_id)
        
        # 缓存结果
        if role:
            role_dict = {
                "id": role.id,
                "tenant_id": role.tenant_id,
                "name": role.name,
                "display_name": role.display_name,
                "description": role.description,
                "role_type": role.role_type,
                "level": role.level,
                "is_system": role.is_system,
                "is_default": role.is_default,
                "is_active": role.is_active,
                "created_at": role.created_at.isoformat(),
                "updated_at": role.updated_at.isoformat() if role.updated_at else None
            }
            await redis_cache.set(cache_key, json.dumps(role_dict), self.cache_ttl)
        else:
            # 缓存空结果，避免重复查询
            await redis_cache.set(cache_key, json.dumps(None), timedelta(minutes=5))
        
        return role
    
    async def get_assignable_roles(self, current_user: User) -> List[Role]:
        """获取当前用户可以分配的角色列表"""
        if not current_user.tenant_id:
            raise HTTPException(status_code=400, detail="用户未关联租户")

        # 获取所有活跃的角色
        all_roles = await self.get_tenant_roles(current_user, include_deleted=False)

        # 如果是超级管理员，可以分配所有角色
        if current_user.is_superuser:
            return all_roles

        # 获取当前用户的最高角色级别
        user_max_level = 100  # 默认最低级别
        if hasattr(current_user, 'roles') and current_user.roles:
            for role in current_user.roles:
                if role.level < user_max_level:
                    user_max_level = role.level

        # 过滤出用户可以分配的角色（同级别或更低级别）
        assignable_roles = [
            role for role in all_roles
            if role.level >= user_max_level and role.is_active
        ]

        return assignable_roles

    async def get_tenant_roles(self, current_user: User, include_deleted: bool = False) -> List[Role]:
        """获取租户角色列表 - 带缓存"""
        import logging
        logger = logging.getLogger(__name__)

        if not current_user.tenant_id:
            logger.error(f"用户未关联租户")
            raise HTTPException(status_code=400, detail="用户未关联租户")

        cache_key = self._get_cache_key("tenant_roles", current_user.tenant_id, include_deleted)

        # 尝试从缓存获取
        cached_data = await redis_cache.get(cache_key)

        if cached_data:
            if isinstance(cached_data, str):
                roles_data = json.loads(cached_data)
            else:
                roles_data = cached_data  # 缓存已经是反序列化后的数据
            return [Role(**role_data) for role_data in roles_data]

        # 从数据库查询
        roles = self.role_repo.get_tenant_roles(current_user.tenant_id, include_deleted)
        
        # 准备缓存数据
        roles_data = []
        for role in roles:
            role_dict = {
                "id": role.id,
                "tenant_id": role.tenant_id,
                "name": role.name,
                "display_name": role.display_name,
                "description": role.description,
                "role_type": role.role_type,
                "level": role.level,
                "is_system": role.is_system,
                "is_default": role.is_default,
                "is_active": role.is_active,
                "created_at": role.created_at.isoformat(),
                "updated_at": role.updated_at.isoformat() if role.updated_at else None
            }
            roles_data.append(role_dict)
        
        # 缓存结果
        await redis_cache.set(cache_key, json.dumps(roles_data), self.cache_ttl)
        
        return roles
    
    async def get_role_hierarchy(self, current_user: User) -> List[Dict]:
        """获取角色层级结构 - 带缓存"""
        if not current_user.tenant_id:
            raise HTTPException(status_code=400, detail="用户未关联租户")
        
        cache_key = self._get_cache_key("hierarchy", current_user.tenant_id)
        
        # 尝试从缓存获取
        cached_data = await redis_cache.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 从数据库查询
        hierarchy = self.role_repo.get_role_hierarchy(current_user.tenant_id)
        
        # 缓存结果
        await redis_cache.set(cache_key, json.dumps(hierarchy), self.cache_ttl)
        
        return hierarchy
    
    async def update_role(self, role_id: str, role_update: RoleUpdate, current_user: User) -> Optional[Role]:
        """更新角色"""
        # 获取角色
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 权限检查
        if role.tenant_id != current_user.tenant_id and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="无权修改此角色")
        
        # 更新数据
        update_data = role_update.model_dump(exclude_unset=True)
        updated_role = self.role_repo.update(role_id, update_data)
        
        # 清除相关缓存
        await self._clear_tenant_cache(current_user.tenant_id)
        
        return updated_role
    
    async def delete_role(self, role_id: str, current_user: User) -> bool:
        """删除角色（软删除）"""
        # 获取角色
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 权限检查
        if role.tenant_id != current_user.tenant_id and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="无权删除此角色")
        
        # 检查是否为系统角色
        if role.is_system:
            raise HTTPException(status_code=400, detail="系统角色不能删除")
        
        # 执行软删除
        from datetime import datetime, timezone
        delete_data = {
            "deleted_at": datetime.now(timezone.utc),
            "deleted_by": current_user.id,
            "is_active": False
        }
        
        await self.role_repo.update(role_id, delete_data)
        
        # 清除相关缓存
        await self._clear_tenant_cache(current_user.tenant_id)
        
        return True
    
    async def assign_user_role(self, assign_data: UserRoleAssign, current_user: User) -> bool:
        """分配用户角色"""
        # 验证角色
        role = await self.get_role_by_id(assign_data.role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 分配角色
        success = self.role_repo.assign_user_role(
            assign_data.user_id, assign_data.role_id, 
            current_user.id, assign_data.expires_at
        )
        
        if success:
            # 清除用户角色缓存
            user_cache_key = f"rbac:user_roles:{assign_data.user_id}"
            await redis_cache.delete(user_cache_key)
        
        return success
    
    async def revoke_user_role(self, user_id: str, role_id: str, current_user: User) -> bool:
        """撤销用户角色"""
        # 验证角色
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        success = self.role_repo.revoke_user_role(user_id, role_id)
        
        if success:
            # 清除用户角色缓存
            user_cache_key = f"rbac:user_roles:{user_id}"
            await redis_cache.delete(user_cache_key)
        
        return success
    
    async def get_role_users(self, role_id: str, current_user: User) -> List[Dict]:
        """获取角色用户列表"""
        # 验证角色
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        return self.role_repo.get_role_users(role_id)
    
    async def get_all_permissions(self, current_user: User) -> List[Dict]:
        """获取所有可用权限"""
        cache_key = self._get_cache_key("all_permissions")
        
        # 尝试从缓存获取
        cached_data = await redis_cache.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 这里应该从权限仓储获取，暂时返回模拟数据
        permissions = [
            {
                "id": "user_create",
                "name": "user:create", 
                "display_name": "创建用户",
                "description": "创建新用户账户",
                "category": "user_management",
                "resource_type": "user",
                "action": "create"
            },
            {
                "id": "user_read",
                "name": "user:read",
                "display_name": "查看用户",
                "description": "查看用户信息",
                "category": "user_management", 
                "resource_type": "user",
                "action": "read"
            },
            {
                "id": "user_update",
                "name": "user:update",
                "display_name": "更新用户", 
                "description": "更新用户信息",
                "category": "user_management",
                "resource_type": "user", 
                "action": "update"
            },
            {
                "id": "user_delete",
                "name": "user:delete",
                "display_name": "删除用户",
                "description": "删除用户账户",
                "category": "user_management",
                "resource_type": "user",
                "action": "delete"
            },
            {
                "id": "role_create", 
                "name": "role:create",
                "display_name": "创建角色",
                "description": "创建新角色",
                "category": "role_management",
                "resource_type": "role",
                "action": "create"
            },
            {
                "id": "role_read",
                "name": "role:read", 
                "display_name": "查看角色",
                "description": "查看角色信息",
                "category": "role_management",
                "resource_type": "role",
                "action": "read"
            }
        ]
        
        # 缓存结果
        await redis_cache.set(cache_key, json.dumps(permissions), self.cache_ttl)
        
        return permissions
    
    async def assign_role_permissions(self, permission_data: RolePermissionAssign, current_user: User) -> bool:
        """分配角色权限"""
        # 验证角色
        role = await self.get_role_by_id(permission_data.role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 这里应该调用权限仓储的方法，暂时返回True
        success = True
        
        if success:
            # 清除角色权限缓存
            role_perm_key = f"rbac:role_permissions:{permission_data.role_id}"
            await redis_cache.delete(role_perm_key)
        
        return success
    
    async def revoke_role_permission(self, role_id: str, permission_id: str, current_user: User) -> bool:
        """撤销角色权限"""
        # 验证角色
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 这里应该调用权限仓储的方法，暂时返回True
        success = True
        
        if success:
            # 清除角色权限缓存
            role_perm_key = f"rbac:role_permissions:{role_id}"
            await redis_cache.delete(role_perm_key)
        
        return success
    
    async def get_role_permissions(self, role_id: str, current_user: User) -> List[Dict]:
        """获取角色权限列表"""
        # 验证角色
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")

        cache_key = f"rbac:role_permissions:{role_id}"

        # 尝试从缓存获取
        cached_data = await redis_cache.get(cache_key)
        if cached_data:
            if isinstance(cached_data, str):
                return json.loads(cached_data)
            else:
                # 如果缓存数据已经是dict格式，直接返回
                return cached_data

        # 从权限仓储获取角色权限
        permissions = []
        if self.permission_repo:
            try:
                permission_objects = await self.permission_repo.get_role_permissions(role_id)
                permissions = [
                    {
                        "id": perm.id,
                        "name": perm.name,
                        "display_name": perm.display_name,
                        "description": perm.description,
                        "resource_type": perm.resource_type,
                        "action": perm.action,
                        "category": perm.category,
                        "is_system": perm.is_system,
                        "is_active": perm.is_active,
                        "created_at": perm.created_at.isoformat() if perm.created_at else None,
                        "updated_at": perm.updated_at.isoformat() if perm.updated_at else None
                    }
                    for perm in permission_objects
                ]
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"获取角色权限失败: {str(e)}")
                logger.exception(e)  # Log full stack trace for debugging
                permissions = []

        # 缓存结果 - 确保传入字符串格式
        try:
            await redis_cache.set(cache_key, json.dumps(permissions), self.cache_ttl)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"缓存角色权限失败: {str(e)}")

        return permissions
    
    async def set_role_inheritance(self, role_id: str, parent_role_id: str, current_user: User) -> bool:
        """设置角色继承关系"""
        # 验证两个角色
        role = await self.get_role_by_id(role_id, current_user)
        parent_role = await self.get_role_by_id(parent_role_id, current_user)
        
        if not role or not parent_role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 更新父角色关系
        update_data = {
            "parent_id": parent_role_id,
            "level": parent_role.level + 1
        }
        
        self.role_repo.update(role_id, update_data)
        
        # 清除相关缓存
        await self._clear_tenant_cache(current_user.tenant_id)
        
        return True
    
    async def remove_role_inheritance(self, role_id: str, current_user: User) -> bool:
        """移除角色继承关系"""
        # 验证角色
        role = await self.get_role_by_id(role_id, current_user)
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 移除父角色关系
        update_data = {
            "parent_id": None,
            "level": 0
        }
        
        self.role_repo.update(role_id, update_data)
        
        # 清除相关缓存
        await self._clear_tenant_cache(current_user.tenant_id)
        
        return True
    
    async def copy_role(self, source_role_id: str, new_name: str, new_code: str, 
                       new_description: str = None, current_user: User = None) -> Role:
        """复制角色"""
        # 获取源角色
        source_role = await self.get_role_by_id(source_role_id, current_user)
        if not source_role:
            raise HTTPException(status_code=404, detail="源角色不存在")
        
        # 创建新角色数据
        new_role_data = RoleCreate(
            name=new_code,
            display_name=new_name,
            description=new_description or f"复制自 {source_role.display_name}",
            role_type="custom",
            level=source_role.level
        )
        
        # 创建新角色
        new_role = await self.create_role(new_role_data, current_user)
        
        # TODO: 复制权限关系（需要权限仓储支持）
        
        return new_role