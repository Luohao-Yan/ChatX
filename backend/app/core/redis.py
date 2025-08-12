import redis.asyncio as redis
from app.core.config import settings
import json
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)

class RedisClient:
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
    
    async def connect(self):
        """连接到Redis"""
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            await self.redis_client.ping()
            logger.info("成功连接到Redis")
        except Exception as e:
            logger.error(f"连接Redis失败: {e}")
            raise
    
    async def disconnect(self):
        """断开Redis连接"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis连接已关闭")
    
    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """设置键值对"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False)
            
            result = await self.redis_client.set(key, value, ex=expire)
            return result
        except Exception as e:
            logger.error(f"Redis设置失败 {key}: {e}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """获取值"""
        try:
            value = await self.redis_client.get(key)
            if value is None:
                return None
            
            # 尝试解析JSON
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except Exception as e:
            logger.error(f"Redis获取失败 {key}: {e}")
            return None
    
    async def delete(self, key: str) -> bool:
        """删除键"""
        try:
            result = await self.redis_client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis删除失败 {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        try:
            result = await self.redis_client.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis检查存在失败 {key}: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """递增"""
        try:
            result = await self.redis_client.incrby(key, amount)
            return result
        except Exception as e:
            logger.error(f"Redis递增失败 {key}: {e}")
            return None
    
    async def expire(self, key: str, seconds: int) -> bool:
        """设置过期时间"""
        try:
            result = await self.redis_client.expire(key, seconds)
            return result
        except Exception as e:
            logger.error(f"Redis设置过期时间失败 {key}: {e}")
            return False
    
    async def setex(self, key: str, seconds: int, value: Any) -> bool:
        """设置键值对并指定过期时间"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False)
            
            result = await self.redis_client.setex(key, seconds, value)
            return result
        except Exception as e:
            logger.error(f"Redis setex失败 {key}: {e}")
            return False
    
    async def ttl(self, key: str) -> int:
        """获取键的剩余过期时间"""
        try:
            result = await self.redis_client.ttl(key)
            return result
        except Exception as e:
            logger.error(f"Redis TTL获取失败 {key}: {e}")
            return -1

# 全局Redis客户端实例
redis_client = RedisClient()

async def get_redis() -> RedisClient:
    """获取Redis客户端"""
    return redis_client