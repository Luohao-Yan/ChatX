"""
OAuth客户端基础设施层模块
提供各种第三方OAuth提供商的客户端实现
"""

from .oauth_client_base import OAuthClientBase
from .github_oauth_client import GitHubOAuthClient
from .google_oauth_client import GoogleOAuthClient
from .wechat_oauth_client import WeChatOAuthClient
from .microsoft_oauth_client import MicrosoftOAuthClient
from .oauth_client_factory import OAuthClientFactory

__all__ = [
    "OAuthClientBase",
    "GitHubOAuthClient",
    "GoogleOAuthClient",
    "WeChatOAuthClient", 
    "MicrosoftOAuthClient",
    "OAuthClientFactory"
]