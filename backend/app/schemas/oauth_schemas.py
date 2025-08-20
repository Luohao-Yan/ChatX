"""
OAuth相关的Pydantic模式定义
用于API请求和响应的数据验证
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class OAuthProviderResponse(BaseModel):
    """OAuth提供商响应模式"""
    name: str = Field(..., description="提供商标识")
    display_name: str = Field(..., description="提供商显示名称")


class OAuthProvidersResponse(BaseModel):
    """OAuth提供商列表响应"""
    providers: List[OAuthProviderResponse]
    enabled: bool = Field(..., description="OAuth功能是否启用")


class OAuthAuthorizationResponse(BaseModel):
    """OAuth授权地址响应"""
    authorization_url: str = Field(..., description="授权地址")
    state: str = Field(..., description="状态令牌")
    provider: str = Field(..., description="OAuth提供商")


class OAuthCallbackResponse(BaseModel):
    """OAuth回调响应"""
    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌") 
    token_type: str = Field(default="bearer", description="令牌类型")
    user: Dict[str, Any] = Field(..., description="用户信息")
    redirect_url: Optional[str] = Field(None, description="重定向地址")


class OAuthAccountResponse(BaseModel):
    """OAuth账号绑定响应"""
    id: str = Field(..., description="绑定记录ID")
    provider: str = Field(..., description="OAuth提供商")
    display_name: Optional[str] = Field(None, description="显示名称")
    avatar_url: Optional[str] = Field(None, description="头像地址")
    is_primary: bool = Field(..., description="是否为主绑定")
    created_at: datetime = Field(..., description="创建时间")

    class Config:
        from_attributes = True


class OAuthAccountsResponse(BaseModel):
    """OAuth账号列表响应"""
    accounts: List[OAuthAccountResponse]


class OAuthBindRequest(BaseModel):
    """OAuth绑定请求"""
    code: str = Field(..., description="授权码")
    state: str = Field(..., description="状态令牌")


class OAuthUnbindResponse(BaseModel):
    """OAuth解绑响应"""
    message: str = Field(..., description="操作结果消息")


class OAuthCleanupResponse(BaseModel):
    """OAuth清理响应"""
    message: str = Field(..., description="清理结果消息")


class OAuthErrorResponse(BaseModel):
    """OAuth错误响应"""
    error_code: str = Field(..., description="错误码")
    message: str = Field(..., description="错误消息")
    details: Optional[Dict[str, Any]] = Field(None, description="错误详情")


class OAuthProviderConfigCreate(BaseModel):
    """创建OAuth提供商配置"""
    provider: str = Field(..., description="OAuth提供商")
    client_id: str = Field(..., description="客户端ID")
    client_secret: str = Field(..., description="客户端密钥")
    redirect_uri: str = Field(..., description="回调地址")
    scopes: Optional[List[str]] = Field(None, description="权限范围")
    config_data: Optional[Dict[str, Any]] = Field(None, description="扩展配置")
    is_enabled: bool = Field(default=True, description="是否启用")


class OAuthProviderConfigUpdate(BaseModel):
    """更新OAuth提供商配置"""
    client_id: Optional[str] = Field(None, description="客户端ID")
    client_secret: Optional[str] = Field(None, description="客户端密钥")
    redirect_uri: Optional[str] = Field(None, description="回调地址")
    scopes: Optional[List[str]] = Field(None, description="权限范围")
    config_data: Optional[Dict[str, Any]] = Field(None, description="扩展配置")
    is_enabled: Optional[bool] = Field(None, description="是否启用")


class OAuthProviderConfigResponse(BaseModel):
    """OAuth提供商配置响应"""
    id: str = Field(..., description="配置ID")
    tenant_id: str = Field(..., description="租户ID")
    provider: str = Field(..., description="OAuth提供商")
    is_enabled: bool = Field(..., description="是否启用")
    client_id: str = Field(..., description="客户端ID")
    redirect_uri: str = Field(..., description="回调地址")
    scopes: Optional[List[str]] = Field(None, description="权限范围")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: Optional[datetime] = Field(None, description="更新时间")

    class Config:
        from_attributes = True


class OAuthStatsResponse(BaseModel):
    """OAuth统计响应"""
    provider_accounts: Dict[str, int] = Field(..., description="各提供商绑定数量")
    login_results: Dict[str, int] = Field(..., description="登录结果统计")
    total_active_accounts: int = Field(..., description="总活跃账号数")
    today_logins: int = Field(..., description="今日登录次数")


class OAuthProviderUsageStats(BaseModel):
    """OAuth提供商使用统计"""
    total_logins: int = Field(..., description="总登录次数")
    successful_logins: int = Field(..., description="成功登录次数")
    success_rate: float = Field(..., description="成功率")


class OAuthProviderUsageResponse(BaseModel):
    """OAuth提供商使用统计响应"""
    stats: Dict[str, OAuthProviderUsageStats] = Field(..., description="各提供商使用统计")