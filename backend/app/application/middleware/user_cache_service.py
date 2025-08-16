from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import json
import logging
from app.infrastructure.clients.redis_client import get_redis

logger = logging.getLogger(__name__)


class UserCacheService:
    """用户缓存服务 - 使用Redis缓存完整用户信息"""

    def __init__(self):
        self.user_cache_expire_seconds = 3600  # 1小时
        self.user_profile_key_prefix = "user_profile"

    def _get_user_cache_key(self, user_id: str) -> str:
        """获取用户缓存的Redis键"""
        return f"{self.user_profile_key_prefix}:{user_id}"

    def _serialize_user_data(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """序列化用户数据，处理datetime等特殊类型"""
        serialized_data = {}
        
        for key, value in user_data.items():
            if isinstance(value, datetime):
                serialized_data[key] = value.isoformat()
            elif value is None:
                serialized_data[key] = None
            else:
                serialized_data[key] = value
        
        # 添加缓存时间戳
        serialized_data["cached_at"] = datetime.now(timezone.utc).isoformat()
        
        return serialized_data

    def _deserialize_user_data(self, cached_data: Dict[str, Any]) -> Dict[str, Any]:
        """反序列化用户数据，恢复datetime等特殊类型"""
        if not cached_data:
            return None
        
        deserialized_data = {}
        datetime_fields = [
            "created_at", "updated_at", "last_login", "date_of_birth", "cached_at"
        ]
        
        for key, value in cached_data.items():
            if key in datetime_fields and value:
                try:
                    # 处理ISO格式的datetime字符串
                    if isinstance(value, str):
                        # 移除Z后缀并添加UTC时区信息
                        if value.endswith('Z'):
                            value = value[:-1] + '+00:00'
                        deserialized_data[key] = datetime.fromisoformat(value)
                    elif isinstance(value, datetime):
                        # 如果已经是datetime对象，直接使用
                        deserialized_data[key] = value
                    else:
                        deserialized_data[key] = value
                except (ValueError, TypeError):
                    deserialized_data[key] = value
            else:
                deserialized_data[key] = value
        
        return deserialized_data

    async def cache_user_profile(self, user_data: Dict[str, Any]) -> bool:
        """缓存用户完整信息到Redis"""
        try:
            if not user_data or not user_data.get("id"):
                logger.warning("无效的用户数据，无法缓存")
                return False

            redis_client = await get_redis()
            if not redis_client:
                logger.error("Redis客户端不可用")
                return False
                
            user_cache_key = self._get_user_cache_key(user_data["id"])
            
            # 序列化用户数据
            serialized_data = self._serialize_user_data(user_data)
            
            # 缓存用户信息
            success = await redis_client.set(
                user_cache_key, 
                serialized_data,
                expire=self.user_cache_expire_seconds
            )

            if success:
                logger.debug(f"用户 {user_data['id']} 的完整信息已缓存到Redis")
                return True
            else:
                logger.error(f"Redis set操作失败: {user_cache_key}")
                return False

        except Exception as e:
            logger.error(f"缓存用户信息失败: {e}", exc_info=True)
            return False

    async def get_cached_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """从Redis获取缓存的用户完整信息"""
        try:
            redis_client = await get_redis()
            if not redis_client:
                logger.error("Redis客户端不可用")
                return None
                
            user_cache_key = self._get_user_cache_key(user_id)

            cached_data = await redis_client.get(user_cache_key)
            if cached_data:
                deserialized_data = self._deserialize_user_data(cached_data)
                if deserialized_data:
                    logger.debug(f"从Redis获取用户 {user_id} 的完整信息")
                    return deserialized_data
                else:
                    logger.warning(f"缓存数据反序列化失败: {user_id}")
            else:
                logger.debug(f"Redis中未找到用户缓存: {user_id}")

            return None

        except Exception as e:
            logger.error(f"从Redis获取用户信息失败: {e}", exc_info=True)
            return None

    async def invalidate_user_cache(self, user_id: str) -> bool:
        """清除用户缓存"""
        try:
            redis_client = await get_redis()
            user_cache_key = self._get_user_cache_key(user_id)
            
            result = await redis_client.delete(user_cache_key)
            logger.info(f"用户 {user_id} 的缓存已清除")
            return result > 0

        except Exception as e:
            logger.error(f"清除用户缓存失败: {e}")
            return False

    async def refresh_user_cache(self, user_id: str, user_repo) -> Optional[Dict[str, Any]]:
        """刷新用户缓存 - 从数据库重新加载并缓存"""
        try:
            # 从数据库获取最新用户信息
            user_data = await user_repo.get_user_with_profile(user_id)
            if not user_data:
                logger.warning(f"用户 {user_id} 不存在，无法刷新缓存")
                return None

            # 更新缓存
            if await self.cache_user_profile(user_data):
                logger.info(f"用户 {user_id} 的缓存已刷新")
                return user_data
            
            return None

        except Exception as e:
            logger.error(f"刷新用户缓存失败: {e}")
            return None

    async def get_or_fetch_user_profile(self, user_id: str, user_repo) -> Optional[Dict[str, Any]]:
        """获取用户信息 - 优先从缓存获取，缓存未命中则从数据库加载并缓存"""
        try:
            logger.debug(f"开始获取用户 {user_id} 的信息")
            
            # 1. 尝试从缓存获取
            cached_user = await self.get_cached_user_profile(user_id)
            if cached_user:
                logger.debug(f"从缓存获取到用户 {user_id} 的信息")
                # 检查缓存是否过期（可选的额外检查）
                cached_at_str = cached_user.get("cached_at")
                if cached_at_str:
                    try:
                        # 确保 cached_at_str 是字符串
                        if isinstance(cached_at_str, str):
                            cached_at = datetime.fromisoformat(cached_at_str.replace("Z", "+00:00"))
                            age = datetime.now(timezone.utc) - cached_at
                            if age.total_seconds() < self.user_cache_expire_seconds:
                                logger.debug(f"缓存未过期，返回缓存数据: {user_id}")
                                return cached_user
                            else:
                                logger.debug(f"缓存已过期，年龄: {age.total_seconds()}秒")
                        else:
                            logger.warning(f"缓存时间格式错误，类型: {type(cached_at_str)}, 值: {cached_at_str}")
                    except (ValueError, TypeError) as ve:
                        logger.warning(f"缓存时间解析失败: {ve}")

            # 2. 缓存未命中或已过期，从数据库获取
            logger.debug(f"从数据库获取用户 {user_id} 的信息")
            user_data = await user_repo.get_user_with_profile(user_id)
            if user_data:
                logger.debug(f"数据库查询成功，用户 {user_id}")
                # 3. 更新缓存
                cache_success = await self.cache_user_profile(user_data)
                logger.debug(f"缓存更新结果: {cache_success}")
                return user_data
            else:
                logger.warning(f"数据库中未找到用户 {user_id}")
            
            return None

        except Exception as e:
            logger.error(f"获取用户信息失败: {e}", exc_info=True)
            return None

    async def update_user_login_time(self, user_id: str, login_time: datetime) -> bool:
        """更新用户缓存中的最后登录时间"""
        try:
            cached_user = await self.get_cached_user_profile(user_id)
            if cached_user:
                cached_user["last_login"] = login_time
                return await self.cache_user_profile(cached_user)
            
            return False

        except Exception as e:
            logger.error(f"更新用户登录时间缓存失败: {e}")
            return False


# 全局用户缓存服务实例
user_cache_service = UserCacheService()


async def get_user_cache_service() -> UserCacheService:
    """获取用户缓存服务实例"""
    return user_cache_service