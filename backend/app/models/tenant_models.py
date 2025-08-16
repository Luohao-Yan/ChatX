"""
多租户相关的数据库模型。

包含:
- Tenant: 租户模型，定义了系统的租户信息，支持多租户隔离。
- TenantUser: 租户与用户的关联模型，管理用户所属的租户。
- TenantDatabase: 租户数据库信息模型，用于存储每个租户独立的数据库连接信息。
- TenantActivity: 租户活动日志模型，记录租户级别的重要操作。
"""

import uuid
from enum import Enum

from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Index, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.infrastructure.persistence.database import Base


class TenantStatus(str, Enum):
    """租户状态枚举"""
    ACTIVE = "active"        # 租户正常激活状态
    INACTIVE = "inactive"    # 租户未激活或已停用
    SUSPENDED = "suspended"  # 租户因违规等原因被暂停
    DELETED = "deleted"      # 租户已被删除


class Tenant(Base):
    """租户模型 - 使用字符串ID避免外键依赖"""
    __tablename__ = "sys_tenants"

    id = Column(String(50), primary_key=True, index=True, comment="租户唯一标识")
    name = Column(String(100), nullable=False, unique=True, index=True, comment="租户名称")
    display_name = Column(String(100), nullable=True, comment="租户显示名称")
    schema_name = Column(String(100), nullable=False, unique=True, index=True, comment="数据库Schema名称")
    description = Column(Text, nullable=True, comment="租户描述")
    owner_id = Column(String(50), nullable=False, index=True, comment="租户所有者ID")
    status = Column(String(20), default=TenantStatus.ACTIVE, nullable=False, comment="租户状态")
    is_active = Column(Boolean, default=True, nullable=False, comment="租户是否激活")
    
    # URL相关字段
    slug = Column(String(100), nullable=True, unique=True, index=True, comment="租户标识符")
    domain = Column(String(255), nullable=True, unique=True, index=True, comment="自定义域名")
    subdomain = Column(String(100), nullable=True, unique=True, index=True, comment="子域名")
    
    # 软删除支持
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(String(50), nullable=True, comment="删除者ID")
    
    # 租户配置
    settings = Column(JSON, nullable=True, comment="租户配置")
    features = Column(JSON, nullable=True, comment="开启的功能列表")
    limits = Column(JSON, nullable=True, comment="租户限制配置")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    # 索引优化
    __table_args__ = (
        Index('idx_tenant_owner', 'owner_id'),
        Index('idx_tenant_status', 'status', 'is_active'),
        Index('idx_tenant_slug', 'slug'),
        Index('idx_tenant_domain', 'domain'),
        Index('idx_tenant_subdomain', 'subdomain'),
        {"comment": "租户主表，存储多租户系统中的租户信息和配置"}
    )
    
    @property
    def is_deleted(self) -> bool:
        """检查租户是否已被软删除"""
        return self.deleted_at is not None


class TenantUser(Base):
    """租户用户关联模型 - 简化关联"""
    __tablename__ = "sys_tenant_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
    role = Column(String(50), default='member', nullable=False, comment="用户在租户中的角色")
    permissions = Column(JSON, nullable=True, comment="用户在租户中的权限")
    is_admin = Column(Boolean, default=False, nullable=False, comment="是否为租户管理员")
    is_active = Column(Boolean, default=True, nullable=False, comment="关联是否激活")
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), comment="加入时间")
    
    # 唯一约束和索引
    __table_args__ = (
        Index('idx_tenant_user_unique', 'tenant_id', 'user_id', unique=True),
        Index('idx_tenant_role', 'tenant_id', 'role'),
        {"comment": "租户用户关联表，管理用户与租户的多对多关联和权限"}
    )


class TenantDatabase(Base):
    """租户数据库信息模型 - 优化为配置管理"""
    __tablename__ = "sys_tenant_databases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(String(50), nullable=False, unique=True, index=True, comment="租户ID")
    
    # 数据库连接信息
    connection_config = Column(JSON, nullable=False, comment="数据库连接配置(JSON加密存储)")
    connection_pool_config = Column(JSON, nullable=True, comment="连接池配置")
    
    # 状态和统计
    is_active = Column(Boolean, default=True, nullable=False, comment="是否激活")
    last_health_check = Column(DateTime(timezone=True), nullable=True, comment="最后健康检查时间")
    health_status = Column(String(20), default='unknown', comment="健康状态")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    # 索引优化
    __table_args__ = (
        Index('idx_tenant_db_status', 'tenant_id', 'is_active'),
        {"comment": "租户数据库配置表，存储每个租户的数据库连接和健康状态信息"}
    )


class TenantActivity(Base):
    """租户活动日志模型 - 简化为日志表"""
    __tablename__ = "sys_tenant_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    user_id = Column(String(50), nullable=True, index=True, comment="操作用户ID")
    action = Column(String(100), nullable=False, comment="操作类型")
    resource_type = Column(String(50), nullable=True, comment="资源类型")
    resource_id = Column(String(100), nullable=True, comment="资源ID")
    details = Column(JSON, nullable=True, comment="操作详情JSON")
    ip_address = Column(String(45), nullable=True, comment="操作IP")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_tenant_activity_time', 'tenant_id', 'created_at'),
        Index('idx_tenant_activity_user', 'user_id', 'created_at'),
        Index('idx_tenant_activity_action', 'action', 'created_at'),
        {"comment": "租户活动日志表，记录租户级别的重要操作和变更"}
    )