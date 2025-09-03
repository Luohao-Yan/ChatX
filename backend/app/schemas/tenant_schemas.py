"""
租户管理相关的Pydantic schemas
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field


class TenantCreate(BaseModel):
    """创建租户的请求模型"""
    name: str = Field(..., min_length=1, max_length=100, description="租户名称")
    display_name: Optional[str] = Field(None, max_length=100, description="租户显示名称")
    description: Optional[str] = Field(None, description="租户描述")
    schema_name: Optional[str] = Field(None, max_length=100, description="数据库Schema名称")
    slug: Optional[str] = Field(None, max_length=100, description="租户标识符")
    domain: Optional[str] = Field(None, max_length=255, description="自定义域名")
    subdomain: Optional[str] = Field(None, max_length=100, description="子域名")
    settings: Optional[Dict[str, Any]] = Field(None, description="租户配置")
    features: Optional[List[str]] = Field(None, description="开启的功能列表")
    limits: Optional[Dict[str, Any]] = Field(None, description="租户限制配置")


class TenantUpdate(BaseModel):
    """更新租户的请求模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="租户名称")
    display_name: Optional[str] = Field(None, max_length=100, description="租户显示名称")
    description: Optional[str] = Field(None, description="租户描述")
    slug: Optional[str] = Field(None, max_length=100, description="租户标识符")
    domain: Optional[str] = Field(None, max_length=255, description="自定义域名")
    subdomain: Optional[str] = Field(None, max_length=100, description="子域名")
    is_active: Optional[bool] = Field(None, description="租户是否激活")
    status: Optional[str] = Field(None, description="租户状态")
    settings: Optional[Dict[str, Any]] = Field(None, description="租户配置")
    features: Optional[List[str]] = Field(None, description="开启的功能列表")
    limits: Optional[Dict[str, Any]] = Field(None, description="租户限制配置")


class TenantResponse(BaseModel):
    """租户响应模型"""
    id: str = Field(..., description="租户ID")
    name: str = Field(..., description="租户名称")
    display_name: Optional[str] = Field(None, description="租户显示名称")
    description: Optional[str] = Field(None, description="租户描述")
    schema_name: str = Field(..., description="数据库Schema名称")
    owner_id: str = Field(..., description="租户所有者ID")
    owner_name: Optional[str] = Field(None, description="租户所有者名称")
    owner_display_name: Optional[str] = Field(None, description="租户所有者显示名称")
    status: str = Field(..., description="租户状态")
    is_active: bool = Field(..., description="租户是否激活")
    slug: Optional[str] = Field(None, description="租户标识符")
    domain: Optional[str] = Field(None, description="自定义域名")
    subdomain: Optional[str] = Field(None, description="子域名")
    settings: Optional[Dict[str, Any]] = Field(None, description="租户配置")
    features: Optional[List[str]] = Field(None, description="开启的功能列表")
    limits: Optional[Dict[str, Any]] = Field(None, description="租户限制配置")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: Optional[datetime] = Field(None, description="更新时间")
    deleted_at: Optional[datetime] = Field(None, description="删除时间")
    
    # 统计信息字段
    user_count: Optional[int] = Field(None, description="用户数量")
    org_count: Optional[int] = Field(None, description="组织数量")
    storage_used: Optional[str] = Field(None, description="存储使用量")

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    """租户列表响应模型"""
    tenants: List[TenantResponse] = Field(..., description="租户列表")
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


class TenantStatsResponse(BaseModel):
    """租户统计响应模型"""
    id: str = Field(..., description="租户ID")
    name: str = Field(..., description="租户名称")
    user_count: int = Field(0, description="用户数量")
    org_count: int = Field(0, description="组织数量")
    storage_used: str = Field("0 MB", description="存储使用量")
    last_activity: Optional[datetime] = Field(None, description="最后活动时间")


class TenantUserCreate(BaseModel):
    """租户用户关联创建模型"""
    user_id: str = Field(..., description="用户ID")
    role: str = Field("member", description="用户在租户中的角色")
    permissions: Optional[Dict[str, Any]] = Field(None, description="用户在租户中的权限")
    is_admin: bool = Field(False, description="是否为租户管理员")


class TenantUserResponse(BaseModel):
    """租户用户关联响应模型"""
    id: str = Field(..., description="关联ID")
    tenant_id: str = Field(..., description="租户ID")
    user_id: str = Field(..., description="用户ID")
    role: str = Field(..., description="用户在租户中的角色")
    permissions: Optional[Dict[str, Any]] = Field(None, description="用户在租户中的权限")
    is_admin: bool = Field(..., description="是否为租户管理员")
    is_active: bool = Field(..., description="关联是否激活")
    joined_at: datetime = Field(..., description="加入时间")

    class Config:
        from_attributes = True


class TenantBackupCreate(BaseModel):
    """创建租户备份的请求模型"""
    backup_name: Optional[str] = Field(None, description="备份名称")
    description: Optional[str] = Field(None, description="备份描述")


class TenantBackupResponse(BaseModel):
    """租户备份响应模型"""
    id: str = Field(..., description="备份记录ID")
    source_tenant_id: str = Field(..., description="源租户ID")
    backup_tenant_id: str = Field(..., description="备份租户ID")
    backup_name: str = Field(..., description="备份名称")
    version: int = Field(..., description="备份版本号")
    description: Optional[str] = Field(None, description="备份描述")
    backup_type: str = Field(..., description="备份类型")
    users_count: int = Field(0, description="备份的用户数量")
    orgs_count: int = Field(0, description="备份的组织数量")
    files_count: int = Field(0, description="备份的文件数量")
    status: str = Field(..., description="备份状态")
    is_active: bool = Field(..., description="备份是否有效")
    created_by: str = Field(..., description="备份创建者用户ID")
    created_at: datetime = Field(..., description="备份创建时间")
    completed_at: Optional[datetime] = Field(None, description="备份完成时间")

    class Config:
        from_attributes = True