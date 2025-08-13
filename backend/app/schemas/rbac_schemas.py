"""
RBAC 相关的 Pydantic 模型
包括角色、权限的创建、更新和响应模型
"""

from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# 角色相关模型

class RoleBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    role_type: str = "custom"
    level: int = 0
    parent_id: Optional[int] = None
    max_users: Optional[int] = None

class RoleCreate(RoleBase):
    @field_validator('name')
    @classmethod
    def validate_role_name(cls, v):
        if len(v) < 2:
            raise ValueError('角色名长度至少2位')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('角色名只能包含字母、数字、下划线和连字符')
        return v

class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    level: Optional[int] = None
    max_users: Optional[int] = None
    is_active: Optional[bool] = None

class RoleSchema(RoleBase):
    id: str
    tenant_id: str
    is_active: bool
    is_system: bool
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# 权限相关模型

class PermissionBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    resource_type: str
    action: str
    category: Optional[str] = None
    group_name: Optional[str] = None
    parent_id: Optional[int] = None
    require_owner: bool = False
    conditions: Optional[Dict[str, Any]] = None

class PermissionCreate(PermissionBase):
    @field_validator('name')
    @classmethod
    def validate_permission_name(cls, v):
        if len(v) < 3:
            raise ValueError('权限名长度至少3位')
        if ':' not in v:
            raise ValueError('权限名格式应为 resource:action')
        return v

class PermissionUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    group_name: Optional[str] = None
    require_owner: Optional[bool] = None
    conditions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class PermissionSchema(PermissionBase):
    id: str
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# 角色权限关联模型

class RolePermissionAssign(BaseModel):
    permission_ids: List[str]
    
    @field_validator('permission_ids')
    @classmethod
    def validate_permission_ids(cls, v):
        if not v:
            raise ValueError('至少需要选择一个权限')
        if len(v) != len(set(v)):
            raise ValueError('权限ID不能重复')
        return v


# 用户角色关联模型

class UserRoleAssign(BaseModel):
    user_ids: List[str]
    expires_at: Optional[datetime] = None
    
    @field_validator('user_ids')
    @classmethod
    def validate_user_ids(cls, v):
        if not v:
            raise ValueError('至少需要选择一个用户')
        if len(v) != len(set(v)):
            raise ValueError('用户ID不能重复')
        return v


# 用户权限关联模型

class UserPermissionAssign(BaseModel):
    user_id: str
    permission_id: str
    granted: bool = True
    resource_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    reason: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None


class UserPermissionSchema(BaseModel):
    id: str
    user_id: str
    permission_id: str
    granted: bool
    resource_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    
    # 关联信息
    permission: Optional[PermissionSchema] = None
    source: str = "direct"  # direct 或 role
    granted_by: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# 用户角色权限汇总模型

class UserPermissionSummary(BaseModel):
    user_id: str
    username: str
    email: str
    roles: List[RoleSchema]
    permissions: List[str]  # 权限名列表
    direct_permissions: List[UserPermissionSchema]


class RoleHierarchy(BaseModel):
    role_id: str
    role_name: str
    parent_role_id: Optional[int] = None
    parent_role_name: Optional[str] = None
    children: List['RoleHierarchy'] = []
    
    model_config = ConfigDict(from_attributes=True)


class PermissionTree(BaseModel):
    permission_id: str
    permission_name: str
    display_name: str
    category: Optional[str] = None
    parent_id: Optional[int] = None
    children: List['PermissionTree'] = []
    
    model_config = ConfigDict(from_attributes=True)


# 权限检查请求模型

class PermissionCheckRequest(BaseModel):
    user_id: Optional[int] = None
    permission_name: str
    resource_id: Optional[str] = None


class PermissionCheckResponse(BaseModel):
    user_id: str
    permission: str
    resource_id: Optional[str] = None
    has_permission: bool
    source: Optional[str] = None  # role, direct, superuser


# 批量操作模型

class BatchRoleAssign(BaseModel):
    role_ids: List[str]
    user_ids: List[str]
    expires_at: Optional[datetime] = None


class BatchPermissionAssign(BaseModel):
    permission_ids: List[str]
    user_ids: List[str]
    resource_id: Optional[str] = None
    expires_at: Optional[datetime] = None


# 权限统计模型

class PermissionStats(BaseModel):
    total_permissions: int
    active_permissions: int
    system_permissions: int
    custom_permissions: int
    categories: List[Dict[str, Any]]


class RoleStats(BaseModel):
    total_roles: int
    active_roles: int
    system_roles: int
    custom_roles: int
    users_count: int


# 权限变更日志模型

class PermissionAuditLog(BaseModel):
    id: int
    action: str
    subject_type: str
    subject_id: int
    permission_name: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    operator_id: int
    operator_name: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)