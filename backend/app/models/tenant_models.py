"""租户管理相关的数据库模型

包含:
- TenantType: 租户类型枚举
- TenantStatus: 租户状态枚举  
- Tenant: 租户主表模型
- TenantAuditLog: 租户审计日志模型
- TenantUsageMetric: 租户使用量指标模型
- TenantFeature: 租户功能配置模型
- TenantFeatureAccess: 租户功能访问权限模型
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.database import Base
from enum import Enum

__all__ = [
    'TenantType', 'TenantStatus', 'Tenant', 'TenantAuditLog', 
    'TenantUsageMetric', 'TenantFeature', 'TenantFeatureAccess'
]

class TenantType(str, Enum):
    """租户类型枚举
    
    定义不同的租户套餐类型，用于功能权限和资源配额控制。
    """
    TRIAL = "trial"        # 试用版，免费试用期的租户
    BASIC = "basic"        # 基础版，基本功能套餐
    PROFESSIONAL = "professional"  # 专业版，增强功能套餐
    ENTERPRISE = "enterprise"     # 企业版，完整功能套餐

class TenantStatus(str, Enum):
    """租户状态枚举
    
    定义租户在系统中的生命周期状态，用于访问控制和计费管理。
    """
    ACTIVE = "active"      # 活跃状态，租户正常使用系统
    SUSPENDED = "suspended"  # 暂停状态，因违规或欠费被暂停
    EXPIRED = "expired"    # 过期状态，订阅已到期
    CANCELLED = "cancelled"  # 取消状态，租户主动取消服务

class Tenant(Base):
    """租户模型 - 多租户架构的核心
    
    租户是多租户SaaS系统的核心概念，每个租户代表一个独立的客户组织。
    租户之间的数据完全隔离，拥有独立的用户体系、配额限制和功能配置。
    
    主要特性:
    - 数据隔离：确保租户间数据完全隔离
    - 配额管理：支持用户数、存储空间、API调用等配额控制
    - 功能控制：支持按套餐类型提供不同功能
    - 安全策略：支持IP白名单、强制2FA等安全设置
    - 订阅管理：支持试用期、订阅期等时间管理
    - 第三方集成：支持与外部系统的集成配置
    """
    __tablename__ = "sys_tenants"

    # 租户唯一标识ID
    id = Column(Integer, primary_key=True, index=True, comment="租户唯一标识ID")
    
    # 租户基本身份信息
    name = Column(String(255), nullable=False, index=True, comment="租户名称（组织名称）")
    slug = Column(String(100), unique=True, index=True, nullable=False, comment="租户唯一标识符，用于URL路径")
    domain = Column(String(255), nullable=True, unique=True, index=True, comment="租户自定义域名")
    subdomain = Column(String(100), nullable=True, unique=True, index=True, comment="租户子域名")
    
    # 租户套餐类型和状态
    tenant_type = Column(String(20), default=TenantType.TRIAL, nullable=False, comment="租户套餐类型")
    status = Column(String(20), default=TenantStatus.ACTIVE, nullable=False, index=True, comment="租户当前状态")
    
    # 租户管理员联系信息
    admin_email = Column(String(255), nullable=False, index=True, comment="租户管理员邮箱地址")
    admin_name = Column(String(255), nullable=False, comment="租户管理员姓名")
    phone = Column(String(20), nullable=True, comment="租户联系电话")
    address = Column(Text, nullable=True, comment="租户联系地址")
    
    # 租户订阅和试用期管理
    subscription_starts_at = Column(DateTime(timezone=True), nullable=True, comment="订阅开始时间")
    subscription_ends_at = Column(DateTime(timezone=True), nullable=True, comment="订阅结束时间")
    trial_ends_at = Column(DateTime(timezone=True), nullable=True, comment="试用期结束时间")
    
    # 租户资源配额限制
    max_users = Column(Integer, default=10, nullable=False, comment="最大用户数限制")
    max_storage = Column(BigInteger, default=1073741824, nullable=False, comment="最大存储空间限制（字节）")
    max_files = Column(Integer, default=1000, nullable=False, comment="最大文件数量限制")
    max_api_calls = Column(Integer, default=10000, nullable=False, comment="每月API调用次数限制")
    
    # 租户当前资源使用量
    current_users = Column(Integer, default=0, nullable=False, comment="当前用户数量")
    current_storage = Column(BigInteger, default=0, nullable=False, comment="当前存储空间使用量（字节）")
    current_files = Column(Integer, default=0, nullable=False, comment="当前文件数量")
    current_api_calls = Column(Integer, default=0, nullable=False, comment="当月API调用次数")
    
    # 租户功能和设置配置
    features = Column(JSON, nullable=True, comment="租户可用功能列表（JSON格式）")
    settings = Column(JSON, nullable=True, comment="租户自定义设置（JSON格式）")
    
    # 数据库分片配置（支持租户独立数据库）
    database_name = Column(String(100), nullable=True, comment="租户专用数据库名称")
    database_config = Column(JSON, nullable=True, comment="数据库连接配置（JSON格式）")
    
    # 第三方系统集成配置
    integrations = Column(JSON, nullable=True, comment="第三方系统集成配置（JSON格式）")
    
    # 租户安全策略设置
    allowed_ips = Column(JSON, nullable=True, comment="IP地址白名单（JSON数组格式）")
    require_2fa = Column(Boolean, default=False, nullable=False, comment="是否强制要求双因素认证")
    password_policy = Column(JSON, nullable=True, comment="密码策略配置（JSON格式）")
    
    # 租户时间戳记录
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, comment="租户创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="租户最后更新时间")
    last_activity_at = Column(DateTime(timezone=True), nullable=True, comment="租户最后活动时间")
    
    # 租户软删除支持
    is_deleted = Column(Boolean, default=False, nullable=False, comment="是否已软删除")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    
    # SQLAlchemy关系映射
    users = relationship("User", back_populates="tenant")  # 租户下的用户列表
    organizations = relationship("Organization", back_populates="tenant")  # 租户下的组织列表
    audit_logs = relationship("TenantAuditLog", back_populates="tenant")  # 租户审计日志列表

class TenantAuditLog(Base):
    """租户审计日志模型
    
    记录租户级别的所有操作审计信息，用于合规性要求和安全监控。
    包括用户操作、系统变更、配置修改等所有关键活动的完整记录。
    
    主要特性:
    - 操作追踪：记录所有关键操作的详细信息
    - 数据变更：记录修改前后的完整数据状态
    - 请求追踪：支持分布式系统的请求链路追踪
    - 合规支持：满足企业合规和审计要求
    """
    __tablename__ = "sys_tenant_audit_logs"

    # 审计日志记录ID
    id = Column(Integer, primary_key=True, index=True, comment="审计日志记录ID")
    
    # 审计关联信息
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True,
                      comment="所属租户ID")
    user_id = Column(Integer, ForeignKey("sys_users.id"), nullable=True, index=True,
                    comment="操作用户ID（系统操作时可为空）")
    
    # 操作审计信息
    action = Column(String(100), nullable=False, index=True, comment="操作类型（create/update/delete/login等）")
    resource_type = Column(String(50), nullable=False, comment="操作的资源类型（user/file/organization等）")
    resource_id = Column(String(100), nullable=True, comment="具体资源的ID标识")
    old_values = Column(JSON, nullable=True, comment="修改前的数据值（JSON格式）")
    new_values = Column(JSON, nullable=True, comment="修改后的数据值（JSON格式）")
    
    # HTTP请求信息
    ip_address = Column(String(45), nullable=True, comment="操作者IP地址")
    user_agent = Column(Text, nullable=True, comment="用户代理信息（浏览器等）")
    request_id = Column(String(100), nullable=True, index=True, comment="请求追踪ID，用于分布式链路追踪")
    
    # 审计时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True,
                       comment="审计记录创建时间")
    
    # SQLAlchemy关系映射
    tenant = relationship("Tenant", back_populates="audit_logs")  # 所属租户对象
    user = relationship("User")  # 操作用户对象

class TenantUsageMetric(Base):
    """租户使用量指标模型
    
    记录租户的各种使用量指标，用于计费、监控和资源优化。
    支持按时间维度（年/月/日/时）分别统计不同类型的使用量数据。
    
    主要特性:
    - 多维度统计：支持按不同时间粒度统计
    - 指标类型：支持各种业务指标的统计
    - 计费支持：为计费系统提供数据支持
    - 性能监控：支持租户使用量分析
    """
    __tablename__ = "sys_tenant_usage_metrics"

    # 使用量指标记录ID
    id = Column(Integer, primary_key=True, index=True, comment="使用量指标记录ID")
    
    # 指标关联信息
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True,
                      comment="所属租户ID")
    
    # 指标数据信息
    metric_name = Column(String(100), nullable=False, index=True, comment="指标名称（api_calls/storage_used等）")
    metric_value = Column(BigInteger, nullable=False, comment="指标数值")
    metric_unit = Column(String(20), nullable=True, comment="数值单位（bytes/count/seconds等）")
    
    # 时间维度分解
    year = Column(Integer, nullable=False, index=True, comment="统计年份")
    month = Column(Integer, nullable=False, index=True, comment="统计月份（1-12）")
    day = Column(Integer, nullable=False, index=True, comment="统计日期（1-31）")
    hour = Column(Integer, nullable=True, index=True, comment="统计小时（0-23，可为空）")
    
    # 指标记录时间
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True,
                       comment="指标记录创建时间")
    
    # SQLAlchemy关系映射
    tenant = relationship("Tenant")  # 所属租户对象

class TenantFeature(Base):
    """租户功能配置模型
    
    定义系统中所有可用的功能模块，用于按套餐类型提供不同的功能权限。
    各种功能可以组合成不同的套餐包，灵活支持SaaS产品的商业模式。
    
    主要特性:
    - 功能模块化：支持细粒度的功能控制
    - 配额管理：支持功能的使用量限制
    - 动态配置：支持运行时功能开关
    - 套餐组合：灵活支持各种套餐配置
    """
    __tablename__ = "sys_tenant_features"

    # 功能定义唯一ID
    id = Column(Integer, primary_key=True, index=True, comment="功能定义唯一ID")
    
    # 功能基本信息
    name = Column(String(100), nullable=False, unique=True, index=True, comment="功能唯一名称标识")
    display_name = Column(String(255), nullable=False, comment="功能显示名称")
    description = Column(Text, nullable=True, comment="功能详细描述")
    category = Column(String(50), nullable=True, index=True, comment="功能分类（文件管理/用户管理等）")
    
    # 功能可用性状态
    is_active = Column(Boolean, default=True, nullable=False, comment="功能是否激活可用")
    
    # 功能配额相关设置
    has_quota = Column(Boolean, default=False, nullable=False, comment="是否有使用量限制")
    quota_unit = Column(String(20), nullable=True, comment="配额单位（count/size/api_calls等）")
    
    # 功能定义时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="功能创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="功能最后更新时间")

class TenantFeatureAccess(Base):
    """租户功能访问权限模型
    
    管理具体租户对各种功能的访问权限和配额使用情况。
    与 TenantFeature 结合使用，实现精细化的功能权限控制和配额管理。
    
    主要特性:
    - 权限控制：精确控制租户功能访问
    - 配额跟踪：实时监控配额使用情况
    - 灵活配置：支持个性化配额设置
    - 计费支持：为计费系统提供数据支持
    """
    __tablename__ = "sys_tenant_feature_access"

    # 功能访问权限记录ID
    id = Column(Integer, primary_key=True, index=True, comment="功能访问权限记录ID")
    
    # 功能访问关联信息
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True,
                      comment="租户ID")
    feature_id = Column(Integer, ForeignKey("sys_tenant_features.id"), nullable=False, index=True,
                       comment="功能定义ID")
    
    # 功能访问配置
    is_enabled = Column(Boolean, default=True, nullable=False, comment="功能是否对该租户开放")
    quota_limit = Column(BigInteger, nullable=True, comment="配额上限（null表示无限制）")
    quota_used = Column(BigInteger, default=0, nullable=False, comment="已使用的配额数量")
    
    # 访问权限时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="权限配置创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="权限配置最后更新时间")
    
    # SQLAlchemy关系映射
    tenant = relationship("Tenant")  # 所属租户对象
    feature = relationship("TenantFeature")  # 关联的功能定义对象
    
    # 数据库表配置
    __table_args__ = (
        {"extend_existing": True, "comment": "租户功能访问权限表，管理租户对各功能的访问权限"},
    )