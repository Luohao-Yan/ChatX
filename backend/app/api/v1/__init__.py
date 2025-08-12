"""
API Version 1
企业级API版本管理
"""

from fastapi import APIRouter
from app.api.endpoints.v1 import users_api, files_api, role_api, permission_api, auth_api, recycle_bin_api, cache_api

# 创建 v1 API 路由
v1_router = APIRouter(prefix="/api/v1", tags=["v1"])

# 包含各个模块的路由
v1_router.include_router(auth_api.router, prefix="/auth", tags=["v1-auth"])
v1_router.include_router(users_api.router, prefix="/users", tags=["v1-users"])
v1_router.include_router(files_api.router, prefix="/files", tags=["v1-files"])
v1_router.include_router(role_api.router, prefix="/roles", tags=["v1-roles"])
v1_router.include_router(permission_api.router, prefix="/permissions", tags=["v1-permissions"])
v1_router.include_router(recycle_bin_api.router, prefix="/recycle-bin", tags=["v1-recycle-bin"])
v1_router.include_router(cache_api.router, prefix="/cache", tags=["v1-cache"])


@v1_router.get("/", tags=["v1-info"])
async def v1_info():
    """API v1 版本信息"""
    return {
        "version": "1.0.0",
        "status": "stable",
        "description": "ChatX API Version 1 - 企业级多租户版本",
        "features": [
            "多租户架构",
            "统一错误处理",
            "结构化日志",
            "配额管理",
            "安全认证",
            "文件管理",
            "组织管理",
            "RBAC权限系统",
            "回收站功能",
        ],
        "deprecation_notice": None,
        "migration_guide": None,
    }


@v1_router.get("/health", tags=["v1-health"])
async def v1_health():
    """API v1 健康检查"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": "2024-01-01T00:00:00Z",
    }
