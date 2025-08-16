"""
API路由注册模块
属于接口层，负责统一管理所有API路由的注册
"""

from fastapi import APIRouter
from app.api.endpoints.v1 import (
    auth_api, 
    users_api, 
    files_api, 
    permission_api, 
    role_api, 
    cache_api, 
    recycle_bin_api,
    user_import_api,
    org_api
)


def create_v1_router() -> APIRouter:
    """创建V1 API路由器"""
    v1_router = APIRouter(prefix="/api/v1")
    
    # 注册所有v1路由
    v1_router.include_router(auth_api.router, prefix="/auth", tags=["认证"])
    v1_router.include_router(users_api.router, prefix="/users", tags=["用户管理"])  
    v1_router.include_router(files_api.router, prefix="/files", tags=["文件管理"])
    v1_router.include_router(permission_api.router, prefix="/permissions", tags=["权限管理"])
    v1_router.include_router(role_api.router, prefix="/roles", tags=["角色管理"])
    v1_router.include_router(cache_api.router, prefix="/cache", tags=["缓存管理"])
    v1_router.include_router(recycle_bin_api.router, prefix="/recycle", tags=["回收站"])
    v1_router.include_router(user_import_api.router, prefix="/users/import", tags=["用户导入"])
    v1_router.include_router(org_api.router, prefix="/org", tags=["组织管理"])
    
    return v1_router


# 导出主路由
v1_router = create_v1_router()
__all__ = ["v1_router"]