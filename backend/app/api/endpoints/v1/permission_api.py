from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException

from app.application.services.rbac_service import PermissionApplicationService
from app.schemas.rbac_schemas import (
    PermissionCreate, PermissionUpdate, PermissionSchema,
    RolePermissionAssign
)
from app.models.user_models import User
from app.utils.deps import get_current_active_user, get_permission_service
from app.domain.initialization.permissions import require_permission, Permissions

router = APIRouter()


@router.post("/", response_model=PermissionSchema)
@require_permission(Permissions.PERMISSION_CREATE)
async def create_permission(
    permission_data: PermissionCreate,
    current_user: User = Depends(get_current_active_user),
    permission_service: PermissionApplicationService = Depends(get_permission_service)
):
    """创建新权限 - 薄控制器"""
    permission = await permission_service.create_permission(permission_data, current_user)
    return PermissionSchema.from_orm(permission)


@router.get("/", response_model=List[PermissionSchema])
@require_permission(Permissions.PERMISSION_READ)
async def get_permissions(
    include_deleted: bool = False,
    current_user: User = Depends(get_current_active_user),
    permission_service: PermissionApplicationService = Depends(get_permission_service)
):
    """获取权限列表 - 薄控制器"""
    permissions = await permission_service.get_all_permissions(include_deleted)
    return [PermissionSchema.from_orm(perm) for perm in permissions]


@router.get("/hierarchy")
@require_permission(Permissions.PERMISSION_READ)
async def get_permission_hierarchy(
    current_user: User = Depends(get_current_active_user),
    permission_service: PermissionApplicationService = Depends(get_permission_service)
):
    """获取权限层级结构 - 薄控制器"""
    return await permission_service.get_permission_hierarchy()


@router.get("/categories/{category}")
@require_permission(Permissions.PERMISSION_READ)
async def get_permissions_by_category(
    category: str,
    current_user: User = Depends(get_current_active_user),
    permission_service: PermissionApplicationService = Depends(get_permission_service)
):
    """根据分类获取权限 - 薄控制器"""
    permissions = await permission_service.get_permissions_by_category(category)
    return [PermissionSchema.from_orm(perm) for perm in permissions]


@router.put("/{permission_id}", response_model=PermissionSchema)
@require_permission(Permissions.PERMISSION_UPDATE)
async def update_permission(
    permission_id: int,
    permission_update: PermissionUpdate,
    current_user: User = Depends(get_current_active_user),
    permission_service: PermissionApplicationService = Depends(get_permission_service)
):
    """更新权限 - 薄控制器"""
    updated_permission = await permission_service.update_permission(
        permission_id, permission_update, current_user
    )
    if not updated_permission:
        raise HTTPException(status_code=404, detail="权限不存在")
    return PermissionSchema.from_orm(updated_permission)


@router.delete("/{permission_id}")
@require_permission(Permissions.PERMISSION_DELETE)
async def delete_permission(
    permission_id: int,
    current_user: User = Depends(get_current_active_user),
    permission_service: PermissionApplicationService = Depends(get_permission_service)
):
    """删除权限 - 薄控制器"""
    success = await permission_service.delete_permission(permission_id, current_user)
    return {"message": "权限删除成功" if success else "权限删除失败"}


@router.get("/roles/{role_id}")
@require_permission(Permissions.PERMISSION_READ)
async def get_role_permissions(
    role_id: int,
    current_user: User = Depends(get_current_active_user),
    permission_service: PermissionApplicationService = Depends(get_permission_service)
):
    """获取角色权限列表 - 薄控制器"""
    permissions = await permission_service.get_role_permissions(role_id, current_user)
    return [PermissionSchema.from_orm(perm) for perm in permissions]


@router.get("/users/{user_id}")
@require_permission(Permissions.PERMISSION_READ)
async def get_user_permissions(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    permission_service: PermissionApplicationService = Depends(get_permission_service)
):
    """获取用户权限（通过角色继承） - 薄控制器"""
    permissions = await permission_service.get_user_permissions(user_id, current_user)
    return [PermissionSchema.from_orm(perm) for perm in permissions]