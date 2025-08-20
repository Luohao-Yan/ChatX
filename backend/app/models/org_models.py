"""
组织架构、团队和成员关系相关的数据库模型。

包含:
- Organization: 组织模型，定义了公司的基本信息和层级关系。
- Team: 团队模型，在组织内部创建项目或职能团队。
- UserOrganization: 用户与组织的多对多关系模型。
- UserTeam: 用户与团队的多对多关系模型。
- Invitation: 邀请模型，用于邀请用户加入组织或团队。
- OrgActivity: 组织活动日志模型，记录组织内的重要操作。
"""

import uuid
from enum import Enum

from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Integer, Index, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.infrastructure.persistence.database import Base


class InvitationStatus(str, Enum):
    """邀请状态枚举"""
    PENDING = "pending"    # 待处理
    ACCEPTED = "accepted"  # 已接受
    REJECTED = "rejected"  # 已拒绝
    EXPIRED = "expired"    # 已过期
    CANCELED = "canceled"  # 已取消


class Organization(Base):
    """组织模型 - 简化关联依赖"""
    __tablename__ = "sys_organizations"

    id = Column(String(50), primary_key=True, index=True, comment="组织唯一标识")
    tenant_id = Column(String(50), nullable=False, index=True, comment="所属租户ID")
    name = Column(String(100), nullable=False, index=True, comment="组织名称")
    display_name = Column(String(100), nullable=True, comment="组织显示名称")
    description = Column(Text, nullable=True, comment="组织描述")
    logo_url = Column(String(255), nullable=True, comment="组织Logo URL")
    owner_id = Column(String(50), nullable=False, index=True, comment="组织所有者ID")
    parent_id = Column(String(50), nullable=True, index=True, comment="父组织ID")
    path = Column(String(500), nullable=False, index=True, comment="组织层级路径")
    level = Column(Integer, default=0, nullable=False, comment="组织层级")
    is_active = Column(Boolean, default=True, nullable=False, comment="组织是否激活")
    
    # 组织配置
    settings = Column(JSON, nullable=True, comment="组织配置")
    member_count = Column(Integer, default=0, comment="成员数量")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(String(50), nullable=True, comment="删除者ID")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_org_tenant_name', 'tenant_id', 'name', unique=True),
        Index('idx_org_parent_path', 'parent_id', 'path'),
        Index('idx_org_owner', 'owner_id'),
        Index('idx_org_deleted', 'deleted_at', 'tenant_id'),
        {"comment": "组织架构表，管理公司的层级组织结构"}
    )


class Team(Base):
    """团队模型 - 简化关联依赖"""
    __tablename__ = "sys_teams"

    id = Column(String(50), primary_key=True, index=True, comment="团队唯一标识")
    tenant_id = Column(String(50), nullable=False, index=True, comment="所属租户ID")
    organization_id = Column(String(50), nullable=False, index=True, comment="所属组织ID")
    name = Column(String(100), nullable=False, index=True, comment="团队名称")
    description = Column(Text, nullable=True, comment="团队描述")
    creator_id = Column(String(50), nullable=False, comment="创建者ID")
    parent_id = Column(String(50), nullable=True, index=True, comment="父团队ID")
    path = Column(String(500), nullable=False, index=True, comment="团队层级路径")
    level = Column(Integer, default=0, nullable=False, comment="团队层级")
    is_active = Column(Boolean, default=True, nullable=False, comment="团队是否激活")
    
    # 团队配置
    settings = Column(JSON, nullable=True, comment="团队配置")
    member_count = Column(Integer, default=0, comment="成员数量")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_team_org_name', 'organization_id', 'name', unique=True),
        Index('idx_team_tenant', 'tenant_id'),
        Index('idx_team_parent_path', 'parent_id', 'path'),
        {"comment": "团队管理表，管理组织内部的项目或职能团队"}
    )


class UserOrganization(Base):
    """用户与组织关系模型 - 优化关联"""
    __tablename__ = "sys_user_organization"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
    organization_id = Column(String(50), nullable=False, index=True, comment="组织ID")
    role = Column(String(50), nullable=False, default="member", comment="用户在组织中的角色")
    permissions = Column(JSON, nullable=True, comment="用户在组织中的权限")
    is_admin = Column(Boolean, default=False, nullable=False, comment="是否为组织管理员")
    is_active = Column(Boolean, default=True, nullable=False, comment="关联是否激活")
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), comment="加入时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_user_org_unique', 'user_id', 'organization_id', unique=True),
        Index('idx_user_org_tenant', 'tenant_id', 'organization_id'),
        Index('idx_user_org_role', 'organization_id', 'role'),
        {"comment": "用户组织关系表，管理用户与组织的多对多关联"}
    )


class UserTeam(Base):
    """用户与团队关系模型 - 优化关联"""
    __tablename__ = "sys_user_team"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
    team_id = Column(String(50), nullable=False, index=True, comment="团队ID")
    role = Column(String(50), nullable=False, default="member", comment="用户在团队中的角色")
    permissions = Column(JSON, nullable=True, comment="用户在团队中的权限")
    is_active = Column(Boolean, default=True, nullable=False, comment="关联是否激活")
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), comment="加入时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_user_team_unique', 'user_id', 'team_id', unique=True),
        Index('idx_user_team_tenant', 'tenant_id', 'team_id'),
        Index('idx_user_team_role', 'team_id', 'role'),
        {"comment": "用户团队关系表，管理用户与团队的多对多关联"}
    )


class Invitation(Base):
    """邀请模型 - 简化关联"""
    __tablename__ = "sys_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="邀请ID")
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    organization_id = Column(String(50), nullable=True, index=True, comment="组织ID")
    team_id = Column(String(50), nullable=True, index=True, comment="团队ID")
    inviter_id = Column(String(50), nullable=False, index=True, comment="邀请人ID")
    invitee_id = Column(String(50), nullable=True, index=True, comment="被邀请人ID")
    invitee_email = Column(String(255), nullable=False, index=True, comment="被邀请人邮箱")
    invite_type = Column(String(20), default='organization', comment="邀请类型")
    role = Column(String(50), default="member", nullable=False, comment="被邀请的角色")
    permissions = Column(JSON, nullable=True, comment="邀请权限")
    status = Column(String(20), default=InvitationStatus.PENDING, nullable=False, comment="邀请状态")
    token = Column(String(100), nullable=False, unique=True, index=True, comment="邀请令牌")
    expires_at = Column(DateTime(timezone=True), nullable=False, comment="过期时间")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_invitation_email_status', 'invitee_email', 'status'),
        Index('idx_invitation_tenant_org', 'tenant_id', 'organization_id'),
        Index('idx_invitation_expires', 'expires_at', 'status'),
        {"comment": "邀请管理表，用于邀请用户加入组织或团队"}
    )


class OrgActivity(Base):
    """组织活动日志模型 - 简化为日志表"""
    __tablename__ = "sys_org_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    organization_id = Column(String(50), nullable=False, index=True, comment="组织ID")
    user_id = Column(String(50), nullable=False, index=True, comment="操作用户ID")
    action = Column(String(100), nullable=False, comment="操作类型")
    resource_type = Column(String(50), nullable=True, comment="资源类型")
    resource_id = Column(String(100), nullable=True, comment="资源ID")
    details = Column(JSON, nullable=True, comment="操作详情JSON")
    ip_address = Column(String(45), nullable=True, comment="操作IP")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_org_activity_time', 'organization_id', 'created_at'),
        Index('idx_org_activity_tenant', 'tenant_id', 'created_at'),
        Index('idx_org_activity_user', 'user_id', 'created_at'),
        Index('idx_org_activity_action', 'action', 'created_at'),
        {"comment": "组织活动日志表，记录组织内的重要操作和变更"}
    )