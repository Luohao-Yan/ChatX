from celery import Celery
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# 创建Celery应用
celery_app = Celery(
    "chatx",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"],
)

# Celery配置
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC+8",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30分钟
    task_soft_time_limit=25 * 60,  # 25分钟
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# 定时任务配置
celery_app.conf.beat_schedule = {
    # 示例：每天凌晨2点清理过期数据
    "cleanup-expired-data": {
        "task": "app.tasks.cleanup_expired_data",
        "schedule": 60.0 * 60.0 * 24.0,  # 24小时
    },
    # 示例：每小时生成统计报告
    "generate-stats": {
        "task": "app.tasks.generate_stats",
        "schedule": 60.0 * 60.0,  # 1小时
    },
}
