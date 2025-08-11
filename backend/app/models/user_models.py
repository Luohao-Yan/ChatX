from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from enum import Enum as PyEnum

class ThirdPartyProvider(str, PyEnum):
    LOCAL = "local"
    OAUTH2 = "oauth2" 
    LDAP = "ldap"
    SAML = "saml"
    WECHAT = "wechat"
    DINGTALK = "dingtalk"
    FEISHU = "feishu"

class User(Base):
    __tablename__ = "sys_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # 第三方用户可为空
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    avatar_url = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # 第三方对接字段
    third_party_provider = Column(String(50), default=ThirdPartyProvider.LOCAL, nullable=False)
    third_party_id = Column(String(255), nullable=True, index=True)  # 第三方用户ID
    third_party_data = Column(JSON, nullable=True)  # 第三方用户数据
    
    # 组织相关
    org_id = Column(Integer, ForeignKey("sys_organizations.id"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("sys_departments.id"), nullable=True, index=True)
    position = Column(String(100), nullable=True)  # 职位
    employee_id = Column(String(50), nullable=True, index=True)  # 工号
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # 关系
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "sys_user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False)
    refresh_token = Column(String, unique=True, index=True, nullable=False)
    device_info = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关联用户
    user = relationship("User", back_populates="sessions")

class UserVerification(Base):
    __tablename__ = "sys_user_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False)
    verification_type = Column(String, nullable=False)  # email, phone, password_reset
    verification_code = Column(String, nullable=False)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关联用户
    user = relationship("User")