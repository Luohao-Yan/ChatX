"""关系管理相关的数据库模型

包含:
- UserOrganization: 用户组织关系模型
- UserDepartment: 用户部门关系模型  
- OrganizationHierarchy: 组织层级关系模型
- DepartmentHierarchy: 部门层级关系模型

混合架构设计：
- 移除复杂的外键约束
- 使用JSON字段存储扩展信息
- 通过应用层服务管理数据一致性
- 支持更灵活的关系管理
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, UniqueConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.infrastructure.persistence.database import Base
from datetime import datetime, timezone
from typing import Optional
import uuid

__all__ = [
    'UserOrganization', 'UserDepartment', 'OrganizationHierarchy', 'DepartmentHierarchy'
]

class UserOrganization(Base):
    """用户组织关系模型
    
    管理用户与组织的关系，支持用户在多个组织中拥有不同角色。
    取代复杂的外键关系，使用JSON存储扩展信息。
    
    主要特性:
    - 多租户隔离：确保租户间关系数据隔离
    - 角色管理：支持用户在组织中的多种角色
    - 时效性：支持关系的有效期管理
    - 扩展信息：使用JSON存储灵活的关系属性
    - 审计追踪：完整记录关系变更历史
    """
    __tablename__ = "sys_user_organizations"

    # 关系记录唯一标识
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, 
               comment="用户组织关系记录ID")
    
    # 多租户支持
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True, 
                      comment="所属租户ID，用于多租户数据隔离")
    
    # 关系实体ID（移除外键约束）
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="用户ID")
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="组织ID")
    
    # 关系属性信息
    relationship_type = Column(String(50), nullable=False, default="member", index=True,
                             comment="关系类型（member/manager/admin/owner等）")
    
    # 关系状态管理
    is_active = Column(Boolean, default=True, nullable=False, comment="关系是否有效")
    is_primary = Column(Boolean, default=False, nullable=False, comment="是否为用户的主要组织")
    
    # 关系有效期管理
    effective_from = Column(DateTime(timezone=True), nullable=True, comment="关系生效时间")
    effective_until = Column(DateTime(timezone=True), nullable=True, comment="关系失效时间")
    
    # 扩展信息（JSON存储）
    attributes = Column(JSON, nullable=True, comment="""关系扩展属性，包含：
    {
        "position": "职位名称",
        "level": "职级",
        "permissions": ["权限列表"],
        "contact_info": {"联系方式": "值"},
        "custom_fields": {"自定义字段": "值"}
    }""")
    
    # 关系审计信息
    created_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="创建者用户ID")
    approved_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="审批者用户ID")
    
    # 时间戳字段
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="关系创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="关系最后更新时间")
    
    # 数据库约束和索引
    __table_args__ = (
        UniqueConstraint('tenant_id', 'user_id', 'organization_id', name='uq_user_org_relation'),
        Index('ix_user_org_active', 'tenant_id', 'user_id', 'is_active'),
        Index('ix_org_users_active', 'tenant_id', 'organization_id', 'is_active'),
        Index('ix_user_primary_org', 'tenant_id', 'user_id', 'is_primary'),
        {"comment": "用户组织关系表 - 混合架构设计，灵活管理用户组织关系"},
    )

class UserDepartment(Base):
    """用户部门关系模型
    
    管理用户与部门的关系，支持用户在多个部门中拥有不同职责。
    支持矩阵式组织结构，用户可以同时属于多个部门。
    
    主要特性:
    - 矩阵组织：支持用户属于多个部门
    - 职责管理：记录用户在部门中的具体职责
    - 汇报关系：支持复杂的汇报链管理
    - 时效性：支持临时部门分配
    - 灵活配置：JSON存储扩展属性
    """
    __tablename__ = "sys_user_departments"

    # 关系记录唯一标识
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, 
               comment="用户部门关系记录ID")
    
    # 多租户支持
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True, 
                      comment="所属租户ID，用于多租户数据隔离")
    
    # 关系实体ID（移除外键约束）
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="用户ID")
    department_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="部门ID")
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="所属组织ID")
    
    # 关系属性信息
    relationship_type = Column(String(50), nullable=False, default="member", index=True,
                             comment="关系类型（member/manager/lead/coordinator等）")
    
    # 关系状态管理
    is_active = Column(Boolean, default=True, nullable=False, comment="关系是否有效")
    is_primary = Column(Boolean, default=False, nullable=False, comment="是否为用户的主要部门")
    
    # 汇报关系管理
    reports_to = Column(UUID(as_uuid=True), nullable=True, index=True, comment="直接汇报对象用户ID")
    
    # 关系有效期管理
    effective_from = Column(DateTime(timezone=True), nullable=True, comment="关系生效时间")
    effective_until = Column(DateTime(timezone=True), nullable=True, comment="关系失效时间")
    
    # 扩展信息（JSON存储）
    attributes = Column(JSON, nullable=True, comment="""关系扩展属性，包含：
    {
        "job_title": "职位名称",
        "responsibilities": ["职责列表"],
        "work_location": "工作地点",
        "allocation_percentage": 80,
        "custom_fields": {"自定义字段": "值"}
    }""")
    
    # 关系审计信息
    created_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="创建者用户ID")
    approved_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="审批者用户ID")
    
    # 时间戳字段
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="关系创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="关系最后更新时间")
    
    # 数据库约束和索引
    __table_args__ = (
        UniqueConstraint('tenant_id', 'user_id', 'department_id', name='uq_user_dept_relation'),
        Index('ix_user_dept_active', 'tenant_id', 'user_id', 'is_active'),
        Index('ix_dept_users_active', 'tenant_id', 'department_id', 'is_active'),
        Index('ix_user_primary_dept', 'tenant_id', 'user_id', 'is_primary'),
        Index('ix_reporting_chain', 'tenant_id', 'reports_to', 'is_active'),
        {"comment": "用户部门关系表 - 支持矩阵式组织结构和复杂汇报关系"},
    )

class OrganizationHierarchy(Base):
    """组织层级关系模型
    
    管理组织间的层级关系，支持复杂的组织架构变更和历史追踪。
    取代传统的parent_id自引用方式，支持更灵活的层级管理。
    
    主要特性:
    - 灵活层级：支持动态的组织层级调整
    - 历史追踪：完整记录组织架构变更历史
    - 多维关系：支持不同类型的组织关系
    - 路径缓存：优化层级查询性能
    - 循环检测：防止组织层级循环依赖
    """
    __tablename__ = "sys_organization_hierarchy"

    # 层级关系记录唯一标识
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, 
               comment="组织层级关系记录ID")
    
    # 多租户支持
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True, 
                      comment="所属租户ID，用于多租户数据隔离")
    
    # 层级关系实体ID（移除外键约束）
    parent_org_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="父组织ID")
    child_org_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="子组织ID")
    
    # 层级关系属性
    relationship_type = Column(String(50), nullable=False, default="subsidiary", index=True,
                             comment="关系类型（subsidiary/division/branch/partner等）")
    level_depth = Column(Integer, nullable=False, default=1, comment="层级深度（1为直接子组织）")
    sort_order = Column(Integer, default=0, nullable=False, comment="同级排序顺序")
    
    # 路径缓存（优化查询性能）
    path = Column(String(2000), nullable=False, index=True, comment="完整组织路径缓存")
    
    # 关系状态管理
    is_active = Column(Boolean, default=True, nullable=False, comment="关系是否有效")
    
    # 关系有效期管理
    effective_from = Column(DateTime(timezone=True), nullable=True, comment="关系生效时间")
    effective_until = Column(DateTime(timezone=True), nullable=True, comment="关系失效时间")
    
    # 扩展信息（JSON存储）
    attributes = Column(JSON, nullable=True, comment="""层级关系扩展属性，包含：
    {
        "ownership_percentage": 100,
        "control_type": "full/partial/none",
        "business_relationship": "详细说明",
        "custom_fields": {"自定义字段": "值"}
    }""")
    
    # 关系审计信息
    created_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="创建者用户ID")
    
    # 时间戳字段
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="关系创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="关系最后更新时间")
    
    # 数据库约束和索引
    __table_args__ = (
        UniqueConstraint('tenant_id', 'parent_org_id', 'child_org_id', name='uq_org_hierarchy'),
        Index('ix_org_children', 'tenant_id', 'parent_org_id', 'is_active'),
        Index('ix_org_parents', 'tenant_id', 'child_org_id', 'is_active'),
        Index('ix_org_hierarchy_path', 'tenant_id', 'path'),
        {"comment": "组织层级关系表 - 灵活管理组织架构层级关系"},
    )

class DepartmentHierarchy(Base):
    """部门层级关系模型
    
    管理部门间的层级关系，支持复杂的部门架构和跨组织部门管理。
    支持部门重组、合并、拆分等操作的历史追踪。
    
    主要特性:
    - 跨组织部门：支持部门跨组织边界
    - 动态重组：支持部门架构的动态调整
    - 历史版本：完整记录部门架构变更
    - 性能优化：路径缓存和索引优化
    - 业务逻辑：支持复杂的部门业务关系
    """
    __tablename__ = "sys_department_hierarchy"

    # 层级关系记录唯一标识
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, 
               comment="部门层级关系记录ID")
    
    # 多租户支持
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True, 
                      comment="所属租户ID，用于多租户数据隔离")
    
    # 层级关系实体ID（移除外键约束）
    parent_dept_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="父部门ID")
    child_dept_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="子部门ID")
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="所属组织ID")
    
    # 层级关系属性
    relationship_type = Column(String(50), nullable=False, default="subdivision", index=True,
                             comment="关系类型（subdivision/team/project_group/matrix等）")
    level_depth = Column(Integer, nullable=False, default=1, comment="层级深度（1为直接子部门）")
    sort_order = Column(Integer, default=0, nullable=False, comment="同级排序顺序")
    
    # 路径缓存（优化查询性能）
    path = Column(String(2000), nullable=False, index=True, comment="完整部门路径缓存")
    
    # 关系状态管理
    is_active = Column(Boolean, default=True, nullable=False, comment="关系是否有效")
    
    # 关系有效期管理
    effective_from = Column(DateTime(timezone=True), nullable=True, comment="关系生效时间")
    effective_until = Column(DateTime(timezone=True), nullable=True, comment="关系失效时间")
    
    # 扩展信息（JSON存储）
    attributes = Column(JSON, nullable=True, comment="""层级关系扩展属性，包含：
    {
        "functional_relationship": "functional/administrative/dotted",
        "budget_responsibility": "shared/independent/inherited",
        "decision_authority": "描述决策权限",
        "custom_fields": {"自定义字段": "值"}
    }""")
    
    # 关系审计信息
    created_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="创建者用户ID")
    
    # 时间戳字段
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="关系创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="关系最后更新时间")
    
    # 数据库约束和索引
    __table_args__ = (
        UniqueConstraint('tenant_id', 'parent_dept_id', 'child_dept_id', name='uq_dept_hierarchy'),
        Index('ix_dept_children', 'tenant_id', 'parent_dept_id', 'is_active'),
        Index('ix_dept_parents', 'tenant_id', 'child_dept_id', 'is_active'),
        Index('ix_dept_hierarchy_path', 'tenant_id', 'path'),
        Index('ix_dept_org_hierarchy', 'tenant_id', 'organization_id', 'is_active'),
        {"comment": "部门层级关系表 - 支持复杂的部门架构和跨组织部门管理"},
    )