from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.redis import redis_client
from app.core.weaviate_client import init_collections
from app.core.neo4j_client import neo4j_client
from app.core.logging_config import setup_logging, get_logger
from app.core.exception_handlers import register_exception_handlers
from app.core.metrics import setup_system_metrics, business_metrics, metrics_exporter
from app.middleware.tenant_middleware import (
    TenantMiddleware, 
    TenantQuotaMiddleware, 
    TenantSecurityMiddleware
)
from app.middleware.logging_middleware import RequestLoggingMiddleware, SecurityLoggingMiddleware
from app.api import auth_api, users_api, file_management_api
from app.api.v1 import v1_router
from app.core.banner import print_startup_banner, print_shutdown_banner
import logging

# 设置结构化日志
setup_logging()
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 打印启动横幅
    print_startup_banner()
    
    # 启动时初始化
    logger.info("正在初始化企业级FastAPI应用...")
    
    # 设置系统指标收集
    setup_system_metrics()
    
    # 连接Redis
    try:
        await redis_client.connect()
        logger.info("Redis连接成功")
    except Exception as e:
        logger.error(f"Redis连接失败: {e}")
    
    # 初始化Weaviate集合
    try:
        init_collections()
        logger.info("Weaviate集合初始化成功")
    except Exception as e:
        logger.error(f"Weaviate集合初始化失败: {e}")
    
    # 测试Neo4j连接
    try:
        stats = neo4j_client.get_database_stats()
        logger.info(f"Neo4j连接正常，数据库统计: {stats}")
    except Exception as e:
        logger.error(f"Neo4j连接失败: {e}")
    
    logger.info("企业级FastAPI应用初始化完成")
    
    yield
    
    # 打印关闭横幅
    print_shutdown_banner()
    
    # 关闭时清理
    logger.info("正在关闭企业级FastAPI应用...")
    try:
        await redis_client.disconnect()
        logger.info("Redis连接已断开")
    except Exception as e:
        logger.error(f"Redis断开连接失败: {e}")
    
    try:
        neo4j_client.close()
        logger.info("Neo4j连接已断开")
    except Exception as e:
        logger.error(f"Neo4j断开连接失败: {e}")
    
    logger.info("企业级FastAPI应用已关闭")

# 创建FastAPI应用实例
app = FastAPI(
    title="ChatX Enterprise API",
    description="ChatX Backend API - 企业级多租户版本，支持用户认证、文件管理、向量搜索等功能",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# 注册异常处理器
register_exception_handlers(app)

# 添加中间件（顺序很重要）
# 1. 安全日志中间件（最先）
app.add_middleware(SecurityLoggingMiddleware)

# 2. 请求日志中间件
app.add_middleware(
    RequestLoggingMiddleware,
    exclude_paths=["/health", "/metrics", "/docs", "/redoc", "/openapi.json"],
    log_request_body=settings.ENVIRONMENT == "development",
    log_response_body=settings.ENVIRONMENT == "development"
)

# 3. 租户中间件
app.add_middleware(
    TenantMiddleware,
    exclude_paths=[
        "/", 
        "/health", 
        "/metrics", 
        "/docs", 
        "/redoc", 
        "/openapi.json",
        "/api/system"
    ]
)

# 4. 租户安全中间件
app.add_middleware(TenantSecurityMiddleware)

# 5. 租户配额中间件
app.add_middleware(TenantQuotaMiddleware)

# 6. CORS中间件（最后）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由注册
# V1 API路由（推荐使用）
app.include_router(v1_router)

# 旧版API路由（向后兼容，将来会废弃）
app.include_router(auth_api.router, prefix="/api/auth", tags=["legacy-auth"])
app.include_router(users_api.router, prefix="/api/users", tags=["legacy-users"])
app.include_router(file_management_api.router, prefix="/api/files", tags=["legacy-files"])

# 根路径
@app.get("/", tags=["system"])
async def root():
    return {
        "message": "Welcome to ChatX Enterprise API",
        "version": "1.0.0",
        "api_docs": "/docs" if settings.ENVIRONMENT != "production" else "Contact administrator",
        "features": [
            "多租户架构",
            "企业级安全",
            "结构化日志",
            "性能监控",
            "文件管理",
            "向量搜索",
            "知识图谱"
        ]
    }

# 健康检查
@app.get("/health", tags=["system"])
async def health_check():
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
            "neo4j": "connected"
        },
        "metrics": {
            "total_requests": metrics_summary.get("http.requests.total", {}).get("current", 0),
            "error_rate": metrics_summary.get("http.error_rate", {}).get("current", 0),
            "active_tenants": metrics_summary.get("tenants.active", {}).get("current", 0)
        }
    }

# 指标端点（Prometheus格式）
@app.get("/metrics", tags=["system"])
async def metrics():
    """Prometheus格式的指标端点"""
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=metrics_exporter.export_prometheus(),
        media_type="text/plain"
    )

# 系统信息端点
@app.get("/system/info", tags=["system"])
async def system_info():
    """系统信息"""
    import platform
    import sys
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
            "api_versioning": True
        }
    }