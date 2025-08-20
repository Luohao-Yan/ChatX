"""
OAuth客户端基类
定义OAuth客户端的通用接口和基础功能
"""

import httpx
import secrets
from abc import ABC, abstractmethod
from typing import Dict, Optional, Any
from urllib.parse import urlencode, parse_qs, urlparse

from app.core.oauth_config import OAuthUserInfo, OAuthErrorCode


class OAuthClientBase(ABC):
    """OAuth客户端基类"""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """提供商名称"""
        pass
    
    @property
    @abstractmethod
    def authorization_url(self) -> str:
        """授权地址"""
        pass
    
    @property
    @abstractmethod
    def token_url(self) -> str:
        """获取令牌地址"""
        pass
    
    @property
    @abstractmethod
    def user_info_url(self) -> str:
        """获取用户信息地址"""
        pass
    
    @property
    @abstractmethod
    def default_scopes(self) -> list:
        """默认权限范围"""
        pass
    
    def generate_authorization_url(self, state: str, scopes: Optional[list] = None) -> str:
        """生成授权地址"""
        if scopes is None:
            scopes = self.default_scopes
        
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': ' '.join(scopes),
            'state': state,
            'response_type': 'code'
        }
        
        # 子类可以覆盖这个方法来添加特定的参数
        params.update(self.get_additional_auth_params())
        
        return f"{self.authorization_url}?{urlencode(params)}"
    
    def get_additional_auth_params(self) -> Dict[str, str]:
        """获取额外的授权参数（子类可覆盖）"""
        return {}
    
    async def exchange_code_for_token(self, code: str, state: str) -> Dict[str, Any]:
        """通过授权码获取访问令牌"""
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code,
            'redirect_uri': self.redirect_uri,
            'grant_type': 'authorization_code'
        }
        
        # 子类可以覆盖这个方法来添加特定的参数
        data.update(self.get_additional_token_params())
        
        try:
            response = await self.http_client.post(
                self.token_url,
                data=data,
                headers=self.get_token_request_headers()
            )
            response.raise_for_status()
            
            # 解析响应
            if 'application/json' in response.headers.get('content-type', ''):
                token_data = response.json()
            else:
                # 某些提供商返回URL编码格式
                token_data = dict(parse_qs(response.text))
                # 处理列表值
                for key, value in token_data.items():
                    if isinstance(value, list) and len(value) == 1:
                        token_data[key] = value[0]
            
            return token_data
            
        except httpx.HTTPError as e:
            raise Exception(f"{OAuthErrorCode.TOKEN_REQUEST_FAILED}: {str(e)}")
    
    def get_additional_token_params(self) -> Dict[str, str]:
        """获取额外的令牌参数（子类可覆盖）"""
        return {}
    
    def get_token_request_headers(self) -> Dict[str, str]:
        """获取令牌请求头（子类可覆盖）"""
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    
    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """获取用户信息"""
        try:
            headers = self.get_user_info_headers(access_token)
            response = await self.http_client.get(self.user_info_url, headers=headers)
            response.raise_for_status()
            
            user_data = response.json()
            return self.parse_user_info(user_data)
            
        except httpx.HTTPError as e:
            raise Exception(f"{OAuthErrorCode.USER_INFO_REQUEST_FAILED}: {str(e)}")
    
    def get_user_info_headers(self, access_token: str) -> Dict[str, str]:
        """获取用户信息请求头（子类可覆盖）"""
        return {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
    
    @abstractmethod
    def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """解析用户信息（子类必须实现）"""
        pass
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """刷新访问令牌"""
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        }
        
        try:
            response = await self.http_client.post(
                self.token_url,
                data=data,
                headers=self.get_token_request_headers()
            )
            response.raise_for_status()
            
            if 'application/json' in response.headers.get('content-type', ''):
                return response.json()
            else:
                token_data = dict(parse_qs(response.text))
                for key, value in token_data.items():
                    if isinstance(value, list) and len(value) == 1:
                        token_data[key] = value[0]
                return token_data
                
        except httpx.HTTPError as e:
            raise Exception(f"{OAuthErrorCode.TOKEN_REQUEST_FAILED}: {str(e)}")
    
    def generate_state_token(self) -> str:
        """生成状态令牌"""
        return secrets.token_urlsafe(32)
    
    def validate_state_token(self, state: str) -> bool:
        """验证状态令牌格式"""
        return isinstance(state, str) and len(state) >= 16