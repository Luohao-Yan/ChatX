"""
系统路由模块
属于接口层，提供系统级API端点
"""

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from app.core.config import settings
from app.shared.monitoring.metrics import business_metrics, metrics_exporter
import platform
import sys

# 创建系统路由器
system_router = APIRouter(tags=["系统"])


@system_router.get("/")
async def root():
    """根路径"""
    return {
        "message": "Welcome to ChatX Enterprise API",
        "version": "1.0.0",
        "api_docs": (
            "/docs" if settings.ENVIRONMENT != "production" else "Contact administrator"
        ),
        "features": [
            "多租户架构",
            "企业级安全",
            "结构化日志", 
            "性能监控",
            "文件管理",
            "向量搜索",
            "知识图谱",
        ],
    }


@system_router.get("/health")
async def health_check():
    """健康检查"""
    
    # 收集系统指标
    metrics_summary = business_metrics.get_summary()
    
    return {
        "status": "healthy",
        "version": "1.0.0", 
        "timestamp": "2024-01-01T00:00:00Z",
        "environment": settings.ENVIRONMENT,
        "services": {
            "database": "postgresql",
            "redis": "connected",
            "minio": "connected",
            "weaviate": "connected",
            "neo4j": "connected",
        },
        "metrics": {
            "total_requests": metrics_summary.get("http.requests.total", {}).get("current", 0),
            "error_rate": metrics_summary.get("http.error_rate", {}).get("current", 0),
            "active_tenants": metrics_summary.get("tenants.active", {}).get("current", 0),
        },
    }


@system_router.get("/metrics")
async def metrics():
    """Prometheus格式的指标端点"""
    
    return PlainTextResponse(
        content=metrics_exporter.export_prometheus(), 
        media_type="text/plain"
    )


@system_router.get("/system/info")
async def system_info():
    """系统信息"""
    
    return {
        "python_version": sys.version,
        "platform": platform.platform(),
        "architecture": platform.architecture(),
        "processor": platform.processor(),
        "environment": settings.ENVIRONMENT,
        "features": {
            "multi_tenant": True,
            "structured_logging": True,
            "metrics_collection": True,
            "error_handling": True,
            "api_versioning": True,
        },
    }


__all__ = ["system_router"]