from typing import Optional, Dict, Any, Tuple
import logging
from datetime import datetime, timedelta
from app.infrastructure.clients.redis_client import get_redis

logger = logging.getLogger(__name__)


class RateLimiterService:
    """限流服务 - 使用Redis实现各种限流策略"""

    def __init__(self):
        self.rate_limit_prefix = "rate_limit"
        self.login_attempts_prefix = "login_attempts"
        self.ip_blacklist_prefix = "ip_blacklist"

        # 默认限流配置
        self.default_rate_limits = {
            "login": {"requests": 5, "window": 300},  # 5分钟内最多5次登录尝试
            "register": {"requests": 3, "window": 3600},  # 1小时内最多3次注册
            "send_code": {"requests": 3, "window": 300},  # 5分钟内最多发送3次验证码
            "api": {"requests": 100, "window": 60},  # 1分钟内最多100次API调用
        }

    def _get_rate_limit_key(self, identifier: str, action: str) -> str:
        """生成限流键"""
        return f"{self.rate_limit_prefix}:{action}:{identifier}"

    def _get_login_attempts_key(self, identifier: str) -> str:
        """生成登录尝试键"""
        return f"{self.login_attempts_prefix}:{identifier}"

    def _get_ip_blacklist_key(self, ip_address: str) -> str:
        """生成IP黑名单键"""
        return f"{self.ip_blacklist_prefix}:{ip_address}"

    async def check_rate_limit(
        self,
        identifier: str,
        action: str,
        custom_limit: Optional[Dict[str, int]] = None,
    ) -> Tuple[bool, Dict[str, Any]]:
        """检查是否超过限流"""
        try:
            redis_client = await get_redis()
            rate_limit_key = self._get_rate_limit_key(identifier, action)

            # 获取限流配置
            if custom_limit:
                max_requests = custom_limit["requests"]
                window_seconds = custom_limit["window"]
            else:
                limit_config = self.default_rate_limits.get(
                    action, {"requests": 10, "window": 60}
                )
                max_requests = limit_config["requests"]
                window_seconds = limit_config["window"]

            # 获取当前计数
            current_count = await redis_client.get(rate_limit_key)
            if current_count is None:
                current_count = 0
            else:
                current_count = int(current_count)

            # 检查是否超过限制
            if current_count >= max_requests:
                # 获取剩余时间
                ttl = await redis_client.ttl(rate_limit_key)
                return False, {
                    "allowed": False,
                    "current_count": current_count,
                    "max_requests": max_requests,
                    "window_seconds": window_seconds,
                    "reset_in_seconds": ttl if ttl > 0 else 0,
                    "message": f"请求过于频繁，请等待 {ttl} 秒后重试",
                }

            return True, {
                "allowed": True,
                "current_count": current_count,
                "max_requests": max_requests,
                "window_seconds": window_seconds,
                "remaining_requests": max_requests - current_count - 1,
            }

        except Exception as e:
            logger.error(f"检查限流失败: {e}")
            # 发生错误时允许请求（优雅降级）
            return True, {"allowed": True, "error": str(e)}

    async def record_request(
        self,
        identifier: str,
        action: str,
        custom_limit: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        """记录请求"""
        try:
            redis_client = await get_redis()
            rate_limit_key = self._get_rate_limit_key(identifier, action)

            # 获取限流配置
            if custom_limit:
                window_seconds = custom_limit["window"]
            else:
                limit_config = self.default_rate_limits.get(
                    action, {"requests": 10, "window": 60}
                )
                window_seconds = limit_config["window"]

            # 增加计数器
            current_count = await redis_client.increment(rate_limit_key)

            # 如果是第一次，设置过期时间
            if current_count == 1:
                await redis_client.expire(rate_limit_key, window_seconds)

            logger.debug(f"记录请求: {rate_limit_key}, 当前计数: {current_count}")

            return {
                "recorded": True,
                "current_count": current_count,
                "window_seconds": window_seconds,
            }

        except Exception as e:
            logger.error(f"记录请求失败: {e}")
            return {"recorded": False, "error": str(e)}

    async def record_failed_login(
        self, identifier: str, ip_address: str = None
    ) -> Dict[str, Any]:
        """记录失败登录尝试"""
        try:
            redis_client = await get_redis()

            # 记录账户失败次数
            account_key = self._get_login_attempts_key(f"account:{identifier}")
            account_failures = await redis_client.increment(account_key)

            # 设置账户锁定时间（首次失败时）
            if account_failures == 1:
                await redis_client.expire(account_key, 1800)  # 30分钟

            ip_failures = 0
            if ip_address:
                # 记录IP失败次数
                ip_key = self._get_login_attempts_key(f"ip:{ip_address}")
                ip_failures = await redis_client.increment(ip_key)

                # 设置IP限制时间（首次失败时）
                if ip_failures == 1:
                    await redis_client.expire(ip_key, 3600)  # 1小时

                # 如果IP失败次数过多，加入黑名单
                if ip_failures >= 20:
                    await self.add_to_ip_blacklist(ip_address, 86400)  # 24小时黑名单

            logger.warning(
                f"记录失败登录: {identifier}, IP: {ip_address}, 账户失败: {account_failures}, IP失败: {ip_failures}"
            )

            return {
                "account_failures": account_failures,
                "ip_failures": ip_failures,
                "account_locked": account_failures >= 5,
                "ip_blocked": ip_failures >= 10,
            }

        except Exception as e:
            logger.error(f"记录失败登录失败: {e}")
            return {"error": str(e)}

    async def check_login_attempts(
        self, identifier: str, ip_address: str = None
    ) -> Dict[str, Any]:
        """检查登录尝试次数"""
        try:
            redis_client = await get_redis()

            # 检查账户失败次数
            account_key = self._get_login_attempts_key(f"account:{identifier}")
            account_failures = await redis_client.get(account_key)
            account_failures = int(account_failures) if account_failures else 0

            # 检查IP失败次数
            ip_failures = 0
            ip_blocked = False
            if ip_address:
                # 检查IP黑名单
                if await self.is_ip_blacklisted(ip_address):
                    return {
                        "allowed": False,
                        "reason": "IP_BLACKLISTED",
                        "message": "您的IP地址已被暂时封禁，请稍后再试",
                    }

                ip_key = self._get_login_attempts_key(f"ip:{ip_address}")
                ip_failures = await redis_client.get(ip_key)
                ip_failures = int(ip_failures) if ip_failures else 0
                ip_blocked = ip_failures >= 10

            # 检查是否被锁定
            account_locked = account_failures >= 5

            if account_locked or ip_blocked:
                # 获取重置时间
                account_ttl = (
                    await redis_client.ttl(account_key) if account_locked else 0
                )
                ip_ttl = (
                    await redis_client.ttl(
                        self._get_login_attempts_key(f"ip:{ip_address}")
                    )
                    if ip_blocked and ip_address
                    else 0
                )

                reset_time = max(account_ttl, ip_ttl)

                return {
                    "allowed": False,
                    "account_failures": account_failures,
                    "ip_failures": ip_failures,
                    "account_locked": account_locked,
                    "ip_blocked": ip_blocked,
                    "reset_in_seconds": reset_time,
                    "message": f"登录尝试过多，请等待 {reset_time} 秒后重试",
                }

            return {
                "allowed": True,
                "account_failures": account_failures,
                "ip_failures": ip_failures,
                "remaining_attempts": 5 - account_failures,
            }

        except Exception as e:
            logger.error(f"检查登录尝试失败: {e}")
            return {"allowed": True, "error": str(e)}

    async def clear_login_attempts(
        self, identifier: str, ip_address: str = None
    ) -> bool:
        """清除登录尝试记录（成功登录后调用）"""
        try:
            redis_client = await get_redis()

            # 清除账户失败记录
            account_key = self._get_login_attempts_key(f"account:{identifier}")
            await redis_client.delete(account_key)

            # 清除IP失败记录
            if ip_address:
                ip_key = self._get_login_attempts_key(f"ip:{ip_address}")
                await redis_client.delete(ip_key)

            logger.info(f"清除登录尝试记录: {identifier}, IP: {ip_address}")
            return True

        except Exception as e:
            logger.error(f"清除登录尝试记录失败: {e}")
            return False

    async def add_to_ip_blacklist(self, ip_address: str, duration_seconds: int) -> bool:
        """添加IP到黑名单"""
        try:
            redis_client = await get_redis()
            blacklist_key = self._get_ip_blacklist_key(ip_address)

            blacklist_data = {
                "ip": ip_address,
                "blocked_at": datetime.now().isoformat(),
                "duration_seconds": duration_seconds,
                "reason": "Too many failed login attempts",
            }

            success = await redis_client.setex(
                blacklist_key, duration_seconds, blacklist_data
            )

            if success:
                logger.warning(
                    f"IP {ip_address} 已添加到黑名单，持续时间: {duration_seconds}秒"
                )

            return success

        except Exception as e:
            logger.error(f"添加IP到黑名单失败: {e}")
            return False

    async def is_ip_blacklisted(self, ip_address: str) -> bool:
        """检查IP是否在黑名单中"""
        try:
            redis_client = await get_redis()
            blacklist_key = self._get_ip_blacklist_key(ip_address)

            blacklist_data = await redis_client.get(blacklist_key)
            return blacklist_data is not None

        except Exception as e:
            logger.error(f"检查IP黑名单失败: {e}")
            return False

    async def remove_from_ip_blacklist(self, ip_address: str) -> bool:
        """从黑名单中移除IP"""
        try:
            redis_client = await get_redis()
            blacklist_key = self._get_ip_blacklist_key(ip_address)

            result = await redis_client.delete(blacklist_key)

            if result:
                logger.info(f"IP {ip_address} 已从黑名单中移除")

            return result

        except Exception as e:
            logger.error(f"从黑名单移除IP失败: {e}")
            return False

    async def get_rate_limit_status(
        self, identifier: str, action: str
    ) -> Dict[str, Any]:
        """获取限流状态"""
        try:
            redis_client = await get_redis()
            rate_limit_key = self._get_rate_limit_key(identifier, action)

            current_count = await redis_client.get(rate_limit_key)
            current_count = int(current_count) if current_count else 0

            ttl = await redis_client.ttl(rate_limit_key)

            limit_config = self.default_rate_limits.get(
                action, {"requests": 10, "window": 60}
            )

            return {
                "current_count": current_count,
                "max_requests": limit_config["requests"],
                "window_seconds": limit_config["window"],
                "reset_in_seconds": ttl if ttl > 0 else 0,
                "remaining_requests": max(0, limit_config["requests"] - current_count),
            }

        except Exception as e:
            logger.error(f"获取限流状态失败: {e}")
            return {"error": str(e)}


# 全局限流服务实例
rate_limiter_service = RateLimiterService()


async def get_rate_limiter_service() -> RateLimiterService:
    """获取限流服务实例"""
    return rate_limiter_service
