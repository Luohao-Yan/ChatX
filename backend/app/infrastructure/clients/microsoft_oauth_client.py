"""
Microsoft OAuth客户端实现
实现Microsoft OAuth 2.0授权流程
"""

from typing import Dict, Any
from app.core.oauth_config import MicrosoftOAuthConfig, OAuthUserInfo
from app.infrastructure.clients.oauth_client_base import OAuthClientBase


class MicrosoftOAuthClient(OAuthClientBase):
    """Microsoft OAuth客户端"""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        super().__init__(client_id, client_secret, redirect_uri)
    
    @property
    def provider_name(self) -> str:
        return MicrosoftOAuthConfig.PROVIDER.value
    
    @property
    def authorization_url(self) -> str:
        return MicrosoftOAuthConfig.AUTHORIZATION_URL
    
    @property
    def token_url(self) -> str:
        return MicrosoftOAuthConfig.TOKEN_URL
    
    @property
    def user_info_url(self) -> str:
        return MicrosoftOAuthConfig.USER_INFO_URL
    
    @property
    def default_scopes(self) -> list:
        return MicrosoftOAuthConfig.DEFAULT_SCOPES.copy()
    
    def get_additional_auth_params(self) -> Dict[str, str]:
        """Microsoft OAuth的额外授权参数"""
        return {
            'response_mode': 'query',
            'prompt': 'consent'
        }
    
    def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """解析Microsoft用户信息"""
        # Microsoft用户ID
        provider_id = str(user_data.get("id", ""))
        
        # 基本信息
        name = user_data.get("displayName") or user_data.get("userPrincipalName", "")
        email = user_data.get("mail") or user_data.get("userPrincipalName", "")
        
        # Microsoft Graph API不直接提供头像URL，需要单独获取
        avatar_url = None
        
        return OAuthUserInfo(
            provider=self.provider_name,
            provider_id=provider_id,
            email=email,
            name=name,
            avatar_url=avatar_url,
            raw_data=user_data
        )
    
    async def get_user_photo(self, access_token: str) -> str:
        """获取用户头像"""
        try:
            headers = self.get_user_info_headers(access_token)
            response = await self.http_client.get(
                "https://graph.microsoft.com/v1.0/me/photo/$value",
                headers=headers
            )
            
            if response.status_code == 200:
                # 返回头像的直接链接或base64数据
                return "data:image/jpeg;base64," + response.content.hex()
            
        except Exception:
            # 获取头像失败时返回None
            pass
        
        return None