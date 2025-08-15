"""
中间件配置模块
属于应用层，负责配置所有中间件
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.shared.monitoring.exception_handlers import register_exception_handlers
from app.middleware.tenant_middleware import (
    TenantMiddleware,
    TenantQuotaMiddleware, 
    TenantSecurityMiddleware,
)
from app.middleware.logging_middleware import (
    RequestLoggingMiddleware,
    SecurityLoggingMiddleware,
)
from app.middleware.activity_middleware import UserActivityMiddleware


def setup_middleware(app: FastAPI) -> None:
    """配置应用中间件"""
    
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
        log_response_body=settings.ENVIRONMENT == "development",
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
            "/api/system",
        ],
    )
    
    # 4. 租户安全中间件
    app.add_middleware(TenantSecurityMiddleware)
    
    # 5. 租户配额中间件
    app.add_middleware(TenantQuotaMiddleware)
    
    # 6. 用户活动跟踪中间件
    app.add_middleware(
        UserActivityMiddleware,
        exclude_paths=[
            "/",
            "/health",
            "/metrics", 
            "/docs",
            "/redoc",
            "/openapi.json",
            "/static",
            "/favicon.ico"
        ]
    )
    
    # 7. CORS中间件（最后）
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )