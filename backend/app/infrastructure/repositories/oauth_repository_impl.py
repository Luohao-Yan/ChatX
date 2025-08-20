"""
OAuth仓储实现
实现OAuth相关数据访问的具体逻辑
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from app.domain.repositories.oauth_repository import OAuthRepositoryInterface
from app.models.oauth_models import OAuthProviderConfig, OAuthAccount, OAuthLoginLog, OAuthState
from app.infrastructure.persistence.database import get_db_session


class OAuthRepositoryImpl(OAuthRepositoryInterface):
    """OAuth仓储实现类"""

    def __init__(self, db: Session):
        self.db = db

    # OAuth提供商配置相关
    async def get_provider_config(self, tenant_id: str, provider: str) -> Optional[OAuthProviderConfig]:
        """获取OAuth提供商配置"""
        return self.db.query(OAuthProviderConfig).filter(
            and_(
                OAuthProviderConfig.tenant_id == tenant_id,
                OAuthProviderConfig.provider == provider
            )
        ).first()

    async def create_provider_config(self, config: OAuthProviderConfig) -> OAuthProviderConfig:
        """创建OAuth提供商配置"""
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    async def update_provider_config(self, config: OAuthProviderConfig) -> OAuthProviderConfig:
        """更新OAuth提供商配置"""
        self.db.commit()
        self.db.refresh(config)
        return config

    async def delete_provider_config(self, config_id: str) -> bool:
        """删除OAuth提供商配置"""
        config = self.db.query(OAuthProviderConfig).filter(
            OAuthProviderConfig.id == config_id
        ).first()
        
        if config:
            self.db.delete(config)
            self.db.commit()
            return True
        return False

    async def list_provider_configs(self, tenant_id: str, is_enabled: Optional[bool] = None) -> List[OAuthProviderConfig]:
        """获取租户的OAuth提供商配置列表"""
        query = self.db.query(OAuthProviderConfig).filter(
            OAuthProviderConfig.tenant_id == tenant_id
        )
        
        if is_enabled is not None:
            query = query.filter(OAuthProviderConfig.is_enabled == is_enabled)
        
        return query.order_by(OAuthProviderConfig.created_at.desc()).all()

    # OAuth账号绑定相关
    async def get_oauth_account(self, user_id: str, provider: str) -> Optional[OAuthAccount]:
        """获取用户的OAuth账号绑定"""
        return self.db.query(OAuthAccount).filter(
            and_(
                OAuthAccount.user_id == user_id,
                OAuthAccount.provider == provider,
                OAuthAccount.is_active == True
            )
        ).first()

    async def get_oauth_account_by_provider_id(self, provider: str, provider_account_id: str) -> Optional[OAuthAccount]:
        """通过第三方账号ID获取OAuth绑定"""
        return self.db.query(OAuthAccount).filter(
            and_(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_account_id == provider_account_id,
                OAuthAccount.is_active == True
            )
        ).first()

    async def create_oauth_account(self, account: OAuthAccount) -> OAuthAccount:
        """创建OAuth账号绑定"""
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    async def update_oauth_account(self, account: OAuthAccount) -> OAuthAccount:
        """更新OAuth账号绑定"""
        self.db.commit()
        self.db.refresh(account)
        return account

    async def delete_oauth_account(self, account_id: str) -> bool:
        """删除OAuth账号绑定"""
        account = self.db.query(OAuthAccount).filter(
            OAuthAccount.id == account_id
        ).first()
        
        if account:
            self.db.delete(account)
            self.db.commit()
            return True
        return False

    async def list_user_oauth_accounts(self, user_id: str, is_active: Optional[bool] = None) -> List[OAuthAccount]:
        """获取用户的所有OAuth绑定"""
        query = self.db.query(OAuthAccount).filter(
            OAuthAccount.user_id == user_id
        )
        
        if is_active is not None:
            query = query.filter(OAuthAccount.is_active == is_active)
        
        return query.order_by(OAuthAccount.created_at.desc()).all()

    async def get_primary_oauth_account(self, user_id: str) -> Optional[OAuthAccount]:
        """获取用户的主OAuth绑定账号"""
        return self.db.query(OAuthAccount).filter(
            and_(
                OAuthAccount.user_id == user_id,
                OAuthAccount.is_primary == True,
                OAuthAccount.is_active == True
            )
        ).first()

    async def set_primary_oauth_account(self, user_id: str, account_id: str) -> bool:
        """设置用户的主OAuth绑定账号"""
        try:
            # 先将用户的所有绑定设置为非主绑定
            self.db.query(OAuthAccount).filter(
                OAuthAccount.user_id == user_id
            ).update({"is_primary": False})
            
            # 设置指定账号为主绑定
            result = self.db.query(OAuthAccount).filter(
                and_(
                    OAuthAccount.id == account_id,
                    OAuthAccount.user_id == user_id
                )
            ).update({"is_primary": True})
            
            self.db.commit()
            return result > 0
        except Exception:
            self.db.rollback()
            return False

    # OAuth登录日志相关
    async def create_login_log(self, log: OAuthLoginLog) -> OAuthLoginLog:
        """创建OAuth登录日志"""
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    async def get_login_logs(self, user_id: Optional[str] = None, 
                           provider: Optional[str] = None,
                           start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None,
                           limit: int = 100) -> List[OAuthLoginLog]:
        """获取OAuth登录日志"""
        query = self.db.query(OAuthLoginLog)
        
        if user_id:
            query = query.filter(OAuthLoginLog.user_id == user_id)
        
        if provider:
            query = query.filter(OAuthLoginLog.provider == provider)
        
        if start_time:
            query = query.filter(OAuthLoginLog.created_at >= start_time)
        
        if end_time:
            query = query.filter(OAuthLoginLog.created_at <= end_time)
        
        return query.order_by(desc(OAuthLoginLog.created_at)).limit(limit).all()

    # OAuth状态管理相关
    async def create_oauth_state(self, state: OAuthState) -> OAuthState:
        """创建OAuth状态"""
        self.db.add(state)
        self.db.commit()
        self.db.refresh(state)
        return state

    async def get_oauth_state(self, state_token: str) -> Optional[OAuthState]:
        """获取OAuth状态"""
        return self.db.query(OAuthState).filter(
            and_(
                OAuthState.state_token == state_token,
                OAuthState.is_used == False,
                OAuthState.expires_at > datetime.utcnow()
            )
        ).first()

    async def mark_state_used(self, state_token: str) -> bool:
        """标记OAuth状态为已使用"""
        result = self.db.query(OAuthState).filter(
            OAuthState.state_token == state_token
        ).update({"is_used": True})
        
        self.db.commit()
        return result > 0

    async def cleanup_expired_states(self, before_time: datetime) -> int:
        """清理过期的OAuth状态"""
        result = self.db.query(OAuthState).filter(
            or_(
                OAuthState.expires_at < before_time,
                OAuthState.is_used == True
            )
        ).delete()
        
        self.db.commit()
        return result

    # 统计和分析相关
    async def get_oauth_stats(self, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """获取OAuth统计信息"""
        stats = {}
        
        # 基础查询
        account_query = self.db.query(OAuthAccount)
        log_query = self.db.query(OAuthLoginLog)
        
        # 按提供商统计绑定数量
        provider_stats = self.db.query(
            OAuthAccount.provider,
            func.count(OAuthAccount.id).label('count')
        ).filter(
            OAuthAccount.is_active == True
        ).group_by(OAuthAccount.provider).all()
        
        stats['provider_accounts'] = {stat.provider: stat.count for stat in provider_stats}
        
        # 统计登录成功率
        login_stats = self.db.query(
            OAuthLoginLog.login_result,
            func.count(OAuthLoginLog.id).label('count')
        ).group_by(OAuthLoginLog.login_result).all()
        
        stats['login_results'] = {stat.login_result: stat.count for stat in login_stats}
        
        # 活跃账号数量
        stats['total_active_accounts'] = account_query.filter(
            OAuthAccount.is_active == True
        ).count()
        
        # 今日登录次数
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        stats['today_logins'] = log_query.filter(
            OAuthLoginLog.created_at >= today
        ).count()
        
        return stats

    async def get_provider_usage_stats(self, tenant_id: Optional[str] = None, 
                                     start_date: Optional[datetime] = None,
                                     end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """获取OAuth提供商使用统计"""
        query = self.db.query(
            OAuthLoginLog.provider,
            func.count(OAuthLoginLog.id).label('login_count'),
            func.sum(func.case([(OAuthLoginLog.login_result == 'success', 1)], else_=0)).label('success_count')
        )
        
        if start_date:
            query = query.filter(OAuthLoginLog.created_at >= start_date)
        
        if end_date:
            query = query.filter(OAuthLoginLog.created_at <= end_date)
        
        results = query.group_by(OAuthLoginLog.provider).all()
        
        stats = {}
        for result in results:
            stats[result.provider] = {
                'total_logins': result.login_count,
                'successful_logins': result.success_count or 0,
                'success_rate': (result.success_count or 0) / result.login_count if result.login_count > 0 else 0
            }
        
        return stats