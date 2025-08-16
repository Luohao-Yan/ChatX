"""
组织管理相关的Pydantic模型
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator


class OrganizationBase(BaseModel):
    """组织基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="组织名称")
    display_name: Optional[str] = Field(None, max_length=100, description="组织显示名称")
    description: Optional[str] = Field(None, description="组织描述")
    logo_url: Optional[str] = Field(None, max_length=255, description="组织Logo URL")
    parent_id: Optional[str] = Field(None, description="父组织ID")
    settings: Optional[Dict[str, Any]] = Field(None, description="组织配置")


class OrganizationCreate(OrganizationBase):
    """创建组织模型"""
    pass


class OrganizationUpdate(BaseModel):
    """更新组织模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="组织名称")
    display_name: Optional[str] = Field(None, max_length=100, description="组织显示名称")
    description: Optional[str] = Field(None, description="组织描述")
    logo_url: Optional[str] = Field(None, max_length=255, description="组织Logo URL")
    parent_id: Optional[str] = Field(None, description="父组织ID")
    settings: Optional[Dict[str, Any]] = Field(None, description="组织配置")
    is_active: Optional[bool] = Field(None, description="是否激活")


class OrganizationResponse(OrganizationBase):
    """组织响应模型"""
    id: str
    tenant_id: str
    owner_id: str
    path: str
    level: int
    is_active: bool
    member_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class OrganizationListResponse(BaseModel):
    """组织列表响应模型"""
    items: List[OrganizationResponse]
    total: int
    page: int
    size: int


class TeamBase(BaseModel):
    """团队基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="团队名称")
    description: Optional[str] = Field(None, description="团队描述")
    organization_id: str = Field(..., description="所属组织ID")
    parent_id: Optional[str] = Field(None, description="父团队ID")
    settings: Optional[Dict[str, Any]] = Field(None, description="团队配置")


class TeamCreate(TeamBase):
    """创建团队模型"""
    pass


class TeamUpdate(BaseModel):
    """更新团队模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="团队名称")
    description: Optional[str] = Field(None, description="团队描述")
    parent_id: Optional[str] = Field(None, description="父团队ID")
    settings: Optional[Dict[str, Any]] = Field(None, description="团队配置")
    is_active: Optional[bool] = Field(None, description="是否激活")


class TeamResponse(TeamBase):
    """团队响应模型"""
    id: str
    tenant_id: str
    creator_id: str
    path: str
    level: int
    is_active: bool
    member_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class TeamListResponse(BaseModel):
    """团队列表响应模型"""
    items: List[TeamResponse]
    total: int
    page: int
    size: int


class UserOrganizationBase(BaseModel):
    """用户组织关系基础模型"""
    role: str = Field(default="member", description="用户在组织中的角色")
    permissions: Optional[Dict[str, Any]] = Field(None, description="用户权限")
    is_admin: bool = Field(default=False, description="是否为组织管理员")


class UserOrganizationCreate(UserOrganizationBase):
    """创建用户组织关系模型"""
    user_id: str = Field(..., description="用户ID")
    organization_id: str = Field(..., description="组织ID")


class UserOrganizationUpdate(BaseModel):
    """更新用户组织关系模型"""
    role: Optional[str] = Field(None, description="用户在组织中的角色")
    permissions: Optional[Dict[str, Any]] = Field(None, description="用户权限")
    is_admin: Optional[bool] = Field(None, description="是否为组织管理员")
    is_active: Optional[bool] = Field(None, description="关联是否激活")


class UserOrganizationResponse(UserOrganizationBase):
    """用户组织关系响应模型"""
    id: str
    tenant_id: str
    user_id: str
    organization_id: str
    is_active: bool
    joined_at: datetime
    
    class Config:
        from_attributes = True


class UserTeamBase(BaseModel):
    """用户团队关系基础模型"""
    role: str = Field(default="member", description="用户在团队中的角色")
    permissions: Optional[Dict[str, Any]] = Field(None, description="用户权限")


class UserTeamCreate(UserTeamBase):
    """创建用户团队关系模型"""
    user_id: str = Field(..., description="用户ID")
    team_id: str = Field(..., description="团队ID")


class UserTeamUpdate(BaseModel):
    """更新用户团队关系模型"""
    role: Optional[str] = Field(None, description="用户在团队中的角色")
    permissions: Optional[Dict[str, Any]] = Field(None, description="用户权限")
    is_active: Optional[bool] = Field(None, description="关联是否激活")


class UserTeamResponse(UserTeamBase):
    """用户团队关系响应模型"""
    id: str
    tenant_id: str
    user_id: str
    team_id: str
    is_active: bool
    joined_at: datetime
    
    class Config:
        from_attributes = True


class OrganizationTreeNode(BaseModel):
    """组织树节点模型"""
    id: str
    name: str
    display_name: Optional[str]
    description: Optional[str]
    level: int
    member_count: int
    is_active: bool
    children: List['OrganizationTreeNode'] = []
    
    class Config:
        from_attributes = True


# 更新前向引用
OrganizationTreeNode.model_rebuild()


class OrganizationStatsResponse(BaseModel):
    """组织统计响应模型"""
    total_organizations: int
    total_teams: int
    total_members: int
    active_organizations: int
    organization_levels: int