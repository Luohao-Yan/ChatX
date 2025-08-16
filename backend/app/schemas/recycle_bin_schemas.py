"""
回收站相关的Pydantic模式定义
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ResourceType(str, Enum):
    """资源类型枚举"""
    USER = "user"
    ORGANIZATION = "organization"
    DEPARTMENT = "department"
    ROLE = "role"
    PERMISSION = "permission"


class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "active"      # 激活
    INACTIVE = "inactive"  # 停用
    PENDING = "pending"    # 待激活
    SUSPENDED = "suspended" # 暂停
    DELETED = "deleted"    # 已删除


class RecycleBinItem(BaseModel):
    """回收站项目基础模型"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    resource_type: ResourceType
    resource_id: str
    name: str
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    deleted_by_name: Optional[str] = None
    original_data: Optional[Dict[str, Any]] = None


class UserRecycleBinItem(RecycleBinItem):
    """用户回收站项目"""
    resource_type: ResourceType = Field(default=ResourceType.USER)
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    organization_name: Optional[str] = None
    department_name: Optional[str] = None
    status: Optional[UserStatus] = None


class OrganizationRecycleBinItem(RecycleBinItem):
    """组织回收站项目"""
    resource_type: ResourceType = Field(default=ResourceType.ORGANIZATION)
    code: Optional[str] = None
    description: Optional[str] = None
    parent_name: Optional[str] = None
    user_count: Optional[int] = 0
    department_count: Optional[int] = 0


class DepartmentRecycleBinItem(RecycleBinItem):
    """部门回收站项目"""
    resource_type: ResourceType = Field(default=ResourceType.DEPARTMENT)
    code: Optional[str] = None
    description: Optional[str] = None
    organization_name: Optional[str] = None
    parent_name: Optional[str] = None
    manager_name: Optional[str] = None
    user_count: Optional[int] = 0


class RoleRecycleBinItem(RecycleBinItem):
    """角色回收站项目"""
    resource_type: ResourceType = Field(default=ResourceType.ROLE)
    display_name: Optional[str] = None
    description: Optional[str] = None
    role_type: Optional[str] = None
    level: Optional[int] = None
    user_count: Optional[int] = 0
    permission_count: Optional[int] = 0


class PermissionRecycleBinItem(RecycleBinItem):
    """权限回收站项目"""
    resource_type: ResourceType = Field(default=ResourceType.PERMISSION)
    display_name: Optional[str] = None
    description: Optional[str] = None
    resource_type_name: Optional[str] = None
    action: Optional[str] = None
    category: Optional[str] = None


class RecycleBinResponse(BaseModel):
    """回收站响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    items: List[RecycleBinItem]
    total: int
    page: int
    size: int
    has_next: bool
    has_prev: bool


class RecycleBinFilter(BaseModel):
    """回收站筛选条件"""
    resource_type: Optional[ResourceType] = None
    deleted_by: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = Field(None, description="搜索关键词，支持名称、邮箱等")
    
    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_dates(cls, v):
        if v and v.tzinfo is None:
            raise ValueError('datetime must be timezone-aware')
        return v


class BatchOperation(BaseModel):
    """批量操作请求"""
    resource_type: ResourceType
    resource_ids: List[int] = Field(..., min_length=1, max_length=100, description="资源ID列表，最多100个")
    
    @field_validator('resource_ids')
    @classmethod
    def validate_resource_ids(cls, v):
        if len(set(v)) != len(v):
            raise ValueError('resource_ids must be unique')
        return v


class BatchSoftDeleteRequest(BatchOperation):
    """批量软删除请求"""
    reason: Optional[str] = Field(None, max_length=500, description="删除原因")


class BatchRestoreRequest(BatchOperation):
    """批量恢复请求"""
    reason: Optional[str] = Field(None, max_length=500, description="恢复原因")


class BatchPermanentDeleteRequest(BatchOperation):
    """批量永久删除请求"""
    confirm: bool = Field(..., description="确认永久删除")
    reason: Optional[str] = Field(None, max_length=500, description="删除原因")
    
    @field_validator('confirm')
    @classmethod
    def validate_confirm(cls, v):
        if not v:
            raise ValueError('must confirm permanent deletion')
        return v


class UserStatusUpdateRequest(BaseModel):
    """用户状态更新请求"""
    status: UserStatus
    reason: Optional[str] = Field(None, max_length=500, description="状态变更原因")


class BatchUserStatusUpdateRequest(BaseModel):
    """批量用户状态更新请求"""
    user_ids: List[int] = Field(..., min_length=1, max_length=100)
    status: UserStatus
    reason: Optional[str] = Field(None, max_length=500, description="状态变更原因")
    
    @field_validator('user_ids')
    @classmethod
    def validate_user_ids(cls, v):
        if len(set(v)) != len(v):
            raise ValueError('user_ids must be unique')
        return v


class OperationResult(BaseModel):
    """操作结果"""
    success: bool
    message: str
    failed_items: Optional[List[Dict[str, Any]]] = None
    success_count: Optional[int] = None
    failed_count: Optional[int] = None


class RecycleBinStats(BaseModel):
    """回收站统计信息"""
    total_items: int
    by_type: Dict[ResourceType, int]
    by_date: Dict[str, int]  # 按删除日期统计
    by_user: Dict[str, int]  # 按删除用户统计
    storage_saved: Optional[int] = None  # 节省的存储空间（字节）


# 响应模型
class UserResponse(BaseModel):
    """用户响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    status: UserStatus
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    employee_id: Optional[str] = None
    organization_id: Optional[str] = None
    department_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    is_deleted: bool = False


class OrganizationResponse(BaseModel):
    """组织响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    code: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    parent_id: Optional[str] = None
    path: str
    level: int
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: bool = False


class DepartmentResponse(BaseModel):
    """部门响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    code: str
    description: Optional[str] = None
    org_id: str
    parent_id: Optional[str] = None
    path: str
    level: int
    sort_order: int
    manager_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: bool = False


class RoleResponse(BaseModel):
    """角色响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    display_name: str
    description: Optional[str] = None
    role_type: str
    level: int
    is_active: bool
    is_system: bool
    is_default: bool
    parent_id: Optional[str] = None
    max_users: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: bool = False


class PermissionResponse(BaseModel):
    """权限响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    display_name: str
    description: Optional[str] = None
    resource_type: str
    action: str
    category: Optional[str] = None
    group_name: Optional[str] = None
    parent_id: Optional[str] = None
    is_system: bool
    is_active: bool
    require_owner: bool
    conditions: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: bool = False