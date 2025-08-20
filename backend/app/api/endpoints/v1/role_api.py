from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.infrastructure.persistence.database import get_db
from app.application.services.rbac_service import RoleApplicationService
from app.schemas.rbac_schemas import (
    RoleCreate,
    RoleUpdate,
    RoleSchema,
    UserRoleAssign,
    RolePermissionAssign,
)
from app.models.user_models import User
from app.utils.deps import get_current_active_user, get_role_service
from app.domain.initialization.permissions import require_permission, Permissions

router = APIRouter()


@router.post("/", response_model=RoleSchema)
@require_permission(Permissions.ROLE_CREATE)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """创建新角色"""
    role = await role_service.create_role(role_data, current_user)
    return RoleSchema.from_orm(role)


@router.get("/", response_model=List[RoleSchema])
@require_permission(Permissions.ROLE_READ)
async def get_roles(
    include_deleted: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """获取角色列表"""
    roles = await role_service.get_tenant_roles(current_user, include_deleted)
    return [RoleSchema.from_orm(role) for role in roles]


@router.get("/hierarchy")
@require_permission(Permissions.ROLE_READ)
async def get_role_hierarchy(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """获取角色层级结构"""
    return await role_service.get_role_hierarchy(current_user)


@router.get("/{role_id}", response_model=RoleSchema)
@require_permission(Permissions.ROLE_READ)
async def get_role(
    role_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """获取角色详情"""
    role = await role_service.get_role_by_id(role_id, current_user)
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    return RoleSchema.from_orm(role)


@router.put("/{role_id}", response_model=RoleSchema)
@require_permission(Permissions.ROLE_UPDATE)
async def update_role(
    role_id: str,
    role_update: RoleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """更新角色"""
    updated_role = await role_service.update_role(role_id, role_update, current_user)
    if not updated_role:
        raise HTTPException(status_code=404, detail="角色不存在")
    return RoleSchema.from_orm(updated_role)


@router.delete("/{role_id}")
@require_permission(Permissions.ROLE_DELETE)
async def delete_role(
    role_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """删除角色"""
    success = await role_service.delete_role(role_id, current_user)
    return {"message": "角色删除成功" if success else "角色删除失败"}


@router.post("/{role_id}/users")
@require_permission(Permissions.ROLE_ASSIGN)
async def assign_user_role(
    role_id: str,
    assign_data: UserRoleAssign,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """分配用户角色"""
    # 设置角色ID
    assign_data.role_id = role_id

    success = await role_service.assign_user_role(assign_data, current_user)
    return {"message": "角色分配成功" if success else "角色分配失败"}


@router.delete("/{role_id}/users/{user_id}")
@require_permission(Permissions.ROLE_ASSIGN)
async def revoke_user_role(
    role_id: str,
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """撤销用户角色"""
    success = await role_service.revoke_user_role(user_id, role_id, current_user)
    return {"message": "角色撤销成功" if success else "角色撤销失败"}


@router.get("/{role_id}/users")
@require_permission(Permissions.ROLE_READ)
async def get_role_users(
    role_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """获取角色用户列表"""
    return await role_service.get_role_users(role_id, current_user)


# ==================== 权限管理接口 ====================

@router.get("/permissions")
@require_permission(Permissions.ROLE_READ)
async def get_all_permissions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """获取所有可用权限"""
    return await role_service.get_all_permissions(current_user)


@router.post("/{role_id}/permissions")
@require_permission(Permissions.ROLE_UPDATE)
async def assign_role_permissions(
    role_id: str,
    permission_data: RolePermissionAssign,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """分配角色权限"""
    permission_data.role_id = role_id
    success = await role_service.assign_role_permissions(permission_data, current_user)
    return {"message": "权限分配成功" if success else "权限分配失败"}


@router.delete("/{role_id}/permissions/{permission_id}")
@require_permission(Permissions.ROLE_UPDATE)
async def revoke_role_permission(
    role_id: str,
    permission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """撤销角色权限"""
    success = await role_service.revoke_role_permission(role_id, permission_id, current_user)
    return {"message": "权限撤销成功" if success else "权限撤销失败"}


@router.get("/{role_id}/permissions")
@require_permission(Permissions.ROLE_READ)
async def get_role_permissions(
    role_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """获取角色权限列表"""
    return await role_service.get_role_permissions(role_id, current_user)


# ==================== 角色层级管理接口 ====================

@router.post("/{role_id}/inherit/{parent_role_id}")
@require_permission(Permissions.ROLE_UPDATE)
async def set_role_inheritance(
    role_id: str,
    parent_role_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """设置角色继承关系"""
    success = await role_service.set_role_inheritance(role_id, parent_role_id, current_user)
    return {"message": "角色继承设置成功" if success else "角色继承设置失败"}


@router.delete("/{role_id}/inherit")
@require_permission(Permissions.ROLE_UPDATE)
async def remove_role_inheritance(
    role_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """移除角色继承关系"""
    success = await role_service.remove_role_inheritance(role_id, current_user)
    return {"message": "角色继承移除成功" if success else "角色继承移除失败"}


# ==================== 角色复制接口 ====================

@router.post("/{role_id}/copy")
@require_permission(Permissions.ROLE_CREATE)
async def copy_role(
    role_id: str,
    copy_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    role_service: RoleApplicationService = Depends(get_role_service),
):
    """复制角色"""
    new_role = await role_service.copy_role(
        source_role_id=role_id,
        new_name=copy_data["name"],
        new_code=copy_data["code"],
        new_description=copy_data.get("description"),
        current_user=current_user
    )
    return {"message": "角色复制成功", "role_id": new_role.id}
