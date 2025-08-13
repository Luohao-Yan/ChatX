from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
import json
import logging
from app.infrastructure.clients.redis_client import get_redis
from app.models.user_models import UserSession

logger = logging.getLogger(__name__)


class SessionCacheService:
    """会话缓存服务 - 使用Redis缓存活跃会话"""

    def __init__(self):
        self.session_expire_seconds = 7 * 24 * 3600  # 7天
        self.active_sessions_key_prefix = "active_sessions"
        self.user_sessions_key_prefix = "user_sessions"

    def _get_session_key(self, session_id: int) -> str:
        """获取单个会话的Redis键"""
        return f"session:{session_id}"

    def _get_user_sessions_key(self, user_id: int) -> str:
        """获取用户所有会话的Redis键"""
        return f"{self.user_sessions_key_prefix}:{user_id}"

    def _get_refresh_token_key(self, refresh_token: str) -> str:
        """获取刷新令牌的Redis键"""
        return f"refresh_token:{refresh_token}"

    def _session_to_cache_data(self, session: UserSession) -> Dict[str, Any]:
        """将会话对象转换为缓存数据"""
        return {
            "id": session.id,
            "user_id": session.user_id,
            "refresh_token": session.refresh_token,
            "device_info": session.device_info,
            "ip_address": session.ip_address,
            "created_at": (
                session.created_at.isoformat() if session.created_at else None
            ),
            "last_used": session.last_used.isoformat() if session.last_used else None,
            "expires_at": (
                session.expires_at.isoformat() if session.expires_at else None
            ),
            "is_active": session.is_active,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }

    async def cache_session(self, session: UserSession) -> bool:
        """缓存会话到Redis"""
        try:
            redis_client = await get_redis()
            session_key = self._get_session_key(session.id)
            user_sessions_key = self._get_user_sessions_key(session.user_id)
            refresh_token_key = self._get_refresh_token_key(session.refresh_token)

            # 会话数据
            session_data = self._session_to_cache_data(session)

            # 计算过期时间
            if session.expires_at:
                expire_seconds = int(
                    (session.expires_at - datetime.now(timezone.utc)).total_seconds()
                )
                expire_seconds = max(
                    60, min(expire_seconds, self.session_expire_seconds)
                )  # 最少1分钟，最多7天
            else:
                expire_seconds = self.session_expire_seconds

            # 1. 缓存会话详情
            await redis_client.setex(session_key, expire_seconds, session_data)

            # 2. 添加到用户会话集合
            await redis_client.setex(
                f"{user_sessions_key}:{session.id}", expire_seconds, session.id
            )

            # 3. 缓存刷新令牌映射
            await redis_client.setex(
                refresh_token_key,
                expire_seconds,
                {"session_id": session.id, "user_id": session.user_id},
            )

            logger.debug(
                f"会话 {session.id} 已缓存到Redis，过期时间: {expire_seconds}秒"
            )
            return True

        except Exception as e:
            logger.error(f"缓存会话失败: {e}")
            return False

    async def get_session(self, session_id: int) -> Optional[Dict[str, Any]]:
        """从Redis获取会话"""
        try:
            redis_client = await get_redis()
            session_key = self._get_session_key(session_id)

            session_data = await redis_client.get(session_key)
            if session_data:
                logger.debug(f"从Redis获取会话 {session_id}")
                return session_data

            return None

        except Exception as e:
            logger.error(f"从Redis获取会话失败: {e}")
            return None

    async def get_session_by_refresh_token(
        self, refresh_token: str
    ) -> Optional[Dict[str, Any]]:
        """通过刷新令牌获取会话"""
        try:
            redis_client = await get_redis()
            refresh_token_key = self._get_refresh_token_key(refresh_token)

            token_data = await redis_client.get(refresh_token_key)
            if token_data and isinstance(token_data, dict):
                session_id = token_data.get("session_id")
                if session_id:
                    return await self.get_session(session_id)

            return None

        except Exception as e:
            logger.error(f"通过刷新令牌获取会话失败: {e}")
            return None

    async def update_session_last_used(self, session_id: int) -> bool:
        """更新会话最后使用时间"""
        try:
            redis_client = await get_redis()
            session_key = self._get_session_key(session_id)

            session_data = await redis_client.get(session_key)
            if session_data:
                session_data["last_used"] = datetime.now(timezone.utc).isoformat()

                # 重新计算过期时间
                if session_data.get("expires_at"):
                    expires_at = datetime.fromisoformat(
                        session_data["expires_at"].replace("Z", "+00:00")
                    )
                    expire_seconds = int(
                        (expires_at - datetime.now(timezone.utc)).total_seconds()
                    )
                    expire_seconds = max(
                        60, min(expire_seconds, self.session_expire_seconds)
                    )
                else:
                    expire_seconds = self.session_expire_seconds

                await redis_client.setex(session_key, expire_seconds, session_data)
                logger.debug(f"更新会话 {session_id} 最后使用时间")
                return True

            return False

        except Exception as e:
            logger.error(f"更新会话最后使用时间失败: {e}")
            return False

    async def deactivate_session(self, session_id: int) -> bool:
        """停用会话"""
        try:
            redis_client = await get_redis()
            session_key = self._get_session_key(session_id)

            session_data = await redis_client.get(session_key)
            if session_data:
                # 获取用户ID和刷新令牌
                user_id = session_data.get("user_id")
                refresh_token = session_data.get("refresh_token")

                # 删除会话缓存
                await redis_client.delete(session_key)

                # 从用户会话集合中删除
                if user_id:
                    user_sessions_key = self._get_user_sessions_key(user_id)
                    await redis_client.delete(f"{user_sessions_key}:{session_id}")

                # 删除刷新令牌映射
                if refresh_token:
                    refresh_token_key = self._get_refresh_token_key(refresh_token)
                    await redis_client.delete(refresh_token_key)

                logger.info(f"会话 {session_id} 已从Redis中删除")
                return True

            return False

        except Exception as e:
            logger.error(f"停用会话失败: {e}")
            return False

    async def deactivate_all_user_sessions(self, user_id: int) -> bool:
        """停用用户所有会话"""
        try:
            redis_client = await get_redis()
            user_sessions_key = self._get_user_sessions_key(user_id)

            # 获取用户所有会话ID
            pattern = f"{user_sessions_key}:*"
            session_keys = []

            # 使用scan来获取匹配的键
            cursor = 0
            while True:
                cursor, keys = await redis_client.redis_client.scan(
                    cursor, match=pattern, count=100
                )
                session_keys.extend(keys)
                if cursor == 0:
                    break

            # 删除所有会话
            deleted_count = 0
            for session_key in session_keys:
                session_id_str = session_key.split(":")[-1]
                try:
                    session_id = int(session_id_str)
                    if await self.deactivate_session(session_id):
                        deleted_count += 1
                except ValueError:
                    continue

            logger.info(f"用户 {user_id} 的 {deleted_count} 个会话已从Redis中删除")
            return True

        except Exception as e:
            logger.error(f"停用用户所有会话失败: {e}")
            return False

    async def get_user_active_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """获取用户活跃会话列表"""
        try:
            redis_client = await get_redis()
            user_sessions_key = self._get_user_sessions_key(user_id)

            # 获取用户所有会话
            pattern = f"{user_sessions_key}:*"
            session_keys = []

            cursor = 0
            while True:
                cursor, keys = await redis_client.redis_client.scan(
                    cursor, match=pattern, count=100
                )
                session_keys.extend(keys)
                if cursor == 0:
                    break

            sessions = []
            for session_key in session_keys:
                session_id_str = session_key.split(":")[-1]
                try:
                    session_id = int(session_id_str)
                    session_data = await self.get_session(session_id)
                    if session_data and session_data.get("is_active"):
                        sessions.append(session_data)
                except ValueError:
                    continue

            return sessions

        except Exception as e:
            logger.error(f"获取用户活跃会话失败: {e}")
            return []

    async def cleanup_expired_sessions(self) -> int:
        """清理过期会话（通常由定时任务调用）"""
        try:
            redis_client = await get_redis()

            # 获取所有会话键
            pattern = "session:*"
            session_keys = []

            cursor = 0
            while True:
                cursor, keys = await redis_client.redis_client.scan(
                    cursor, match=pattern, count=100
                )
                session_keys.extend(keys)
                if cursor == 0:
                    break

            cleaned_count = 0
            current_time = datetime.now(timezone.utc)

            for session_key in session_keys:
                session_data = await redis_client.get(session_key)
                if session_data and session_data.get("expires_at"):
                    try:
                        expires_at = datetime.fromisoformat(
                            session_data["expires_at"].replace("Z", "+00:00")
                        )
                        if expires_at < current_time:
                            # 会话已过期
                            session_id = session_data.get("id")
                            if session_id and await self.deactivate_session(session_id):
                                cleaned_count += 1
                    except (ValueError, TypeError):
                        continue

            logger.info(f"清理了 {cleaned_count} 个过期会话")
            return cleaned_count

        except Exception as e:
            logger.error(f"清理过期会话失败: {e}")
            return 0


# 全局会话缓存服务实例
session_cache_service = SessionCacheService()


async def get_session_cache_service() -> SessionCacheService:
    """获取会话缓存服务实例"""
    return session_cache_service
