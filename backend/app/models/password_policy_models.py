"""
密码策略相关数据模型
支持多层级组织的密码策略管理，包括继承和覆盖机制
"""

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, JSON, Index
from sqlalchemy.sql import func
from enum import Enum
from app.infrastructure.persistence.database import Base


class PolicyScopeType(str, Enum):
    """策略作用域类型"""
    TENANT = "tenant"           # 租户级别
    ORGANIZATION = "organization"  # 单位级别  
    DEPARTMENT = "department"   # 部门级别
    TEAM = "team"              # 团队级别


class PolicyStatus(str, Enum):
    """策略状态"""
    ACTIVE = "active"      # 激活
    INACTIVE = "inactive"  # 停用
    DRAFT = "draft"        # 草稿


class PasswordPolicy(Base):
    """密码策略模型"""
    __tablename__ = "sys_password_policies"
    
    id = Column(String(50), primary_key=True, index=True, comment="策略唯一标识")
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    
    # 策略基本信息
    name = Column(String(100), nullable=False, comment="策略名称")
    description = Column(Text, nullable=True, comment="策略描述")
    status = Column(String(20), nullable=False, default=PolicyStatus.ACTIVE, comment="策略状态")
    
    # 作用域信息
    scope_type = Column(String(20), nullable=False, comment="策略作用域类型")
    scope_id = Column(String(50), nullable=False, comment="作用域ID（组织、部门、团队等的ID）")
    scope_name = Column(String(100), nullable=True, comment="作用域名称（冗余字段，便于查询）")
    
    # 继承关系
    parent_policy_id = Column(String(50), nullable=True, index=True, comment="父级策略ID")
    is_inherited = Column(Boolean, default=True, comment="是否启用继承")
    override_parent = Column(Boolean, default=False, comment="是否覆盖父级策略")
    
    # 密码策略规则（JSON格式存储）
    rules = Column(JSON, nullable=False, comment="密码策略规则")
    
    # 创建和修改信息
    created_by = Column(String(50), nullable=False, comment="创建者ID")
    created_by_name = Column(String(100), nullable=True, comment="创建者姓名")
    updated_by = Column(String(50), nullable=True, comment="最后修改者ID")
    updated_by_name = Column(String(100), nullable=True, comment="最后修改者姓名")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    # 软删除
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    
    __table_args__ = (
        Index('idx_password_policy_tenant_scope', 'tenant_id', 'scope_type', 'scope_id'),
        Index('idx_password_policy_status', 'status', 'deleted_at'),
        Index('idx_password_policy_parent', 'parent_policy_id'),
        {"comment": "密码策略表，支持多层级组织的密码策略管理"}
    )


class PasswordPolicyRule(Base):
    """密码策略规则详情（规范化存储）"""
    __tablename__ = "sys_password_policy_rules"
    
    id = Column(String(50), primary_key=True, index=True, comment="规则唯一标识")
    policy_id = Column(String(50), nullable=False, index=True, comment="策略ID")
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    
    # 规则信息
    rule_type = Column(String(50), nullable=False, comment="规则类型")
    rule_name = Column(String(100), nullable=False, comment="规则名称")
    rule_value = Column(String(200), nullable=True, comment="规则值")
    is_required = Column(Boolean, default=True, comment="是否必须")
    error_message = Column(String(500), nullable=True, comment="验证失败时的错误消息")
    
    # 排序和状态
    sort_order = Column(Integer, default=0, comment="排序")
    is_active = Column(Boolean, default=True, comment="是否启用")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    __table_args__ = (
        Index('idx_password_rule_policy', 'policy_id', 'is_active'),
        Index('idx_password_rule_tenant', 'tenant_id'),
        {"comment": "密码策略规则详情表，支持灵活的规则配置"}
    )


class PasswordPolicyApplication(Base):
    """密码策略应用记录"""
    __tablename__ = "sys_password_policy_applications"
    
    id = Column(String(50), primary_key=True, index=True, comment="应用记录唯一标识")
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    
    # 策略信息
    policy_id = Column(String(50), nullable=False, index=True, comment="策略ID")
    policy_name = Column(String(100), nullable=False, comment="策略名称")
    
    # 应用目标
    target_type = Column(String(20), nullable=False, comment="应用目标类型")
    target_id = Column(String(50), nullable=False, comment="应用目标ID")
    target_name = Column(String(100), nullable=True, comment="应用目标名称")
    
    # 应用状态
    status = Column(String(20), nullable=False, default="active", comment="应用状态")
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), comment="应用时间")
    applied_by = Column(String(50), nullable=False, comment="应用者ID")
    applied_by_name = Column(String(100), nullable=True, comment="应用者姓名")
    
    # 生效和失效时间
    effective_from = Column(DateTime(timezone=True), nullable=True, comment="生效开始时间")
    effective_to = Column(DateTime(timezone=True), nullable=True, comment="生效结束时间")
    
    # 应用结果
    application_result = Column(JSON, nullable=True, comment="应用结果详情")
    
    __table_args__ = (
        Index('idx_password_app_policy', 'policy_id', 'status'),
        Index('idx_password_app_target', 'target_type', 'target_id'),
        Index('idx_password_app_tenant', 'tenant_id'),
        {"comment": "密码策略应用记录表，记录策略的应用历史和状态"}
    )


class PasswordPolicyTemplate(Base):
    """密码策略模板"""
    __tablename__ = "sys_password_policy_templates"
    
    id = Column(String(50), primary_key=True, index=True, comment="模板唯一标识")
    
    # 模板信息
    name = Column(String(100), nullable=False, comment="模板名称")
    description = Column(Text, nullable=True, comment="模板描述")
    category = Column(String(50), nullable=True, comment="模板分类")
    
    # 模板内容
    template_rules = Column(JSON, nullable=False, comment="模板规则配置")
    
    # 模板属性
    is_system = Column(Boolean, default=False, comment="是否系统内置模板")
    is_public = Column(Boolean, default=True, comment="是否公开模板")
    usage_count = Column(Integer, default=0, comment="使用次数")
    
    # 适用范围
    applicable_scopes = Column(JSON, nullable=True, comment="适用的作用域类型")
    
    # 创建信息
    created_by = Column(String(50), nullable=True, comment="创建者ID")
    created_by_name = Column(String(100), nullable=True, comment="创建者姓名")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    __table_args__ = (
        Index('idx_password_template_category', 'category', 'is_public'),
        Index('idx_password_template_system', 'is_system'),
        {"comment": "密码策略模板表，提供预定义的策略模板"}
    )