"""
OAuth客户端工厂
用于根据配置创建不同的OAuth客户端实例
"""

from typing import Optional
from app.core.oauth_config import OAuthProviderType, OAuthSettings
from app.infrastructure.clients.oauth_client_base import OAuthClientBase
from app.infrastructure.clients.github_oauth_client import GitHubOAuthClient
from app.infrastructure.clients.google_oauth_client import GoogleOAuthClient
from app.infrastructure.clients.wechat_oauth_client import WeChatOAuthClient
from app.infrastructure.clients.microsoft_oauth_client import MicrosoftOAuthClient


class OAuthClientFactory:
    """OAuth客户端工厂类"""
    
    def __init__(self, settings: OAuthSettings):
        self.settings = settings
    
    def create_github_client(self, redirect_uri: str) -> Optional[GitHubOAuthClient]:
        """创建GitHub OAuth客户端"""
        if not self.settings.GITHUB_OAUTH_ENABLED:
            return None
        
        if not self.settings.GITHUB_CLIENT_ID or not self.settings.GITHUB_CLIENT_SECRET:
            raise ValueError("GitHub OAuth配置不完整")
        
        return GitHubOAuthClient(
            client_id=self.settings.GITHUB_CLIENT_ID,
            client_secret=self.settings.GITHUB_CLIENT_SECRET,
            redirect_uri=redirect_uri
        )
    
    def create_google_client(self, redirect_uri: str) -> Optional[GoogleOAuthClient]:
        """创建Google OAuth客户端"""
        if not self.settings.GOOGLE_OAUTH_ENABLED:
            return None
        
        if not self.settings.GOOGLE_CLIENT_ID or not self.settings.GOOGLE_CLIENT_SECRET:
            raise ValueError("Google OAuth配置不完整")
        
        return GoogleOAuthClient(
            client_id=self.settings.GOOGLE_CLIENT_ID,
            client_secret=self.settings.GOOGLE_CLIENT_SECRET,
            redirect_uri=redirect_uri
        )
    
    def create_wechat_client(self, redirect_uri: str) -> Optional[WeChatOAuthClient]:
        """创建微信OAuth客户端"""
        if not self.settings.WECHAT_OAUTH_ENABLED:
            return None
        
        if not self.settings.WECHAT_APP_ID or not self.settings.WECHAT_APP_SECRET:
            raise ValueError("微信OAuth配置不完整")
        
        return WeChatOAuthClient(
            app_id=self.settings.WECHAT_APP_ID,
            app_secret=self.settings.WECHAT_APP_SECRET,
            redirect_uri=redirect_uri
        )
    
    def create_microsoft_client(self, redirect_uri: str) -> Optional[MicrosoftOAuthClient]:
        """创建Microsoft OAuth客户端"""
        if not self.settings.MICROSOFT_OAUTH_ENABLED:
            return None
        
        if not self.settings.MICROSOFT_CLIENT_ID or not self.settings.MICROSOFT_CLIENT_SECRET:
            raise ValueError("Microsoft OAuth配置不完整")
        
        return MicrosoftOAuthClient(
            client_id=self.settings.MICROSOFT_CLIENT_ID,
            client_secret=self.settings.MICROSOFT_CLIENT_SECRET,
            redirect_uri=redirect_uri
        )
    
    def create_client(self, provider: OAuthProviderType, redirect_uri: str) -> Optional[OAuthClientBase]:
        """根据提供商类型创建OAuth客户端"""
        if provider == OAuthProviderType.GITHUB:
            return self.create_github_client(redirect_uri)
        elif provider == OAuthProviderType.GOOGLE:
            return self.create_google_client(redirect_uri)
        elif provider == OAuthProviderType.WECHAT:
            return self.create_wechat_client(redirect_uri)
        elif provider == OAuthProviderType.MICROSOFT:
            return self.create_microsoft_client(redirect_uri)
        else:
            raise ValueError(f"不支持的OAuth提供商: {provider}")
    
    def get_enabled_providers(self) -> list[OAuthProviderType]:
        """获取已启用的OAuth提供商列表"""
        enabled_providers = []
        
        if self.settings.GITHUB_OAUTH_ENABLED and self.settings.GITHUB_CLIENT_ID:
            enabled_providers.append(OAuthProviderType.GITHUB)
        
        if self.settings.GOOGLE_OAUTH_ENABLED and self.settings.GOOGLE_CLIENT_ID:
            enabled_providers.append(OAuthProviderType.GOOGLE)
        
        if self.settings.WECHAT_OAUTH_ENABLED and self.settings.WECHAT_APP_ID:
            enabled_providers.append(OAuthProviderType.WECHAT)
        
        if self.settings.MICROSOFT_OAUTH_ENABLED and self.settings.MICROSOFT_CLIENT_ID:
            enabled_providers.append(OAuthProviderType.MICROSOFT)
        
        return enabled_providers