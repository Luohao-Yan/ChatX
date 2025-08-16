"""
RBAC (Role-Based Access Control) 相关的数据库模型。

包含:
- Role: 角色模型，定义系统中的角色信息
- Permission: 权限模型，定义系统中的权限信息  
- UserGroup: 用户组模型，用于批量管理用户权限
"""

import uuid
from enum import Enum

from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Integer, Index, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.infrastructure.persistence.database import Base


class RoleType(str, Enum):
    """角色类型枚举"""
    SYSTEM = "system"      # 系统角色，不可删除
    TENANT = "tenant"      # 租户角色，租户内有效
    CUSTOM = "custom"      # 自定义角色，可删除


class Role(Base):
    """角色模型 - 简化关联依赖"""
    __tablename__ = "sys_roles"

    id = Column(String(50), primary_key=True, index=True, comment="角色唯一标识")
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    name = Column(String(50), nullable=False, index=True, comment="角色名称")
    display_name = Column(String(100), nullable=False, comment="角色显示名称")
    description = Column(Text, nullable=True, comment="角色描述")
    
    # 角色属性
    role_type = Column(String(20), default=RoleType.CUSTOM, nullable=False, comment="角色类型")
    level = Column(Integer, default=0, nullable=False, comment="角色权限级别（数值越大权限越高）")
    is_system = Column(Boolean, default=False, nullable=False, comment="是否为系统角色")
    is_default = Column(Boolean, default=False, nullable=False, comment="是否为默认角色")
    is_active = Column(Boolean, default=True, nullable=False, comment="角色是否激活")
    
    # 软删除支持
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(String(50), nullable=True, comment="删除者ID")
    
    # 配置信息
    settings = Column(JSON, nullable=True, comment="角色配置信息")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    # 索引优化
    __table_args__ = (
        Index('idx_role_tenant_name', 'tenant_id', 'name', unique=True),
        Index('idx_role_type_level', 'role_type', 'level'),
        {"comment": "角色表，管理系统中的角色信息和权限级别"}
    )
    
    @property
    def is_deleted(self) -> bool:
        """检查角色是否已被软删除"""
        return self.deleted_at is not None


class Permission(Base):
    """权限模型 - 简化关联依赖"""
    __tablename__ = "sys_permissions"

    id = Column(String(50), primary_key=True, index=True, comment="权限唯一标识")
    name = Column(String(100), nullable=False, unique=True, index=True, comment="权限名称（如user:create）")
    display_name = Column(String(100), nullable=False, comment="权限显示名称")
    description = Column(Text, nullable=True, comment="权限描述")
    
    # 权限分类
    category = Column(String(50), nullable=True, index=True, comment="权限分类")
    resource_type = Column(String(50), nullable=True, index=True, comment="资源类型")
    action = Column(String(50), nullable=True, index=True, comment="操作类型")
    
    # 权限属性
    is_system = Column(Boolean, default=False, nullable=False, comment="是否为系统权限")
    is_active = Column(Boolean, default=True, nullable=False, comment="权限是否激活")
    
    # 软删除支持
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(String(50), nullable=True, comment="删除者ID")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    # 索引优化
    __table_args__ = (
        Index('idx_permission_category_action', 'category', 'action'),
        Index('idx_permission_resource_action', 'resource_type', 'action'),
        {"comment": "权限表，管理系统中的所有权限定义"}
    )
    
    @property
    def is_deleted(self) -> bool:
        """检查权限是否已被软删除"""
        return self.deleted_at is not None


class UserGroup(Base):
    """用户组模型 - 简化关联依赖"""
    __tablename__ = "sys_user_groups"

    id = Column(String(50), primary_key=True, index=True, comment="用户组唯一标识")
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    name = Column(String(100), nullable=False, index=True, comment="用户组名称")
    display_name = Column(String(100), nullable=False, comment="用户组显示名称")
    description = Column(Text, nullable=True, comment="用户组描述")
    
    # 组织关系
    parent_id = Column(String(50), nullable=True, index=True, comment="父用户组ID")
    path = Column(String(500), nullable=False, index=True, comment="用户组层级路径")
    level = Column(Integer, default=0, nullable=False, comment="用户组层级")
    
    # 用户组属性
    is_system = Column(Boolean, default=False, nullable=False, comment="是否为系统用户组")
    is_active = Column(Boolean, default=True, nullable=False, comment="用户组是否激活")
    member_count = Column(Integer, default=0, comment="成员数量")
    
    # 管理信息
    owner_id = Column(String(50), nullable=False, index=True, comment="用户组创建者ID")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    # 索引优化
    __table_args__ = (
        Index('idx_group_tenant_name', 'tenant_id', 'name', unique=True),
        Index('idx_group_parent_path', 'parent_id', 'path'),
        {"comment": "用户组表，管理用户的分组和批量权限管理"}
    )


class UserPermission(Base):
    """用户直接权限模型 - 管理直接授予用户的权限"""
    __tablename__ = "sys_user_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
    permission_id = Column(String(50), nullable=False, index=True, comment="权限ID")
    
    # 权限授予信息
    resource_id = Column(String(100), nullable=True, comment="资源ID（特定资源权限）")
    granted = Column(Boolean, default=True, nullable=False, comment="是否授予（True）或拒绝（False）")
    granted_by = Column(String(50), nullable=True, comment="授权人ID")
    granted_at = Column(DateTime(timezone=True), server_default=func.now(), comment="授权时间")
    expires_at = Column(DateTime(timezone=True), nullable=True, comment="权限过期时间")
    
    # 状态
    is_active = Column(Boolean, default=True, nullable=False, comment="权限是否激活")
    
    # 索引优化
    __table_args__ = (
        Index('idx_user_perm_tenant', 'tenant_id', 'user_id'),
        Index('idx_user_perm_unique', 'user_id', 'permission_id', 'resource_id', unique=True),
        {"comment": "用户权限表，管理直接授予用户的权限"}
    )