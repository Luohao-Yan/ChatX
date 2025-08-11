from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from enum import Enum

class TenantType(str, Enum):
    TRIAL = "trial"        # 试用版
    BASIC = "basic"        # 基础版
    PROFESSIONAL = "professional"  # 专业版
    ENTERPRISE = "enterprise"     # 企业版

class TenantStatus(str, Enum):
    ACTIVE = "active"      # 活跃
    SUSPENDED = "suspended"  # 暂停
    EXPIRED = "expired"    # 过期
    CANCELLED = "cancelled"  # 取消

class Tenant(Base):
    """租户模型 - 多租户架构的核心"""
    __tablename__ = "sys_tenants"

    id = Column(Integer, primary_key=True, index=True)
    
    # 租户基本信息
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)  # 租户唯一标识
    domain = Column(String(255), nullable=True, unique=True, index=True)  # 自定义域名
    subdomain = Column(String(100), nullable=True, unique=True, index=True)  # 子域名
    
    # 租户类型和状态
    tenant_type = Column(String(20), default=TenantType.TRIAL, nullable=False)
    status = Column(String(20), default=TenantStatus.ACTIVE, nullable=False, index=True)
    
    # 联系信息
    admin_email = Column(String(255), nullable=False, index=True)
    admin_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    
    # 订阅信息
    subscription_starts_at = Column(DateTime(timezone=True), nullable=True)
    subscription_ends_at = Column(DateTime(timezone=True), nullable=True)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    
    # 配额限制
    max_users = Column(Integer, default=10, nullable=False)           # 最大用户数
    max_storage = Column(BigInteger, default=1073741824, nullable=False)  # 最大存储空间(1GB)
    max_files = Column(Integer, default=1000, nullable=False)         # 最大文件数
    max_api_calls = Column(Integer, default=10000, nullable=False)    # 每月API调用限制
    
    # 当前使用量
    current_users = Column(Integer, default=0, nullable=False)
    current_storage = Column(BigInteger, default=0, nullable=False)
    current_files = Column(Integer, default=0, nullable=False)
    current_api_calls = Column(Integer, default=0, nullable=False)    # 当月API调用数
    
    # 功能开关
    features = Column(JSON, nullable=True)  # 可用功能列表
    settings = Column(JSON, nullable=True)  # 租户自定义设置
    
    # 数据库配置（如果使用数据库分片）
    database_name = Column(String(100), nullable=True)  # 专用数据库名
    database_config = Column(JSON, nullable=True)       # 数据库连接配置
    
    # 集成配置
    integrations = Column(JSON, nullable=True)          # 第三方集成配置
    
    # 安全设置
    allowed_ips = Column(JSON, nullable=True)           # IP白名单
    require_2fa = Column(Boolean, default=False, nullable=False)  # 强制双因素认证
    password_policy = Column(JSON, nullable=True)       # 密码策略
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity_at = Column(DateTime(timezone=True), nullable=True)  # 最后活动时间
    
    # 删除相关
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # 关系
    users = relationship("User", back_populates="tenant")
    organizations = relationship("Organization", back_populates="tenant")
    audit_logs = relationship("TenantAuditLog", back_populates="tenant")

class TenantAuditLog(Base):
    """租户审计日志"""
    __tablename__ = "sys_tenant_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id"), nullable=True, index=True)
    
    # 审计信息
    action = Column(String(100), nullable=False, index=True)    # 操作类型
    resource_type = Column(String(50), nullable=False)         # 资源类型
    resource_id = Column(String(100), nullable=True)           # 资源ID
    old_values = Column(JSON, nullable=True)                   # 修改前的值
    new_values = Column(JSON, nullable=True)                   # 修改后的值
    
    # 请求信息
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(100), nullable=True, index=True)  # 请求追踪ID
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 关系
    tenant = relationship("Tenant", back_populates="audit_logs")
    user = relationship("User")

class TenantUsageMetric(Base):
    """租户使用量指标"""
    __tablename__ = "sys_tenant_usage_metrics"

    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    
    # 指标信息
    metric_name = Column(String(100), nullable=False, index=True)  # 指标名称
    metric_value = Column(BigInteger, nullable=False)              # 指标值
    metric_unit = Column(String(20), nullable=True)               # 单位
    
    # 时间维度
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    day = Column(Integer, nullable=False, index=True)
    hour = Column(Integer, nullable=True, index=True)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 关系
    tenant = relationship("Tenant")

class TenantFeature(Base):
    """租户功能配置"""
    __tablename__ = "sys_tenant_features"

    id = Column(Integer, primary_key=True, index=True)
    
    # 功能信息
    name = Column(String(100), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True, index=True)
    
    # 可用性
    is_active = Column(Boolean, default=True, nullable=False)
    
    # 配额相关
    has_quota = Column(Boolean, default=False, nullable=False)
    quota_unit = Column(String(20), nullable=True)  # count, size, api_calls等
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class TenantFeatureAccess(Base):
    """租户功能访问权限"""
    __tablename__ = "sys_tenant_feature_access"

    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    feature_id = Column(Integer, ForeignKey("sys_tenant_features.id"), nullable=False, index=True)
    
    # 访问配置
    is_enabled = Column(Boolean, default=True, nullable=False)
    quota_limit = Column(BigInteger, nullable=True)     # 配额限制
    quota_used = Column(BigInteger, default=0, nullable=False)  # 已使用配额
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    tenant = relationship("Tenant")
    feature = relationship("TenantFeature")
    
    # 唯一约束
    __table_args__ = (
        {"extend_existing": True},
    )