"""
GitHub OAuth客户端实现
实现GitHub OAuth 2.0授权流程
"""

from typing import Dict, Any, Optional
from app.core.oauth_config import GitHubOAuthConfig, OAuthUserInfo
from app.infrastructure.clients.oauth_client_base import OAuthClientBase


class GitHubOAuthClient(OAuthClientBase):
    """GitHub OAuth客户端"""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        super().__init__(client_id, client_secret, redirect_uri)
    
    @property
    def provider_name(self) -> str:
        return GitHubOAuthConfig.PROVIDER.value
    
    @property
    def authorization_url(self) -> str:
        return GitHubOAuthConfig.AUTHORIZATION_URL
    
    @property
    def token_url(self) -> str:
        return GitHubOAuthConfig.TOKEN_URL
    
    @property
    def user_info_url(self) -> str:
        return GitHubOAuthConfig.USER_INFO_URL
    
    @property
    def default_scopes(self) -> list:
        return GitHubOAuthConfig.DEFAULT_SCOPES.copy()
    
    def get_token_request_headers(self) -> Dict[str, str]:
        """GitHub需要特殊的Accept头"""
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    
    def get_user_info_headers(self, access_token: str) -> Dict[str, str]:
        """GitHub API需要特殊的Authorization头"""
        return {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ChatX-OAuth-Client'
        }
    
    async def get_user_emails(self, access_token: str) -> list:
        """获取用户邮箱列表"""
        try:
            headers = self.get_user_info_headers(access_token)
            response = await self.http_client.get(GitHubOAuthConfig.USER_EMAIL_URL, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            # 如果获取邮箱失败，返回空列表
            return []
    
    def parse_user_info(self, user_data: Dict[str, Any]) -> OAuthUserInfo:
        """解析GitHub用户信息"""
        # GitHub用户ID
        provider_id = str(user_data.get("id", ""))
        
        # 基本信息
        name = user_data.get("name") or user_data.get("login", "")
        email = user_data.get("email")  # 可能为空，需要单独获取
        avatar_url = user_data.get("avatar_url")
        
        return OAuthUserInfo(
            provider=self.provider_name,
            provider_id=provider_id,
            email=email,
            name=name,
            avatar_url=avatar_url,
            raw_data=user_data
        )
    
    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """获取GitHub用户信息（包含邮箱）"""
        # 先获取基本用户信息
        user_info = await super().get_user_info(access_token)
        
        # 如果基本信息中没有邮箱，尝试获取邮箱列表
        if not user_info.email:
            emails = await self.get_user_emails(access_token)
            if emails:
                # 优先获取primary和verified的邮箱
                primary_email = None
                verified_email = None
                
                for email_info in emails:
                    if email_info.get("primary") and email_info.get("verified"):
                        primary_email = email_info.get("email")
                        break
                    elif email_info.get("verified"):
                        verified_email = email_info.get("email")
                
                # 设置邮箱
                user_info.email = primary_email or verified_email or emails[0].get("email")
        
        return user_info