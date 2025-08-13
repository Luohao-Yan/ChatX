from typing import Optional, Dict, Any, Callable, List
import hashlib
import json
import logging
from datetime import datetime, timedelta
from functools import wraps
from app.infrastructure.clients.redis_client import get_redis

logger = logging.getLogger(__name__)


class APICacheService:
    """API缓存服务 - 缓存API响应结果"""

    def __init__(self):
        self.default_expire_seconds = 300  # 5分钟默认过期时间
        self.cache_prefix = "api_cache"
        self.user_cache_prefix = "user_cache"

    def _generate_cache_key(
        self, endpoint: str, params: Dict[str, Any] = None, user_id: int = None
    ) -> str:
        """生成缓存键"""
        key_parts = [self.cache_prefix, endpoint]

        if user_id:
            key_parts.append(f"user_{user_id}")

        if params:
            # 对参数进行排序和序列化，确保一致性
            sorted_params = sorted(params.items())
            params_str = json.dumps(sorted_params, ensure_ascii=False)
            params_hash = hashlib.md5(params_str.encode()).hexdigest()
            key_parts.append(params_hash)

        return ":".join(key_parts)

    def _generate_user_cache_key(self, user_id: int, cache_type: str) -> str:
        """生成用户相关缓存键"""
        return f"{self.user_cache_prefix}:user_{user_id}:{cache_type}"

    async def get_cached_response(
        self, endpoint: str, params: Dict[str, Any] = None, user_id: int = None
    ) -> Optional[Dict[str, Any]]:
        """获取缓存的响应"""
        try:
            redis_client = await get_redis()
            cache_key = self._generate_cache_key(endpoint, params, user_id)

            cached_data = await redis_client.get(cache_key)
            if cached_data:
                logger.debug(f"从缓存获取API响应: {cache_key}")
                return cached_data

            return None

        except Exception as e:
            logger.error(f"获取API缓存失败: {e}")
            return None

    async def cache_response(
        self,
        endpoint: str,
        response_data: Dict[str, Any],
        params: Dict[str, Any] = None,
        user_id: int = None,
        expire_seconds: Optional[int] = None,
    ) -> bool:
        """缓存API响应"""
        try:
            redis_client = await get_redis()
            cache_key = self._generate_cache_key(endpoint, params, user_id)

            # 添加缓存元数据
            cache_data = {
                "data": response_data,
                "cached_at": datetime.now().isoformat(),
                "endpoint": endpoint,
                "user_id": user_id,
            }

            expire_time = expire_seconds or self.default_expire_seconds
            success = await redis_client.setex(cache_key, expire_time, cache_data)

            if success:
                logger.debug(f"缓存API响应: {cache_key}, 过期时间: {expire_time}秒")

            return success

        except Exception as e:
            logger.error(f"缓存API响应失败: {e}")
            return False

    async def invalidate_cache(
        self, endpoint: str = None, user_id: int = None, pattern: str = None
    ) -> int:
        """失效缓存"""
        try:
            redis_client = await get_redis()

            if pattern:
                # 使用自定义模式
                search_pattern = pattern
            elif endpoint and user_id:
                # 失效特定用户的特定端点缓存
                search_pattern = f"{self.cache_prefix}:{endpoint}:user_{user_id}:*"
            elif endpoint:
                # 失效特定端点的所有缓存
                search_pattern = f"{self.cache_prefix}:{endpoint}:*"
            elif user_id:
                # 失效特定用户的所有缓存
                search_pattern = f"{self.cache_prefix}:*:user_{user_id}:*"
            else:
                # 失效所有API缓存
                search_pattern = f"{self.cache_prefix}:*"

            # 获取匹配的键
            keys_to_delete = []
            cursor = 0
            while True:
                cursor, keys = await redis_client.redis_client.scan(
                    cursor, match=search_pattern, count=100
                )
                keys_to_delete.extend(keys)
                if cursor == 0:
                    break

            # 删除匹配的键
            deleted_count = 0
            for key in keys_to_delete:
                if await redis_client.delete(key):
                    deleted_count += 1

            logger.info(f"失效了 {deleted_count} 个API缓存，模式: {search_pattern}")
            return deleted_count

        except Exception as e:
            logger.error(f"失效API缓存失败: {e}")
            return 0

    async def cache_user_data(
        self,
        user_id: int,
        cache_type: str,
        data: Any,
        expire_seconds: Optional[int] = None,
    ) -> bool:
        """缓存用户相关数据"""
        try:
            redis_client = await get_redis()
            cache_key = self._generate_user_cache_key(user_id, cache_type)

            cache_data = {
                "data": data,
                "cached_at": datetime.now().isoformat(),
                "user_id": user_id,
                "cache_type": cache_type,
            }

            expire_time = expire_seconds or 1800  # 用户数据默认30分钟过期
            success = await redis_client.setex(cache_key, expire_time, cache_data)

            if success:
                logger.debug(f"缓存用户数据: {cache_key}")

            return success

        except Exception as e:
            logger.error(f"缓存用户数据失败: {e}")
            return False

    async def get_cached_user_data(
        self, user_id: int, cache_type: str
    ) -> Optional[Any]:
        """获取缓存的用户数据"""
        try:
            redis_client = await get_redis()
            cache_key = self._generate_user_cache_key(user_id, cache_type)

            cached_data = await redis_client.get(cache_key)
            if cached_data:
                logger.debug(f"从缓存获取用户数据: {cache_key}")
                return cached_data.get("data")

            return None

        except Exception as e:
            logger.error(f"获取用户缓存数据失败: {e}")
            return None

    async def invalidate_user_cache(self, user_id: int, cache_type: str = None) -> int:
        """失效用户缓存"""
        try:
            redis_client = await get_redis()

            if cache_type:
                # 失效特定类型的用户缓存
                cache_key = self._generate_user_cache_key(user_id, cache_type)
                if await redis_client.delete(cache_key):
                    logger.info(f"失效用户缓存: {cache_key}")
                    return 1
                return 0
            else:
                # 失效用户所有缓存
                pattern = f"{self.user_cache_prefix}:user_{user_id}:*"
                return await self.invalidate_cache(pattern=pattern)

        except Exception as e:
            logger.error(f"失效用户缓存失败: {e}")
            return 0

    async def get_cache_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        try:
            redis_client = await get_redis()

            # API缓存统计
            api_pattern = f"{self.cache_prefix}:*"
            user_pattern = f"{self.user_cache_prefix}:*"

            api_keys = []
            user_keys = []

            # 统计API缓存
            cursor = 0
            while True:
                cursor, keys = await redis_client.redis_client.scan(
                    cursor, match=api_pattern, count=100
                )
                api_keys.extend(keys)
                if cursor == 0:
                    break

            # 统计用户缓存
            cursor = 0
            while True:
                cursor, keys = await redis_client.redis_client.scan(
                    cursor, match=user_pattern, count=100
                )
                user_keys.extend(keys)
                if cursor == 0:
                    break

            return {
                "api_cache_count": len(api_keys),
                "user_cache_count": len(user_keys),
                "total_cache_count": len(api_keys) + len(user_keys),
                "generated_at": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"获取缓存统计失败: {e}")
            return {
                "api_cache_count": 0,
                "user_cache_count": 0,
                "total_cache_count": 0,
                "error": str(e),
            }


# 全局API缓存服务实例
api_cache_service = APICacheService()


async def get_api_cache_service() -> APICacheService:
    """获取API缓存服务实例"""
    return api_cache_service


def cached_api(expire_seconds: int = 300, use_user_id: bool = True):
    """API缓存装饰器"""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 提取请求参数用于生成缓存键
            endpoint = func.__name__

            # 尝试从kwargs中获取user_id
            user_id = None
            if use_user_id and "current_user" in kwargs:
                current_user = kwargs["current_user"]
                if hasattr(current_user, "id"):
                    user_id = current_user.id

            # 提取其他参数（排除current_user）
            cache_params = {k: v for k, v in kwargs.items() if k != "current_user"}

            # 尝试获取缓存
            cache_service = await get_api_cache_service()
            cached_result = await cache_service.get_cached_response(
                endpoint, cache_params, user_id
            )

            if cached_result:
                return cached_result.get("data")

            # 如果没有缓存，执行原函数
            result = await func(*args, **kwargs)

            # 缓存结果
            if result is not None:
                await cache_service.cache_response(
                    endpoint, result, cache_params, user_id, expire_seconds
                )

            return result

        return wrapper

    return decorator
