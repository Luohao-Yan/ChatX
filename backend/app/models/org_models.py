from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Organization(Base):
    __tablename__ = "sys_organizations"

    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # 组织编码
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    
    # 联系信息
    address = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    website = Column(String(200), nullable=True)
    
    # 层级关系
    parent_id = Column(Integer, ForeignKey("sys_organizations.id"), nullable=True, index=True)
    path = Column(String(1000), nullable=False, index=True)  # 完整路径
    level = Column(Integer, default=0, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    
    # 第三方对接字段
    third_party_provider = Column(String(50), nullable=True)
    third_party_id = Column(String(255), nullable=True, index=True)
    third_party_data = Column(JSON, nullable=True)
    sync_enabled = Column(Boolean, default=False, nullable=False)  # 是否启用同步
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    
    # 状态
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    parent = relationship("Organization", remote_side=[id], back_populates="children")
    children = relationship("Organization", back_populates="parent", cascade="all, delete-orphan")
    users = relationship("User", back_populates="organization")
    departments = relationship("Department", back_populates="organization", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "sys_departments"

    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)  # 部门编码
    description = Column(Text, nullable=True)
    
    # 组织关系
    org_id = Column(Integer, ForeignKey("sys_organizations.id"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("sys_departments.id"), nullable=True, index=True)
    path = Column(String(1000), nullable=False, index=True)
    level = Column(Integer, default=0, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    
    # 负责人
    manager_id = Column(Integer, ForeignKey("sys_users.id"), nullable=True, index=True)
    
    # 联系信息
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(String(500), nullable=True)
    
    # 第三方对接字段
    third_party_provider = Column(String(50), nullable=True)
    third_party_id = Column(String(255), nullable=True, index=True)
    third_party_data = Column(JSON, nullable=True)
    sync_enabled = Column(Boolean, default=False, nullable=False)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    
    # 状态
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    organization = relationship("Organization", back_populates="departments")
    parent = relationship("Department", remote_side=[id], back_populates="children")
    children = relationship("Department", back_populates="parent", cascade="all, delete-orphan")
    users = relationship("User", back_populates="department")
    manager = relationship("User", foreign_keys=[manager_id])