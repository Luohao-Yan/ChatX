"""
Google OAuth客户端实现
实现Google OAuth 2.0授权流程
"""

from typing import Dict, Any
from app.core.oauth_config import GoogleOAuthConfig, OAuthUserInfo
from app.infrastructure.clients.oauth_client_base import OAuthClientBase


class GoogleOAuthClient(OAuthClientBase):
    """Google OAuth客户端"""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        super().__init__(client_id, client_secret, redirect_uri)
    
    @property
    def provider_name(self) -> str:
        return GoogleOAuthConfig.PROVIDER.value
    
    @property
    def authorization_url(self) -> str:
        return GoogleOAuthConfig.AUTHORIZATION_URL
    
    @property
    def token_url(self) -> str:
        return GoogleOAuthConfig.TOKEN_URL
    
    @property
    def user_info_url(self) -> str:
        return GoogleOAuthConfig.USER_INFO_URL
    
    @property
    def default_scopes(self) -> list:
        return GoogleOAuthConfig.DEFAULT_SCOPES.copy()
    
    def get_additional_auth_params(self) -> Dict[str, str]:
        """Google OAuth的额外授权参数"""
        return {
            'access_type': 'offline',  # 获取refresh_token
            'prompt': 'consent'        # 强制显示授权页面
        }
    
    def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """解析Google用户信息"""
        # Google用户ID
        provider_id = str(user_data.get("id", ""))
        
        # 基本信息
        name = user_data.get("name", "")
        email = user_data.get("email", "")
        avatar_url = user_data.get("picture")
        
        return OAuthUserInfo(
            provider=self.provider_name,
            provider_id=provider_id,
            email=email,
            name=name,
            avatar_url=avatar_url,
            raw_data=user_data
        )