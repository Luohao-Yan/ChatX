"""
Redis缓存工具类 - 支持模式匹配删除和高级缓存操作
"""

import json
import logging
from datetime import timedelta
from typing import Optional, Any, List, Union
from app.infrastructure.clients.redis_client import get_redis

logger = logging.getLogger(__name__)


class RedisCacheManager:
    """Redis缓存管理器"""
    
    def __init__(self):
        self._redis = None
    
    async def _get_redis(self):
        """获取Redis客户端"""
        if not self._redis:
            self._redis = await get_redis()
        return self._redis
    
    async def set(self, key: str, value: Any, ttl: Union[timedelta, int, None] = None) -> bool:
        """设置缓存"""
        try:
            redis_client = await self._get_redis()
            
            # 处理过期时间
            expire_seconds = None
            if ttl:
                if isinstance(ttl, timedelta):
                    expire_seconds = int(ttl.total_seconds())
                elif isinstance(ttl, int):
                    expire_seconds = ttl
            
            # 序列化值
            if isinstance(value, (dict, list, tuple)):
                value = json.dumps(value, ensure_ascii=False, default=str)
            
            return await redis_client.redis_client.set(key, value, ex=expire_seconds)
        
        except Exception as e:
            logger.error(f"设置缓存失败 {key}: {e}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """获取缓存"""
        try:
            redis_client = await self._get_redis()
            value = await redis_client.redis_client.get(key)
            
            if value is None:
                return None
            
            # 尝试反序列化
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        
        except Exception as e:
            logger.error(f"获取缓存失败 {key}: {e}")
            return None
    
    async def delete(self, key: str) -> bool:
        """删除缓存"""
        try:
            redis_client = await self._get_redis()
            result = await redis_client.redis_client.delete(key)
            return result > 0
        
        except Exception as e:
            logger.error(f"删除缓存失败 {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """删除匹配模式的所有键"""
        try:
            redis_client = await self._get_redis()
            
            # 使用SCAN命令获取匹配的键
            keys = []
            cursor = 0
            
            while True:
                cursor, partial_keys = await redis_client.redis_client.scan(
                    cursor=cursor, 
                    match=pattern, 
                    count=100
                )
                keys.extend(partial_keys)
                
                if cursor == 0:
                    break
            
            # 批量删除
            if keys:
                deleted_count = await redis_client.redis_client.delete(*keys)
                logger.info(f"删除了 {deleted_count} 个匹配模式 {pattern} 的缓存键")
                return deleted_count
            
            return 0
        
        except Exception as e:
            logger.error(f"删除模式缓存失败 {pattern}: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        try:
            redis_client = await self._get_redis()
            result = await redis_client.redis_client.exists(key)
            return result > 0
        
        except Exception as e:
            logger.error(f"检查缓存存在失败 {key}: {e}")
            return False
    
    async def ttl(self, key: str) -> int:
        """获取键的剩余过期时间"""
        try:
            redis_client = await self._get_redis()
            return await redis_client.redis_client.ttl(key)
        
        except Exception as e:
            logger.error(f"获取缓存TTL失败 {key}: {e}")
            return -1
    
    async def expire(self, key: str, seconds: int) -> bool:
        """设置键的过期时间"""
        try:
            redis_client = await self._get_redis()
            return await redis_client.redis_client.expire(key, seconds)
        
        except Exception as e:
            logger.error(f"设置缓存过期时间失败 {key}: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1, ttl: Optional[int] = None) -> Optional[int]:
        """递增计数器"""
        try:
            redis_client = await self._get_redis()
            result = await redis_client.redis_client.incrby(key, amount)
            
            # 如果是第一次创建且设置了TTL，则设置过期时间
            if ttl and result == amount:
                await redis_client.redis_client.expire(key, ttl)
            
            return result
        
        except Exception as e:
            logger.error(f"递增缓存失败 {key}: {e}")
            return None
    
    async def set_multiple(self, mapping: dict, ttl: Union[timedelta, int, None] = None) -> bool:
        """批量设置缓存"""
        try:
            redis_client = await self._get_redis()
            
            # 序列化所有值
            serialized_mapping = {}
            for key, value in mapping.items():
                if isinstance(value, (dict, list, tuple)):
                    serialized_mapping[key] = json.dumps(value, ensure_ascii=False, default=str)
                else:
                    serialized_mapping[key] = value
            
            # 批量设置
            await redis_client.redis_client.mset(serialized_mapping)
            
            # 如果需要设置过期时间
            if ttl:
                expire_seconds = ttl
                if isinstance(ttl, timedelta):
                    expire_seconds = int(ttl.total_seconds())
                
                # 为所有键设置过期时间
                pipeline = redis_client.redis_client.pipeline()
                for key in mapping.keys():
                    pipeline.expire(key, expire_seconds)
                await pipeline.execute()
            
            return True
        
        except Exception as e:
            logger.error(f"批量设置缓存失败: {e}")
            return False
    
    async def get_multiple(self, keys: List[str]) -> dict:
        """批量获取缓存"""
        try:
            redis_client = await self._get_redis()
            values = await redis_client.redis_client.mget(keys)
            
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    try:
                        result[key] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        result[key] = value
                else:
                    result[key] = None
            
            return result
        
        except Exception as e:
            logger.error(f"批量获取缓存失败: {e}")
            return {}
    
    async def clear_all(self) -> bool:
        """清空所有缓存（谨慎使用）"""
        try:
            redis_client = await self._get_redis()
            await redis_client.redis_client.flushdb()
            logger.warning("已清空所有Redis缓存")
            return True
        
        except Exception as e:
            logger.error(f"清空缓存失败: {e}")
            return False
    
    async def get_stats(self) -> dict:
        """获取Redis统计信息"""
        try:
            redis_client = await self._get_redis()
            info = await redis_client.redis_client.info()
            
            return {
                "used_memory": info.get("used_memory_human", "N/A"),
                "connected_clients": info.get("connected_clients", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "expired_keys": info.get("expired_keys", 0)
            }
        
        except Exception as e:
            logger.error(f"获取Redis统计信息失败: {e}")
            return {}
    
    async def list_keys(self, pattern: str = "*", limit: int = 100) -> List[str]:
        """列出匹配模式的键"""
        try:
            redis_client = await self._get_redis()
            
            keys = []
            cursor = 0
            
            while len(keys) < limit:
                cursor, partial_keys = await redis_client.redis_client.scan(
                    cursor=cursor,
                    match=pattern,
                    count=min(100, limit - len(keys))
                )
                keys.extend(partial_keys)
                
                if cursor == 0:
                    break
            
            return keys[:limit]
        
        except Exception as e:
            logger.error(f"列出缓存键失败 {pattern}: {e}")
            return []


# 全局缓存管理器实例
redis_cache = RedisCacheManager()


# 便利函数
async def cache_get(key: str) -> Optional[Any]:
    """获取缓存的便利函数"""
    return await redis_cache.get(key)


async def cache_set(key: str, value: Any, ttl: Union[timedelta, int, None] = None) -> bool:
    """设置缓存的便利函数"""
    return await redis_cache.set(key, value, ttl)


async def cache_delete(key: str) -> bool:
    """删除缓存的便利函数"""
    return await redis_cache.delete(key)


async def cache_clear_pattern(pattern: str) -> int:
    """清除模式匹配缓存的便利函数"""
    return await redis_cache.delete_pattern(pattern)