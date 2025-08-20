"""
用户管理相关的数据库模型。

包含:
- UserStatus: 用户状态枚举
- User: 用户主表模型，存储核心用户信息和认证信息。
- UserProfile: 用户资料扩展模型，存储用户的详细个人信息。
- UserActivity: 用户活动日志模型，记录用户的关键操作。
- LoginHistory: 用户登录历史模型，用于安全审计和分析。
- APIToken: API访问令牌模型，用于支持第三方应用集成。
"""

from enum import Enum
from typing import List

from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Integer, Index, JSON
)
from sqlalchemy.sql import func

from app.infrastructure.persistence.database import Base


class UserStatus(str, Enum):
    """用户状态枚举"""
    PENDING = "pending"    # 待激活或审核状态
    ACTIVE = "active"      # 正常激活状态
    INACTIVE = "inactive"  # 用户自行停用
    SUSPENDED = "suspended"# 被系统禁用
    DELETED = "deleted"    # 已被软删除


class UserType(str, Enum):
    """用户类型枚举"""
    INDIVIDUAL = "individual"  # 个人用户 - 通过登录页面注册
    ENTERPRISE = "enterprise"  # 企业用户 - 由管理员在管理平台创建，有组织部门
    SYSTEM = "system"         # 系统用户 - 系统管理员和租户管理员


class User(Base):
    """用户主表模型 - 仅存储核心认证信息"""
    __tablename__ = "sys_users"

    id = Column(String(50), primary_key=True, index=True, comment="用户唯一标识")
    username = Column(String(50), unique=True, index=True, nullable=False, comment="用户名")
    email = Column(String(255), unique=True, index=True, nullable=False, comment="电子邮箱")
    hashed_password = Column(String(255), nullable=False, comment="哈希密码")
    status = Column(String(20), default=UserStatus.PENDING, nullable=False, comment="用户状态")
    user_type = Column(String(20), default=UserType.INDIVIDUAL, nullable=False, comment="用户类型：individual个人用户，enterprise企业用户，system系统用户")
    is_superuser = Column(Boolean, default=False, nullable=False, comment="是否为超级管理员")
    is_staff = Column(Boolean, default=False, nullable=False, comment="是否为员工")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否激活")
    is_verified = Column(Boolean, default=False, nullable=False, comment="邮箱是否已验证")
    
    # 用户角色和权限 - 存储为JSON便于快速访问
    roles = Column(JSON, nullable=True, comment="用户角色列表（JSON格式存储）")
    permissions = Column(JSON, nullable=True, comment="用户权限列表（JSON格式存储）")
    
    # 租户关联 - 使用字符串字段而非外键
    current_tenant_id = Column(String(50), nullable=True, index=True, comment="当前活跃租户ID")
    tenant_ids = Column(JSON, nullable=True, comment="用户所属的所有租户ID列表")
    
    # 软删除支持
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(String(50), nullable=True, comment="删除者ID")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    last_login = Column(DateTime(timezone=True), nullable=True, comment="最后登录时间")

    # 不使用直接relationship，通过服务层获取关联数据
    
    # 数据库表注释
    __table_args__ = (
        {"comment": "用户主表，存储核心用户信息和认证数据"}
    )
    
    # 通过索引获取的数据，不使用直接relationship
    @property
    def tenant_list(self) -> List[str]:
        """获取用户的租户列表"""
        return self.tenant_ids or []
    
    @property
    def is_multi_tenant(self) -> bool:
        """是否为多租户用户"""
        return len(self.tenant_list) > 1
    
    @property
    def tenant_id(self) -> str:
        """获取当前活跃租户ID (向后兼容性)"""
        return self.current_tenant_id
    
    @property
    def role_list(self) -> List[str]:
        """获取用户角色列表"""
        return self.roles or []
    
    @property
    def permission_list(self) -> List[str]:
        """获取用户权限列表"""
        return self.permissions or []
    
    @property
    def is_deleted(self) -> bool:
        """检查用户是否已被软删除"""
        return self.deleted_at is not None
    
    @property
    def display_name(self) -> str:
        """获取用户显示名称（默认使用用户名，详细信息需要从UserProfile获取）"""
        return self.username


class UserProfile(Base):
    """用户资料扩展模型 - 存储用户详细信息"""
    __tablename__ = "sys_user_profiles"

    id = Column(String(50), primary_key=True, index=True, comment="唯一标识")
    user_id = Column(String(50), unique=True, nullable=False, index=True, comment="关联的用户ID")
    
    # 基本信息
    nickname = Column(String(100), nullable=True, comment="用户昵称/显示名")
    full_name = Column(String(100), nullable=True, comment="真实姓名")
    phone = Column(String(20), nullable=True, comment="手机号码")
    avatar_url = Column(String(255), nullable=True, comment="头像URL")
    bio = Column(Text, nullable=True, comment="个人简介")
    
    # 扩展信息
    date_of_birth = Column(DateTime(timezone=True), nullable=True, comment="出生日期")
    gender = Column(String(10), nullable=True, comment="性别")
    country = Column(String(50), nullable=True, comment="国家")
    city = Column(String(50), nullable=True, comment="城市")
    address = Column(Text, nullable=True, comment="详细地址")
    
    # 偏好设置
    preferred_language = Column(String(10), default="zh-CN", comment="偏好语言")
    timezone = Column(String(50), default="Asia/Shanghai", comment="时区")
    theme = Column(String(20), default="auto", comment="主题偏好")
    notification_settings = Column(JSON, nullable=True, comment="通知设置")
    privacy_settings = Column(JSON, nullable=True, comment="隐私设置")
    
    # 社交信息
    urls = Column(JSON, nullable=True, comment="个人网站、社交媒体链接")
    
    # 其他设置
    settings = Column(JSON, nullable=True, comment="用户个性化设置")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")

    # 数据库表注释
    __table_args__ = (
        {"comment": "用户资料扩展表，存储用户的详细个人信息和偏好设置"}
    )


class UserActivity(Base):
    """用户活动日志模型 - 使用字符串ID避免外键依赖"""
    __tablename__ = "sys_user_activities"

    id = Column(String(50), primary_key=True, index=True, comment="唯一标识")
    user_id = Column(String(50), nullable=False, index=True, comment="活动主体用户ID")
    tenant_id = Column(String(50), nullable=True, index=True, comment="租户ID")
    action = Column(String(100), nullable=False, comment="活动类型")
    target_type = Column(String(50), nullable=True, comment="操作对象类型")
    target_id = Column(String(255), nullable=True, comment="操作对象ID")
    details = Column(JSON, nullable=True, comment="活动详情JSON")
    actor_id = Column(String(50), nullable=True, index=True, comment="操作者ID")
    ip_address = Column(String(45), nullable=True, comment="操作IP")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_user_activity_tenant_time', 'user_id', 'tenant_id', 'created_at'),
        Index('idx_user_activity_action', 'action', 'created_at'),
        {"comment": "用户活动日志表，记录用户的关键操作和行为"}
    )


class LoginHistory(Base):
    """用户登录历史模型 - 优化为日志表"""
    __tablename__ = "sys_login_history"

    id = Column(String(50), primary_key=True, index=True, comment="唯一标识")
    user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
    tenant_id = Column(String(50), nullable=True, index=True, comment="登录租户ID")
    session_id = Column(String(100), nullable=True, index=True, comment="会话ID")
    ip_address = Column(String(45), nullable=False, comment="登录IP地址")
    user_agent = Column(Text, nullable=True, comment="用户代理")
    device_info = Column(JSON, nullable=True, comment="设备信息")
    login_timestamp = Column(DateTime(timezone=True), server_default=func.now(), comment="登录时间")
    logout_timestamp = Column(DateTime(timezone=True), nullable=True, comment="登出时间")
    is_success = Column(Boolean, nullable=False, comment="是否登录成功")
    failure_reason = Column(String(255), nullable=True, comment="登录失败原因")
    login_method = Column(String(20), default='password', comment="登录方式")
    
    # 分区索引优化
    __table_args__ = (
        Index('idx_login_user_time', 'user_id', 'login_timestamp'),
        Index('idx_login_tenant_time', 'tenant_id', 'login_timestamp'),
        Index('idx_login_ip', 'ip_address', 'login_timestamp'),
        {"comment": "用户登录历史表，记录用户登录登出行为和安全审计信息"}
    )


class APIToken(Base):
    """API访问令牌模型 - 独立管理"""
    __tablename__ = "sys_api_tokens"

    id = Column(String(50), primary_key=True, index=True, comment="唯一标识")
    user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
    tenant_id = Column(String(50), nullable=True, index=True, comment="租户ID")
    token_name = Column(String(100), nullable=False, comment="令牌名称")
    token_key = Column(String(255), nullable=False, unique=True, index=True, comment="令牌哈希值")
    token_prefix = Column(String(10), nullable=False, unique=True, comment="令牌前缀")
    scopes = Column(JSON, nullable=True, comment="令牌权限范围")
    rate_limit = Column(Integer, default=1000, comment="速率限制")
    expires_at = Column(DateTime(timezone=True), nullable=True, comment="过期时间")
    last_used = Column(DateTime(timezone=True), nullable=True, comment="最后使用时间")
    usage_count = Column(Integer, default=0, comment="使用次数")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否激活")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    # 索引优化
    __table_args__ = (
        Index('idx_token_user_tenant', 'user_id', 'tenant_id'),
        Index('idx_token_prefix', 'token_prefix'),
        Index('idx_token_active', 'is_active', 'expires_at'),
        {"comment": "API访问令牌表，管理第三方应用和API的访问凭证"}
    )


class UserSession(Base):
    """用户会话模型 - 管理用户登录会话"""
    __tablename__ = "sys_user_sessions"

    id = Column(String(50), primary_key=True, index=True, comment="会话唯一标识")
    user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
    session_token = Column(String(500), nullable=False, unique=True, index=True, comment="会话令牌")
    refresh_token = Column(String(500), nullable=True, unique=True, index=True, comment="刷新令牌")
    device_info = Column(String(500), nullable=True, comment="设备信息")
    device_id = Column(String(100), nullable=True, comment="设备标识")
    ip_address = Column(String(45), nullable=False, comment="登录IP地址")
    user_agent = Column(Text, nullable=True, comment="用户代理")
    expires_at = Column(DateTime(timezone=True), nullable=False, comment="会话过期时间")
    last_used = Column(DateTime(timezone=True), server_default=func.now(), comment="最后使用时间")
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), comment="最后活动时间")
    is_active = Column(Boolean, default=True, nullable=False, comment="会话是否活跃")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    # 索引优化
    __table_args__ = (
        Index('idx_session_user_active', 'user_id', 'is_active'),
        Index('idx_session_token', 'session_token'),
        Index('idx_session_expires', 'expires_at'),
        {"comment": "用户会话表，管理用户登录会话和状态"}
    )


class UserVerification(Base):
    """用户验证模型 - 管理邮箱验证和密码重置"""
    __tablename__ = "sys_user_verifications"

    id = Column(String(50), primary_key=True, index=True, comment="唯一标识")
    user_id = Column(String(50), nullable=True, index=True, comment="用户ID")
    email = Column(String(255), nullable=False, index=True, comment="验证邮箱")
    verification_type = Column(String(20), nullable=False, comment="验证类型（email_verify/password_reset）")
    verification_code = Column(String(100), nullable=False, unique=True, index=True, comment="验证码")
    expires_at = Column(DateTime(timezone=True), nullable=False, comment="验证码过期时间")
    used_at = Column(DateTime(timezone=True), nullable=True, comment="使用时间")
    is_used = Column(Boolean, default=False, nullable=False, comment="是否已使用")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    # 索引优化
    __table_args__ = (
        Index('idx_verification_email_type', 'email', 'verification_type'),
        Index('idx_verification_code', 'verification_code'),
        Index('idx_verification_expires', 'expires_at', 'is_used'),
        {"comment": "用户验证表，管理邮箱验证和密码重置验证码"}
    )