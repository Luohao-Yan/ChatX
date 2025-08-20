"""
OAuth仓储接口定义
定义OAuth相关数据访问的抽象接口
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.models.oauth_models import OAuthProviderConfig, OAuthAccount, OAuthLoginLog, OAuthState


class OAuthRepositoryInterface(ABC):
    """OAuth仓储接口"""

    # OAuth提供商配置相关
    @abstractmethod
    async def get_provider_config(self, tenant_id: str, provider: str) -> Optional[OAuthProviderConfig]:
        """获取OAuth提供商配置"""
        pass

    @abstractmethod
    async def create_provider_config(self, config: OAuthProviderConfig) -> OAuthProviderConfig:
        """创建OAuth提供商配置"""
        pass

    @abstractmethod
    async def update_provider_config(self, config: OAuthProviderConfig) -> OAuthProviderConfig:
        """更新OAuth提供商配置"""
        pass

    @abstractmethod
    async def delete_provider_config(self, config_id: str) -> bool:
        """删除OAuth提供商配置"""
        pass

    @abstractmethod
    async def list_provider_configs(self, tenant_id: str, is_enabled: Optional[bool] = None) -> List[OAuthProviderConfig]:
        """获取租户的OAuth提供商配置列表"""
        pass

    # OAuth账号绑定相关
    @abstractmethod
    async def get_oauth_account(self, user_id: str, provider: str) -> Optional[OAuthAccount]:
        """获取用户的OAuth账号绑定"""
        pass

    @abstractmethod
    async def get_oauth_account_by_provider_id(self, provider: str, provider_account_id: str) -> Optional[OAuthAccount]:
        """通过第三方账号ID获取OAuth绑定"""
        pass

    @abstractmethod
    async def create_oauth_account(self, account: OAuthAccount) -> OAuthAccount:
        """创建OAuth账号绑定"""
        pass

    @abstractmethod
    async def update_oauth_account(self, account: OAuthAccount) -> OAuthAccount:
        """更新OAuth账号绑定"""
        pass

    @abstractmethod
    async def delete_oauth_account(self, account_id: str) -> bool:
        """删除OAuth账号绑定"""
        pass

    @abstractmethod
    async def list_user_oauth_accounts(self, user_id: str, is_active: Optional[bool] = None) -> List[OAuthAccount]:
        """获取用户的所有OAuth绑定"""
        pass

    @abstractmethod
    async def get_primary_oauth_account(self, user_id: str) -> Optional[OAuthAccount]:
        """获取用户的主OAuth绑定账号"""
        pass

    @abstractmethod
    async def set_primary_oauth_account(self, user_id: str, account_id: str) -> bool:
        """设置用户的主OAuth绑定账号"""
        pass

    # OAuth登录日志相关
    @abstractmethod
    async def create_login_log(self, log: OAuthLoginLog) -> OAuthLoginLog:
        """创建OAuth登录日志"""
        pass

    @abstractmethod
    async def get_login_logs(self, user_id: Optional[str] = None, 
                           provider: Optional[str] = None,
                           start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None,
                           limit: int = 100) -> List[OAuthLoginLog]:
        """获取OAuth登录日志"""
        pass

    # OAuth状态管理相关
    @abstractmethod
    async def create_oauth_state(self, state: OAuthState) -> OAuthState:
        """创建OAuth状态"""
        pass

    @abstractmethod
    async def get_oauth_state(self, state_token: str) -> Optional[OAuthState]:
        """获取OAuth状态"""
        pass

    @abstractmethod
    async def mark_state_used(self, state_token: str) -> bool:
        """标记OAuth状态为已使用"""
        pass

    @abstractmethod
    async def cleanup_expired_states(self, before_time: datetime) -> int:
        """清理过期的OAuth状态"""
        pass

    # 统计和分析相关
    @abstractmethod
    async def get_oauth_stats(self, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """获取OAuth统计信息"""
        pass

    @abstractmethod
    async def get_provider_usage_stats(self, tenant_id: Optional[str] = None, 
                                     start_date: Optional[datetime] = None,
                                     end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """获取OAuth提供商使用统计"""
        pass