from typing import Optional, Tuple, List, Dict, Any
from app.models.user_models import User
from app.models.rbac_models import Role, Permission
from datetime import datetime, timezone


class RoleDomainService:
    """角色领域服务 - 包含角色相关的核心业务逻辑"""
    
    @staticmethod
    def validate_role_creation(name: str, display_name: str, tenant_id: int, 
                              parent_role: Role = None) -> Tuple[bool, Optional[str]]:
        """验证角色创建"""
        # 角色名验证
        if not name or len(name.strip()) == 0:
            return False, "角色名不能为空"
        
        if len(name) > 100:
            return False, "角色名长度不能超过100个字符"
        
        # 显示名验证
        if not display_name or len(display_name.strip()) == 0:
            return False, "显示名不能为空"
        
        if len(display_name) > 255:
            return False, "显示名长度不能超过255个字符"
        
        # 层级验证
        if parent_role and parent_role.level >= 10:
            return False, "角色层级不能超过10层"
        
        return True, None
    
    @staticmethod
    def can_user_manage_role(user: User, role: Role) -> Tuple[bool, Optional[str]]:
        """检查用户是否可以管理角色"""
        # 超级管理员可以管理所有角色
        if user.is_superuser:
            return True, None
        
        # 只能管理同租户的角色
        if role.tenant_id != user.tenant_id:
            return False, "只能管理同租户的角色"
        
        # 系统角色不能被删除或修改
        if role.is_system:
            return False, "系统角色不能被修改"
        
        return True, None
    
    @staticmethod
    def can_role_be_deleted(role: Role, user_count: int) -> Tuple[bool, Optional[str]]:
        """检查角色是否可以被删除"""
        # 系统角色不能删除
        if role.is_system:
            return False, "系统角色不能删除"
        
        # 已删除的角色不能再次删除
        if role.is_deleted:
            return False, "角色已被删除"
        
        # 有用户的角色不能直接删除
        if user_count > 0:
            return False, f"角色下还有{user_count}个用户，无法删除"
        
        return True, None
    
    @staticmethod
    def can_assign_role_to_user(role: Role, user: User, current_user_count: int) -> Tuple[bool, Optional[str]]:
        """检查是否可以将角色分配给用户"""
        # 角色必须是激活状态
        if not role.is_active:
            return False, "角色未激活，无法分配"
        
        # 检查用户数量限制
        if role.max_users and current_user_count >= role.max_users:
            return False, f"角色用户数量已达上限（{role.max_users}）"
        
        # 不能跨租户分配角色
        if role.tenant_id != user.tenant_id:
            return False, "不能跨租户分配角色"
        
        return True, None
    
    @staticmethod
    def prepare_role_data(name: str, display_name: str, description: str, 
                         tenant_id: int, role_type: str = "custom", 
                         level: int = 0, parent_id: int = None, 
                         max_users: int = None, created_by: int = None) -> dict:
        """准备角色数据"""
        return {
            "tenant_id": tenant_id,
            "name": name,
            "display_name": display_name,
            "description": description,
            "role_type": role_type,
            "level": level,
            "parent_id": parent_id,
            "max_users": max_users,
            "created_by": created_by,
            "is_active": True,
            "is_system": False,
            "is_default": False
        }
    
    @staticmethod
    def prepare_role_deletion_data(deleted_by: int) -> dict:
        """准备角色删除数据"""
        return {
            "is_deleted": True,
            "deleted_at": datetime.now(timezone.utc),
            "deleted_by": deleted_by
        }


class PermissionDomainService:
    """权限领域服务 - 包含权限相关的核心业务逻辑"""
    
    @staticmethod
    def validate_permission_creation(name: str, display_name: str, resource_type: str, 
                                   action: str) -> Tuple[bool, Optional[str]]:
        """验证权限创建"""
        # 权限名验证
        if not name or len(name.strip()) == 0:
            return False, "权限名不能为空"
        
        if len(name) > 100:
            return False, "权限名长度不能超过100个字符"
        
        # 权限名格式验证 (resource:action)
        if ":" not in name:
            return False, "权限名格式应为 'resource:action'"
        
        # 显示名验证
        if not display_name or len(display_name.strip()) == 0:
            return False, "显示名不能为空"
        
        # 资源类型验证
        if not resource_type or len(resource_type.strip()) == 0:
            return False, "资源类型不能为空"
        
        # 操作类型验证
        if not action or len(action.strip()) == 0:
            return False, "操作类型不能为空"
        
        return True, None
    
    @staticmethod
    def can_permission_be_deleted(permission: Permission) -> Tuple[bool, Optional[str]]:
        """检查权限是否可以被删除"""
        # 系统权限不能删除
        if permission.is_system:
            return False, "系统权限不能删除"
        
        # 已删除的权限不能再次删除
        if permission.is_deleted:
            return False, "权限已被删除"
        
        return True, None
    
    @staticmethod
    def prepare_permission_data(name: str, display_name: str, description: str,
                              resource_type: str, action: str, category: str = None,
                              group_name: str = None, parent_id: int = None,
                              require_owner: bool = False, conditions: dict = None) -> dict:
        """准备权限数据"""
        return {
            "name": name,
            "display_name": display_name,
            "description": description,
            "resource_type": resource_type,
            "action": action,
            "category": category,
            "group_name": group_name,
            "parent_id": parent_id,
            "is_system": False,
            "is_active": True,
            "require_owner": require_owner,
            "conditions": conditions
        }
    
    @staticmethod
    def prepare_permission_deletion_data(deleted_by: int) -> dict:
        """准备权限删除数据"""
        return {
            "is_deleted": True,
            "deleted_at": datetime.now(timezone.utc),
            "deleted_by": deleted_by
        }


class UserPermissionDomainService:
    """用户权限领域服务"""
    
    @staticmethod
    def validate_user_permission_grant(user: User, permission: Permission, 
                                     granted_by: User, resource_id: str = None) -> Tuple[bool, Optional[str]]:
        """验证用户权限授予"""
        # 权限必须是激活状态
        if not permission.is_active:
            return False, "权限未激活，无法授予"
        
        # 授权者必须有权限管理权限
        # 这里简化处理，实际应该检查授权者的权限
        if not granted_by.is_superuser:
            return False, "无权限授予该权限"
        
        return True, None
    
    @staticmethod
    def prepare_user_permission_data(user_id: int, permission_id: int, granted: bool = True,
                                   resource_id: str = None, conditions: dict = None,
                                   granted_by: int = None, reason: str = None,
                                   expires_at = None) -> dict:
        """准备用户权限数据"""
        return {
            "user_id": user_id,
            "permission_id": permission_id,
            "granted": granted,
            "resource_id": resource_id,
            "conditions": conditions,
            "granted_by": granted_by,
            "reason": reason,
            "expires_at": expires_at,
            "is_active": True
        }
    
    @staticmethod
    def check_permission_conditions(permission: Permission, context: dict = None) -> bool:
        """检查权限执行条件"""
        if not permission.conditions:
            return True
        
        # 这里可以实现复杂的条件检查逻辑
        # 例如：时间限制、IP限制、资源所有者检查等
        
        # 检查是否需要资源所有者权限
        if permission.require_owner and context:
            resource_owner_id = context.get("resource_owner_id")
            current_user_id = context.get("current_user_id")
            if resource_owner_id and current_user_id != resource_owner_id:
                return False
        
        return True
    
    @staticmethod
    def merge_user_permissions(role_permissions: List[Permission], 
                             direct_permissions: List[dict]) -> Dict[str, Any]:
        """合并用户的角色权限和直接权限"""
        merged_permissions = {}
        
        # 添加角色权限
        for perm in role_permissions:
            merged_permissions[perm.name] = {
                "permission": perm,
                "source": "role",
                "granted": True,
                "conditions": perm.conditions
            }
        
        # 添加直接权限（可能会覆盖角色权限）
        for direct_perm in direct_permissions:
            perm_name = direct_perm["permission"].name
            merged_permissions[perm_name] = {
                "permission": direct_perm["permission"],
                "source": "direct",
                "granted": direct_perm["granted"],
                "conditions": direct_perm.get("conditions"),
                "resource_id": direct_perm.get("resource_id"),
                "expires_at": direct_perm.get("expires_at")
            }
        
        return merged_permissions