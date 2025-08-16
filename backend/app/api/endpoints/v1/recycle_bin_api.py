"""
回收站管理API
支持软删除、恢复、永久删除等操作
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional

from app.application.services.user_service import UserService
from app.application.services.file_service import FileApplicationService
from app.application.services.rbac_service import RoleApplicationService
from app.schemas.recycle_bin_schemas import (
    RecycleBinResponse,
    RecycleBinFilter,
    RecycleBinItem,
    BatchRestoreRequest,
    BatchPermanentDeleteRequest,
    OperationResult,
    RecycleBinStats,
)
from app.models.user_models import User
from app.utils.deps import (
    get_current_active_user,
    get_user_service,
    get_file_service,
    get_role_service,
)
from app.domain.initialization.permissions import require_permission, Permissions

router = APIRouter()


@router.get("/", response_model=RecycleBinResponse)
@require_permission(Permissions.RECYCLE_BIN_READ)
async def get_recycle_bin_items(
    resource_type: Optional[str] = Query(None, description="资源类型过滤"),
    page: int = Query(1, ge=1, description="页码"),
    per_page: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
    file_service: FileApplicationService = Depends(get_file_service),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """获取回收站项目列表"""
    items = []

    # 根据资源类型获取已删除的项目
    if not resource_type or resource_type == "user":
        deleted_users = await user_service.get_users_list(
            current_user,
            skip=(page - 1) * per_page,
            limit=per_page,
            include_deleted=True,
        )
        # 过滤出已删除的用户
        for user in deleted_users:
            # Check if user is soft deleted
            if user.deleted_at is not None:
                items.append(
                    {
                        "id": user.id,
                        "type": "user",
                        "name": user.username,
                        "deleted_at": user.deleted_at,
                        "deleted_by": user.deleted_by,
                    }
                )

    if not resource_type or resource_type == "role":
        deleted_roles = await role_service.get_tenant_roles(
            current_user, include_deleted=True
        )
        for role in deleted_roles:
            # Check if role is soft deleted
            if role.deleted_at is not None:
                items.append(
                    {
                        "id": role.id,
                        "type": "role",
                        "name": role.name,
                        "deleted_at": role.deleted_at,
                        "deleted_by": role.deleted_by,
                    }
                )

    return RecycleBinResponse(
        items=items, total=len(items), page=page, per_page=per_page, pages=1  # 简化处理
    )


@router.post("/restore", response_model=OperationResult)
@require_permission(Permissions.RECYCLE_BIN_RESTORE)
async def restore_items(
    restore_request: BatchRestoreRequest,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """批量恢复项目"""
    success_count = 0
    failed_items = []

    for item in restore_request.items:
        try:
            if item.resource_type == "user":
                # 恢复用户（清空删除标记）
                await user_service.user_repo.update(
                    item.resource_id,
                    {
                        "deleted_at": None,
                        "deleted_by": None,
                        "status": "active",
                        "is_active": True,
                    },
                )
                success_count += 1

            elif item.resource_type == "role":
                # 恢复角色（清空删除标记）
                await role_service.role_repo.update(
                    item.resource_id,
                    {
                        "deleted_at": None,
                        "deleted_by": None,
                        "is_active": True,
                    },
                )
                success_count += 1

        except Exception as e:
            failed_items.append(
                {
                    "resource_id": item.resource_id,
                    "resource_type": item.resource_type,
                    "error": str(e),
                }
            )

    return OperationResult(
        success=success_count > 0,
        message=f"成功恢复 {success_count} 个项目",
        success_count=success_count,
        failed_count=len(failed_items),
        failed_items=failed_items,
    )


@router.delete("/permanent", response_model=OperationResult)
@require_permission(Permissions.RECYCLE_BIN_DELETE)
async def permanent_delete_items(
    delete_request: BatchPermanentDeleteRequest,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """批量永久删除项目"""
    success_count = 0
    failed_items = []

    for item in delete_request.items:
        try:
            if item.resource_type == "user":
                # 这里应该有更复杂的逻辑，如删除用户相关数据
                # 简化处理：直接从数据库删除
                await user_service.user_repo.hard_delete(item.resource_id)
                success_count += 1

            elif item.resource_type == "role":
                await role_service.role_repo.hard_delete(item.resource_id)
                success_count += 1

        except Exception as e:
            failed_items.append(
                {
                    "resource_id": item.resource_id,
                    "resource_type": item.resource_type,
                    "error": str(e),
                }
            )

    return OperationResult(
        success=success_count > 0,
        message=f"成功永久删除 {success_count} 个项目",
        success_count=success_count,
        failed_count=len(failed_items),
        failed_items=failed_items,
    )


@router.get("/stats", response_model=RecycleBinStats)
@require_permission(Permissions.RECYCLE_BIN_READ)
async def get_recycle_bin_stats(
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """获取回收站统计信息"""
    # 获取各类型已删除项目数量
    deleted_users = await user_service.get_users_list(
        current_user, include_deleted=True
    )
    user_count = sum(1 for u in deleted_users if u.deleted_at is not None)

    deleted_roles = await role_service.get_tenant_roles(
        current_user, include_deleted=True
    )
    role_count = sum(1 for r in deleted_roles if r.deleted_at is not None)

    return RecycleBinStats(
        total_items=user_count + role_count,
        by_type={
            "user": user_count,
            "role": role_count,
            "file": 0,  # 需要文件服务支持
            "permission": 0,  # 需要权限服务支持
        },
        oldest_item_date=None,  # 简化处理
        total_size=0,  # 简化处理
    )
