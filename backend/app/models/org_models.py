"""组织架构相关的数据库模型

包含:
- UserStatus: 用户状态枚举（在组织模型中使用）
- Organization: 组织机构模型
- Department: 部门模型
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.database import Base

__all__ = ['Organization', 'Department']

class Organization(Base):
    """组织机构模型
    
    管理企业组织架构，支持多级组织层次和第三方系统集成。
    每个组织属于特定租户，可以包含子组织和部门。
    
    主要特性:
    - 多租户隔离：每个组织属于特定租户
    - 层级结构：支持无限层级的组织架构
    - 第三方集成：支持与LDAP、AD等企业系统同步
    - 软删除：支持组织的回收站功能
    - 联系信息：完整的组织联系方式管理
    """
    __tablename__ = "sys_organizations"

    # 组织唯一标识ID
    id = Column(Integer, primary_key=True, index=True, comment="组织机构唯一标识ID")
    
    # 多租户支持
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True,
                      comment="所属租户ID，用于多租户数据隔离")
    
    # 组织基本信息
    name = Column(String(255), nullable=False, index=True, comment="组织名称")
    code = Column(String(50), index=True, nullable=False, comment="组织编码，同租户内唯一")
    description = Column(Text, nullable=True, comment="组织描述信息")
    logo_url = Column(String(500), nullable=True, comment="组织Logo图片URL")
    
    # 组织联系信息
    address = Column(String(500), nullable=True, comment="组织地址")
    phone = Column(String(20), nullable=True, comment="联系电话")
    email = Column(String(100), nullable=True, comment="联系邮箱")
    website = Column(String(200), nullable=True, comment="官方网站")
    
    # 组织层级关系
    parent_id = Column(Integer, ForeignKey("sys_organizations.id"), nullable=True, index=True,
                      comment="父组织ID（null表示顶级组织）")
    path = Column(String(1000), nullable=False, index=True, comment="组织完整路径（/org1/org2/org3）")
    level = Column(Integer, default=0, nullable=False, comment="组织层级深度（0为顶级）")
    sort_order = Column(Integer, default=0, nullable=False, comment="同级组织排序顺序")
    
    # 第三方系统集成字段
    third_party_provider = Column(String(50), nullable=True, comment="第三方系统提供商（LDAP/AD等）")
    third_party_id = Column(String(255), nullable=True, index=True, comment="第三方系统中的组织ID")
    third_party_data = Column(JSON, nullable=True, comment="第三方系统返回的扩展数据（JSON格式）")
    sync_enabled = Column(Boolean, default=False, nullable=False, comment="是否启用与第三方系统同步")
    last_sync_at = Column(DateTime(timezone=True), nullable=True, comment="最后同步时间")
    
    # 组织状态管理
    is_active = Column(Boolean, default=True, nullable=False, comment="组织是否激活")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="组织创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="组织最后更新时间")
    
    # 软删除支持字段
    is_deleted = Column(Boolean, default=False, nullable=False, index=True, comment="是否已软删除")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(Integer, nullable=True, comment="执行删除操作的用户ID")
    
    # SQLAlchemy关系映射
    tenant = relationship("Tenant", back_populates="organizations")  # 所属租户对象
    parent = relationship("Organization", remote_side=[id], back_populates="children")  # 父组织对象
    children = relationship("Organization", back_populates="parent", cascade="all, delete-orphan")  # 子组织列表
    users = relationship("User", back_populates="organization")  # 组织内用户列表
    departments = relationship("Department", back_populates="organization", cascade="all, delete-orphan")  # 组织内部门列表
    # deleted_by_user 关系移除，避免循环依赖
    # 可以通过应用层查询获取相关用户信息

class Department(Base):
    """部门模型
    
    管理组织内部的部门结构，支持多级部门层次和第三方系统集成。
    每个部门属于特定组织，可以设置部门负责人和联系方式。
    
    主要特性:
    - 组织关联：每个部门属于特定组织
    - 层级结构：支持多级部门层次
    - 负责人管理：支持设置部门经理和负责人
    - 第三方集成：支持与企业HR系统同步
    - 软删除：支持部门的回收站功能
    """
    __tablename__ = "sys_departments"

    # 部门唯一标识ID
    id = Column(Integer, primary_key=True, index=True, comment="部门唯一标识ID")
    
    # 部门基本信息
    name = Column(String(255), nullable=False, index=True, comment="部门名称")
    code = Column(String(50), nullable=False, index=True, comment="部门编码，组织内唯一")
    description = Column(Text, nullable=True, comment="部门描述信息")
    
    # 部门组织关系
    org_id = Column(Integer, ForeignKey("sys_organizations.id"), nullable=False, index=True,
                   comment="所属组织ID")
    parent_id = Column(Integer, ForeignKey("sys_departments.id"), nullable=True, index=True,
                      comment="父部门ID（null表示顶级部门）")
    path = Column(String(1000), nullable=False, index=True, comment="部门完整路径（/dept1/dept2/dept3）")
    level = Column(Integer, default=0, nullable=False, comment="部门层级深度（0为顶级）")
    sort_order = Column(Integer, default=0, nullable=False, comment="同级部门排序顺序")
    
    # 部门负责人（不使用外键约束，避免循环依赖）
    manager_id = Column(Integer, nullable=True, index=True,
                       comment="部门经理/负责人用户ID")
    
    # 部门联系信息
    phone = Column(String(20), nullable=True, comment="部门联系电话")
    email = Column(String(100), nullable=True, comment="部门联系邮箱")
    address = Column(String(500), nullable=True, comment="部门办公地址")
    
    # 第三方系统集成字段
    third_party_provider = Column(String(50), nullable=True, comment="第三方系统提供商（HR系统等）")
    third_party_id = Column(String(255), nullable=True, index=True, comment="第三方系统中的部门ID")
    third_party_data = Column(JSON, nullable=True, comment="第三方系统返回的扩展数据（JSON格式）")
    sync_enabled = Column(Boolean, default=False, nullable=False, comment="是否启用与第三方系统同步")
    last_sync_at = Column(DateTime(timezone=True), nullable=True, comment="最后同步时间")
    
    # 部门状态管理
    is_active = Column(Boolean, default=True, nullable=False, comment="部门是否激活")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="部门创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="部门最后更新时间")
    
    # 软删除支持字段
    is_deleted = Column(Boolean, default=False, nullable=False, index=True, comment="是否已软删除")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(Integer, nullable=True, comment="执行删除操作的用户ID")
    
    # SQLAlchemy关系映射
    organization = relationship("Organization", back_populates="departments")  # 所属组织对象
    parent = relationship("Department", remote_side=[id], back_populates="children")  # 父部门对象
    children = relationship("Department", back_populates="parent", cascade="all, delete-orphan")  # 子部门列表
    users = relationship("User", back_populates="department")  # 部门内用户列表
    # manager 和 deleted_by_user 关系移除，避免循环依赖
    # 可以通过应用层查询获取相关用户信息