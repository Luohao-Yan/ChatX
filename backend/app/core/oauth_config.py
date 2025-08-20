"""
OAuth相关配置管理
集中管理OAuth提供商的配置信息和默认设置
"""

from typing import Dict, List, Optional
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings
from pydantic import Field
from enum import Enum


class OAuthProviderType(str, Enum):
    """OAuth提供商类型"""
    GITHUB = "github"
    GOOGLE = "google" 
    WECHAT = "wechat"
    MICROSOFT = "microsoft"


class GitHubOAuthConfig:
    """GitHub OAuth配置"""
    PROVIDER = OAuthProviderType.GITHUB
    AUTHORIZATION_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    USER_INFO_URL = "https://api.github.com/user"
    USER_EMAIL_URL = "https://api.github.com/user/emails"
    DEFAULT_SCOPES = ["user:email", "read:user"]


class GoogleOAuthConfig:
    """Google OAuth配置"""
    PROVIDER = OAuthProviderType.GOOGLE
    AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    DEFAULT_SCOPES = ["openid", "email", "profile"]


class WeChatOAuthConfig:
    """微信OAuth配置"""
    PROVIDER = OAuthProviderType.WECHAT
    AUTHORIZATION_URL = "https://open.weixin.qq.com/connect/qrconnect"
    TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token"
    USER_INFO_URL = "https://api.weixin.qq.com/sns/userinfo"
    DEFAULT_SCOPES = ["snsapi_login"]


class MicrosoftOAuthConfig:
    """Microsoft OAuth配置"""
    PROVIDER = OAuthProviderType.MICROSOFT
    AUTHORIZATION_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    USER_INFO_URL = "https://graph.microsoft.com/v1.0/me"
    DEFAULT_SCOPES = ["openid", "email", "profile", "User.Read"]


class OAuthSettings(BaseSettings):
    """OAuth系统配置"""
    
    # OAuth功能开关
    OAUTH_ENABLED: bool = Field(default=True, description="是否启用OAuth功能")
    
    # 状态令牌配置
    OAUTH_STATE_EXPIRE_MINUTES: int = Field(default=10, description="OAuth状态令牌过期时间（分钟）")
    OAUTH_STATE_SECRET_KEY: str = Field(default="", description="OAuth状态加密密钥")
    
    # Token加密配置
    OAUTH_TOKEN_ENCRYPT_KEY: str = Field(default="", description="OAuth令牌加密密钥")
    
    # 回调地址配置
    OAUTH_CALLBACK_BASE_URL: str = Field(default="http://localhost:3000", description="OAuth回调基础地址")
    
    # GitHub配置
    GITHUB_OAUTH_ENABLED: bool = Field(default=False, description="是否启用GitHub OAuth")
    GITHUB_CLIENT_ID: str = Field(default="", description="GitHub OAuth客户端ID")
    GITHUB_CLIENT_SECRET: str = Field(default="", description="GitHub OAuth客户端密钥")
    
    # Google配置
    GOOGLE_OAUTH_ENABLED: bool = Field(default=False, description="是否启用Google OAuth")
    GOOGLE_CLIENT_ID: str = Field(default="", description="Google OAuth客户端ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", description="Google OAuth客户端密钥")
    
    # 微信配置
    WECHAT_OAUTH_ENABLED: bool = Field(default=False, description="是否启用微信OAuth")
    WECHAT_APP_ID: str = Field(default="", description="微信OAuth应用ID")
    WECHAT_APP_SECRET: str = Field(default="", description="微信OAuth应用密钥")
    
    # Microsoft配置
    MICROSOFT_OAUTH_ENABLED: bool = Field(default=False, description="是否启用Microsoft OAuth")
    MICROSOFT_CLIENT_ID: str = Field(default="", description="Microsoft OAuth客户端ID")
    MICROSOFT_CLIENT_SECRET: str = Field(default="", description="Microsoft OAuth客户端密钥")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # 忽略额外的环境变量


# OAuth提供商配置映射
OAUTH_PROVIDER_CONFIGS = {
    OAuthProviderType.GITHUB: GitHubOAuthConfig,
    OAuthProviderType.GOOGLE: GoogleOAuthConfig,
    OAuthProviderType.WECHAT: WeChatOAuthConfig,
    OAuthProviderType.MICROSOFT: MicrosoftOAuthConfig,
}


def get_oauth_provider_config(provider: OAuthProviderType):
    """获取OAuth提供商配置"""
    return OAUTH_PROVIDER_CONFIGS.get(provider)


def get_enabled_oauth_providers(settings: OAuthSettings) -> List[OAuthProviderType]:
    """获取已启用的OAuth提供商列表"""
    enabled_providers = []
    
    if settings.GITHUB_OAUTH_ENABLED and settings.GITHUB_CLIENT_ID:
        enabled_providers.append(OAuthProviderType.GITHUB)
    
    if settings.GOOGLE_OAUTH_ENABLED and settings.GOOGLE_CLIENT_ID:
        enabled_providers.append(OAuthProviderType.GOOGLE)
    
    if settings.WECHAT_OAUTH_ENABLED and settings.WECHAT_APP_ID:
        enabled_providers.append(OAuthProviderType.WECHAT)
        
    if settings.MICROSOFT_OAUTH_ENABLED and settings.MICROSOFT_CLIENT_ID:
        enabled_providers.append(OAuthProviderType.MICROSOFT)
    
    return enabled_providers


# OAuth错误码定义
class OAuthErrorCode:
    """OAuth错误码"""
    INVALID_STATE = "INVALID_STATE"
    EXPIRED_STATE = "EXPIRED_STATE"
    INVALID_CODE = "INVALID_CODE"
    TOKEN_REQUEST_FAILED = "TOKEN_REQUEST_FAILED"
    USER_INFO_REQUEST_FAILED = "USER_INFO_REQUEST_FAILED"
    ACCOUNT_BINDING_FAILED = "ACCOUNT_BINDING_FAILED"
    USER_CREATION_FAILED = "USER_CREATION_FAILED"
    PROVIDER_NOT_ENABLED = "PROVIDER_NOT_ENABLED"
    PROVIDER_CONFIG_MISSING = "PROVIDER_CONFIG_MISSING"


# OAuth用户信息标准化接口
class OAuthUserInfo:
    """OAuth用户信息标准化接口"""
    
    def __init__(self, 
                 provider: str,
                 provider_id: str,
                 email: Optional[str] = None,
                 name: Optional[str] = None,
                 avatar_url: Optional[str] = None,
                 raw_data: Optional[dict] = None):
        self.provider = provider
        self.provider_id = provider_id
        self.email = email
        self.name = name
        self.avatar_url = avatar_url
        self.raw_data = raw_data or {}
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "provider": self.provider,
            "provider_id": self.provider_id,
            "email": self.email,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "raw_data": self.raw_data
        }