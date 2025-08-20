"""
微信OAuth客户端实现
实现微信OAuth 2.0授权流程
"""

from typing import Dict, Any
from urllib.parse import urlencode
from app.core.oauth_config import WeChatOAuthConfig, OAuthUserInfo
from app.infrastructure.clients.oauth_client_base import OAuthClientBase


class WeChatOAuthClient(OAuthClientBase):
    """微信OAuth客户端"""
    
    def __init__(self, app_id: str, app_secret: str, redirect_uri: str):
        # 微信使用app_id和app_secret而不是client_id和client_secret
        super().__init__(app_id, app_secret, redirect_uri)
        self.app_id = app_id
        self.app_secret = app_secret
    
    @property
    def provider_name(self) -> str:
        return WeChatOAuthConfig.PROVIDER.value
    
    @property
    def authorization_url(self) -> str:
        return WeChatOAuthConfig.AUTHORIZATION_URL
    
    @property
    def token_url(self) -> str:
        return WeChatOAuthConfig.TOKEN_URL
    
    @property
    def user_info_url(self) -> str:
        return WeChatOAuthConfig.USER_INFO_URL
    
    @property
    def default_scopes(self) -> list:
        return WeChatOAuthConfig.DEFAULT_SCOPES.copy()
    
    def generate_authorization_url(self, state: str, scopes=None) -> str:
        """生成微信授权地址（微信参数不同）"""
        if scopes is None:
            scopes = self.default_scopes
        
        params = {
            'appid': self.app_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'scope': ','.join(scopes),  # 微信用逗号分隔
            'state': state
        }
        
        return f"{self.authorization_url}?{urlencode(params)}#wechat_redirect"
    
    async def exchange_code_for_token(self, code: str, state: str) -> Dict[str, Any]:
        """微信获取访问令牌（参数不同）"""
        params = {
            'appid': self.app_id,
            'secret': self.app_secret,
            'code': code,
            'grant_type': 'authorization_code'
        }
        
        try:
            response = await self.http_client.get(
                self.token_url,
                params=params
            )
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            raise Exception(f"TOKEN_REQUEST_FAILED: {str(e)}")
    
    async def get_user_info(self, access_token: str, openid: str = None) -> OAuthUserInfo:
        """获取微信用户信息（需要openid）"""
        if not openid:
            # 从token响应中获取openid
            raise ValueError("微信获取用户信息需要openid参数")
        
        try:
            params = {
                'access_token': access_token,
                'openid': openid
            }
            
            response = await self.http_client.get(
                self.user_info_url,
                params=params
            )
            response.raise_for_status()
            
            user_data = response.json()
            return self.parse_user_info(user_data)
            
        except Exception as e:
            raise Exception(f"USER_INFO_REQUEST_FAILED: {str(e)}")
    
    def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """解析微信用户信息"""
        # 微信用户ID
        provider_id = user_data.get("openid", "")
        
        # 基本信息
        name = user_data.get("nickname", "")
        avatar_url = user_data.get("headimgurl")
        
        # 微信不提供邮箱，需要用户手动绑定
        email = None
        
        return OAuthUserInfo(
            provider=self.provider_name,
            provider_id=provider_id,
            email=email,
            name=name,
            avatar_url=avatar_url,
            raw_data=user_data
        )
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """刷新微信访问令牌"""
        params = {
            'appid': self.app_id,
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        }
        
        try:
            response = await self.http_client.get(
                self.token_url,
                params=params
            )
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            raise Exception(f"TOKEN_REQUEST_FAILED: {str(e)}")