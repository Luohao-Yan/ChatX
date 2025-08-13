from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import secrets
import string
import logging
from app.infrastructure.clients.redis_client import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)


class VerificationService:
    """验证码服务 - 使用Redis存储验证码"""

    def __init__(self):
        self.default_expire_seconds = 3600  # 1小时
        self.max_attempts = 5  # 最大尝试次数
        self.cooldown_seconds = 60  # 重发冷却时间

    def _get_verification_key(self, user_id: int, verification_type: str) -> str:
        """生成验证码Redis键"""
        return f"verification:{verification_type}:{user_id}"

    def _get_attempts_key(self, user_id: int, verification_type: str) -> str:
        """生成尝试次数Redis键"""
        return f"verification_attempts:{verification_type}:{user_id}"

    def _get_cooldown_key(self, user_id: int, verification_type: str) -> str:
        """生成冷却时间Redis键"""
        return f"verification_cooldown:{verification_type}:{user_id}"

    def _generate_verification_code(self, length: int = 6) -> str:
        """生成验证码"""
        return "".join(secrets.choice(string.digits) for _ in range(length))

    async def create_verification_code(
        self, user_id: int, verification_type: str, expire_seconds: Optional[int] = None
    ) -> Optional[str]:
        """创建验证码"""
        try:
            redis_client = await get_redis()

            # 检查冷却时间
            cooldown_key = self._get_cooldown_key(user_id, verification_type)
            if await redis_client.exists(cooldown_key):
                remaining_time = await redis_client.ttl(cooldown_key)
                logger.warning(
                    f"用户 {user_id} 验证码创建过于频繁，剩余冷却时间: {remaining_time}秒"
                )
                return None

            # 生成验证码
            verification_code = self._generate_verification_code()
            verification_key = self._get_verification_key(user_id, verification_type)

            # 验证码数据
            verification_data = {
                "code": verification_code,
                "user_id": user_id,
                "type": verification_type,
                "created_at": datetime.now().isoformat(),
                "attempts": 0,
            }

            # 存储到Redis
            expire_time = expire_seconds or self.default_expire_seconds
            success = await redis_client.setex(
                verification_key, expire_time, verification_data
            )

            if success:
                # 设置冷却时间
                await redis_client.setex(
                    cooldown_key, self.cooldown_seconds, "cooldown"
                )

                logger.info(
                    f"为用户 {user_id} 创建了 {verification_type} 验证码，过期时间: {expire_time}秒"
                )
                return verification_code
            else:
                logger.error(f"为用户 {user_id} 创建验证码失败")
                return None

        except Exception as e:
            logger.error(f"创建验证码时发生错误: {e}")
            return None

    async def verify_code(
        self, user_id: int, verification_type: str, input_code: str
    ) -> Dict[str, Any]:
        """验证验证码"""
        try:
            redis_client = await get_redis()
            verification_key = self._get_verification_key(user_id, verification_type)
            attempts_key = self._get_attempts_key(user_id, verification_type)

            # 获取验证码数据
            verification_data = await redis_client.get(verification_key)
            if not verification_data:
                return {
                    "success": False,
                    "error": "验证码不存在或已过期",
                    "error_code": "VERIFICATION_NOT_FOUND",
                }

            # 检查尝试次数
            attempts = await redis_client.get(attempts_key) or 0
            if isinstance(attempts, str):
                attempts = int(attempts)

            if attempts >= self.max_attempts:
                # 删除验证码
                await redis_client.delete(verification_key)
                await redis_client.delete(attempts_key)

                return {
                    "success": False,
                    "error": "验证码尝试次数过多，请重新获取",
                    "error_code": "TOO_MANY_ATTEMPTS",
                }

            # 验证码校验
            stored_code = verification_data.get("code")
            if stored_code == input_code:
                # 验证成功，删除验证码和尝试次数
                await redis_client.delete(verification_key)
                await redis_client.delete(attempts_key)

                logger.info(f"用户 {user_id} 验证码验证成功: {verification_type}")
                return {"success": True, "message": "验证码验证成功"}
            else:
                # 验证失败，增加尝试次数
                new_attempts = attempts + 1
                await redis_client.setex(
                    attempts_key, self.default_expire_seconds, new_attempts
                )

                remaining_attempts = self.max_attempts - new_attempts
                logger.warning(
                    f"用户 {user_id} 验证码验证失败，剩余尝试次数: {remaining_attempts}"
                )

                return {
                    "success": False,
                    "error": f"验证码错误，剩余尝试次数: {remaining_attempts}",
                    "error_code": "INVALID_CODE",
                    "remaining_attempts": remaining_attempts,
                }

        except Exception as e:
            logger.error(f"验证验证码时发生错误: {e}")
            return {
                "success": False,
                "error": "验证过程中发生错误",
                "error_code": "VERIFICATION_ERROR",
            }

    async def get_verification_info(
        self, user_id: int, verification_type: str
    ) -> Optional[Dict[str, Any]]:
        """获取验证码信息"""
        try:
            redis_client = await get_redis()
            verification_key = self._get_verification_key(user_id, verification_type)
            attempts_key = self._get_attempts_key(user_id, verification_type)
            cooldown_key = self._get_cooldown_key(user_id, verification_type)

            verification_data = await redis_client.get(verification_key)
            if not verification_data:
                return None

            attempts = await redis_client.get(attempts_key) or 0
            if isinstance(attempts, str):
                attempts = int(attempts)

            ttl = await redis_client.ttl(verification_key)
            cooldown_ttl = await redis_client.ttl(cooldown_key)

            return {
                "exists": True,
                "created_at": verification_data.get("created_at"),
                "attempts": attempts,
                "max_attempts": self.max_attempts,
                "remaining_attempts": max(0, self.max_attempts - attempts),
                "expires_in": ttl,
                "cooldown_remaining": cooldown_ttl if cooldown_ttl > 0 else 0,
            }

        except Exception as e:
            logger.error(f"获取验证码信息时发生错误: {e}")
            return None

    async def cancel_verification(self, user_id: int, verification_type: str) -> bool:
        """取消验证码"""
        try:
            redis_client = await get_redis()
            verification_key = self._get_verification_key(user_id, verification_type)
            attempts_key = self._get_attempts_key(user_id, verification_type)

            # 删除验证码和尝试次数
            await redis_client.delete(verification_key)
            await redis_client.delete(attempts_key)

            logger.info(f"取消了用户 {user_id} 的 {verification_type} 验证码")
            return True

        except Exception as e:
            logger.error(f"取消验证码时发生错误: {e}")
            return False


# 全局验证码服务实例
verification_service = VerificationService()


async def get_verification_service() -> VerificationService:
    """获取验证码服务实例"""
    return verification_service
