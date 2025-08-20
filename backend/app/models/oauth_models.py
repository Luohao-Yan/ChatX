"""
OAuth第三方登录相关数据模型
用于存储第三方账号绑定、OAuth应用配置等信息
"""

from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, Index, JSON
from sqlalchemy.sql import func
from enum import Enum

from app.infrastructure.persistence.database import Base


class OAuthProvider(str, Enum):
    """OAuth提供商枚举"""
    GITHUB = "github"
    GOOGLE = "google"
    WECHAT = "wechat"
    MICROSOFT = "microsoft"


class OAuthProviderConfig(Base):
    """OAuth提供商配置表"""
    __tablename__ = "sys_oauth_provider_configs"
    
    id = Column(String(50), primary_key=True, index=True, comment="配置ID")
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    provider = Column(String(20), nullable=False, comment="OAuth提供商")
    is_enabled = Column(Boolean, default=True, nullable=False, comment="是否启用")
    
    # OAuth应用配置
    client_id = Column(String(500), nullable=False, comment="OAuth客户端ID")
    client_secret = Column(Text, nullable=False, comment="OAuth客户端密钥")
    redirect_uri = Column(String(500), nullable=False, comment="回调地址")
    scopes = Column(JSON, nullable=True, comment="权限范围")
    
    # 配置信息
    config_data = Column(JSON, nullable=True, comment="扩展配置数据")
    
    # 元数据
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    created_by = Column(String(50), nullable=True, comment="创建者ID")
    
    __table_args__ = (
        Index('idx_oauth_config_tenant_provider', 'tenant_id', 'provider', unique=True),
        {"comment": "OAuth提供商配置表，存储各租户的OAuth应用配置信息"}
    )


class OAuthAccount(Base):
    """第三方账号绑定表"""
    __tablename__ = "sys_oauth_accounts"
    
    id = Column(String(50), primary_key=True, index=True, comment="绑定记录ID")
    user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
    provider = Column(String(20), nullable=False, comment="OAuth提供商")
    provider_account_id = Column(String(100), nullable=False, comment="第三方账号ID")
    provider_account_email = Column(String(255), nullable=True, comment="第三方账号邮箱")
    
    # 第三方账号信息
    display_name = Column(String(100), nullable=True, comment="显示名称")
    avatar_url = Column(String(500), nullable=True, comment="头像地址")
    profile_data = Column(JSON, nullable=True, comment="第三方资料数据")
    
    # Token信息（加密存储）
    access_token = Column(Text, nullable=True, comment="访问令牌（加密）")
    refresh_token = Column(Text, nullable=True, comment="刷新令牌（加密）")
    token_expires_at = Column(DateTime(timezone=True), nullable=True, comment="令牌过期时间")
    
    # 绑定状态
    is_active = Column(Boolean, default=True, nullable=False, comment="是否激活")
    is_primary = Column(Boolean, default=False, nullable=False, comment="是否为主绑定账号")
    
    # 元数据
    first_login_at = Column(DateTime(timezone=True), server_default=func.now(), comment="首次登录时间")
    last_login_at = Column(DateTime(timezone=True), server_default=func.now(), comment="最后登录时间")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    __table_args__ = (
        Index('idx_oauth_account_user', 'user_id'),
        Index('idx_oauth_account_provider_id', 'provider', 'provider_account_id', unique=True),
        Index('idx_oauth_account_provider_email', 'provider', 'provider_account_email'),
        {"comment": "第三方账号绑定表，存储用户与第三方OAuth账号的绑定关系"}
    )


class OAuthLoginLog(Base):
    """OAuth登录日志表"""
    __tablename__ = "sys_oauth_login_logs"
    
    id = Column(String(50), primary_key=True, index=True, comment="日志ID")
    user_id = Column(String(50), nullable=True, index=True, comment="用户ID")
    provider = Column(String(20), nullable=False, comment="OAuth提供商")
    provider_account_id = Column(String(100), nullable=True, comment="第三方账号ID")
    
    # 登录信息
    login_result = Column(String(20), nullable=False, comment="登录结果：success/failed/error")
    error_code = Column(String(50), nullable=True, comment="错误码")
    error_message = Column(Text, nullable=True, comment="错误信息")
    
    # 请求信息
    client_ip = Column(String(45), nullable=True, comment="客户端IP")
    user_agent = Column(Text, nullable=True, comment="用户代理")
    request_id = Column(String(50), nullable=True, comment="请求ID")
    
    # 元数据
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    __table_args__ = (
        Index('idx_oauth_log_user', 'user_id'),
        Index('idx_oauth_log_provider', 'provider'),
        Index('idx_oauth_log_time', 'created_at'),
        {"comment": "OAuth登录日志表，记录第三方登录的详细日志信息"}
    )


class OAuthState(Base):
    """OAuth状态管理表（防CSRF攻击）"""
    __tablename__ = "sys_oauth_states"
    
    id = Column(String(50), primary_key=True, index=True, comment="状态ID")
    state_token = Column(String(255), nullable=False, unique=True, comment="状态令牌")
    provider = Column(String(20), nullable=False, comment="OAuth提供商")
    
    # 状态信息
    redirect_url = Column(String(500), nullable=True, comment="登录成功后跳转地址")
    client_ip = Column(String(45), nullable=True, comment="客户端IP")
    user_agent = Column(String(500), nullable=True, comment="用户代理")
    
    # 过期控制
    expires_at = Column(DateTime(timezone=True), nullable=False, comment="过期时间")
    is_used = Column(Boolean, default=False, nullable=False, comment="是否已使用")
    
    # 元数据
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    __table_args__ = (
        Index('idx_oauth_state_token', 'state_token'),
        Index('idx_oauth_state_expires', 'expires_at'),
        {"comment": "OAuth状态管理表，用于防范CSRF攻击和状态跟踪"}
    )