"""
多对多关系模型 - 优化的权限管理关联表

使用字符串ID和简化的关联表设计，避免外键约束问题。
支持多租户数据隔离和高性能查询。
"""

from sqlalchemy import Table, Column, String, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.infrastructure.persistence.database import Base

# 用户-角色关联表 - 优化为实体表
user_role_association = Table(
    "sys_user_role", Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("tenant_id", String(50), nullable=False, index=True, comment="租户ID"),
    Column("user_id", String(50), nullable=False, index=True, comment="用户ID"),
    Column("role_id", String(50), nullable=False, index=True, comment="角色ID"),
    Column("granted_by", String(50), nullable=True, comment="授权人"),
    Column("granted_at", DateTime(timezone=True), server_default=func.now(), comment="授权时间"),
    Column("expires_at", DateTime(timezone=True), nullable=True, comment="过期时间"),
    Index('idx_user_role_tenant', 'tenant_id', 'user_id'),
    Index('idx_user_role_unique', 'user_id', 'role_id', unique=True),
    comment="用户角色关联表，管理用户与角色的多对多关系"
)

# 注意：用户权限表已移至 rbac_models.py 中的 UserPermission 模型
# 这里不再定义重复的关联表，避免索引冲突

# 角色-权限关联表
role_permission_association = Table(
    "sys_role_permission", Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("tenant_id", String(50), nullable=False, index=True, comment="租户ID"),
    Column("role_id", String(50), nullable=False, index=True, comment="角色ID"),
    Column("permission_id", String(50), nullable=False, index=True, comment="权限ID"),
    Column("granted_by", String(50), nullable=True, comment="授权人"),
    Column("granted_at", DateTime(timezone=True), server_default=func.now(), comment="授权时间"),
    Index('idx_role_perm_tenant', 'tenant_id', 'role_id'),
    Index('idx_role_perm_unique', 'role_id', 'permission_id', unique=True),
    comment="角色权限关联表，管理角色与权限的多对多关系"
)

# 用户-用户组关联表
user_group_association = Table(
    "sys_user_group", Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("tenant_id", String(50), nullable=False, index=True, comment="租户ID"),
    Column("user_id", String(50), nullable=False, index=True, comment="用户ID"),
    Column("group_id", String(50), nullable=False, index=True, comment="用户组ID"),
    Column("added_by", String(50), nullable=True, comment="添加人"),
    Column("added_at", DateTime(timezone=True), server_default=func.now(), comment="添加时间"),
    Index('idx_user_group_tenant', 'tenant_id', 'user_id'),
    Index('idx_user_group_unique', 'user_id', 'group_id', unique=True),
    comment="用户组关联表，管理用户与用户组的多对多关系"
)

# 用户组-角色关联表
group_role_association = Table(
    "sys_group_role", Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("tenant_id", String(50), nullable=False, index=True, comment="租户ID"),
    Column("group_id", String(50), nullable=False, index=True, comment="用户组ID"),
    Column("role_id", String(50), nullable=False, index=True, comment="角色ID"),
    Column("granted_by", String(50), nullable=True, comment="授权人"),
    Column("granted_at", DateTime(timezone=True), server_default=func.now(), comment="授权时间"),
    Index('idx_group_role_tenant', 'tenant_id', 'group_id'),
    Index('idx_group_role_unique', 'group_id', 'role_id', unique=True),
    comment="组角色关联表，管理用户组与角色的多对多关系"
)

# 用户组-权限关联表
group_permission_association = Table(
    "sys_group_permission", Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("tenant_id", String(50), nullable=False, index=True, comment="租户ID"),
    Column("group_id", String(50), nullable=False, index=True, comment="用户组ID"),
    Column("permission_id", String(50), nullable=False, index=True, comment="权限ID"),
    Column("granted_by", String(50), nullable=True, comment="授权人"),
    Column("granted_at", DateTime(timezone=True), server_default=func.now(), comment="授权时间"),
    Index('idx_group_perm_tenant', 'tenant_id', 'group_id'),
    Index('idx_group_perm_unique', 'group_id', 'permission_id', unique=True),
    comment="组权限关联表，管理用户组与权限的多对多关系"
)