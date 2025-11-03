"""
应用工厂模块
属于应用层，负责创建和配置FastAPI应用实例
"""

from fastapi import FastAPI
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.application.startup import lifespan
from app.application.middleware.middleware_setup import setup_middleware
from app.api.routers import v1_router
from app.api.system_routes import system_router


def create_app() -> FastAPI:
    """创建FastAPI应用实例"""
    
    # 设置结构化日志
    setup_logging()
    
    # 创建FastAPI应用实例
    app = FastAPI(
        title="ChatX Enterprise API",
        description="ChatX Backend API - 企业级多租户版本，支持用户认证、文件管理、向量搜索等功能",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    )
    
    # 配置中间件
    setup_middleware(app)
    
    # 注册路由
    app.include_router(v1_router)
    app.include_router(system_router)
    
    return app


async def create_rbac_repository():
    """创建RBAC仓库实例"""
    from app.infrastructure.repositories.rbac_repository_impl import RBACRepositoryImpl
    from app.infrastructure.persistence.database import get_async_session

    # 获取数据库会话
    async with get_async_session() as session:
        return RBACRepositoryImpl(session)


__all__ = ["create_app", "create_rbac_repository"]