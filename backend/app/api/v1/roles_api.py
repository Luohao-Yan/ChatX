"""
角色管理 API
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import require_permission, get_permission_manager, PermissionManager, Permissions
from app.models.user_models import User, Role, Permission
from app.schemas.rbac_schemas import (
    RoleCreate, RoleUpdate, RoleSchema, 
    RolePermissionAssign, UserRoleAssign
)
from app.utils.deps import get_current_active_user

router = APIRouter()


@router.post("/", response_model=RoleSchema)
@require_permission(Permissions.ROLE_CREATE)
async def create_role(
    role_in: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """创建新角色"""
    # 检查角色名是否已存在（同租户内）
    existing_role = db.query(Role).filter(
        Role.tenant_id == current_user.tenant_id,
        Role.name == role_in.name
    ).first()
    
    if existing_role:
        raise HTTPException(
            status_code=400,
            detail="角色名已存在"
        )
    
    # 创建角色
    role = Role(
        tenant_id=current_user.tenant_id,
        name=role_in.name,
        display_name=role_in.display_name,
        description=role_in.description,
        role_type=role_in.role_type or "custom",
        level=role_in.level or 0,
        parent_id=role_in.parent_id,
        max_users=role_in.max_users,
        created_by=current_user.id
    )
    
    db.add(role)
    db.commit()
    db.refresh(role)
    
    return role


@router.get("/", response_model=List[RoleSchema])
@require_permission(Permissions.ROLE_READ)
async def list_roles(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取角色列表"""
    roles = db.query(Role).filter(
        Role.tenant_id == current_user.tenant_id,
        Role.is_active == True
    ).offset(skip).limit(limit).all()
    
    return roles


@router.get("/{role_id}", response_model=RoleSchema)
@require_permission(Permissions.ROLE_READ)
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取指定角色"""
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.tenant_id == current_user.tenant_id
    ).first()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    return role


@router.put("/{role_id}", response_model=RoleSchema)
@require_permission(Permissions.ROLE_UPDATE)
async def update_role(
    role_id: int,
    role_update: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """更新角色"""
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.tenant_id == current_user.tenant_id
    ).first()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    # 检查是否为系统角色
    if role.is_system and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="无法修改系统角色")
    
    # 更新角色信息
    update_data = role_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
    
    db.commit()
    db.refresh(role)
    
    return role


@router.delete("/{role_id}")
@require_permission(Permissions.ROLE_DELETE)
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """删除角色"""
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.tenant_id == current_user.tenant_id
    ).first()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    # 检查是否为系统角色
    if role.is_system and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="无法删除系统角色")
    
    # 检查角色是否还有用户
    if role.users:
        raise HTTPException(status_code=400, detail="角色下还有用户，无法删除")
    
    db.delete(role)
    db.commit()
    
    return {"message": "角色删除成功"}


@router.post("/{role_id}/permissions", response_model=dict)
@require_permission(Permissions.ROLE_UPDATE)
async def assign_permissions_to_role(
    role_id: int,
    assignment: RolePermissionAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """为角色分配权限"""
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.tenant_id == current_user.tenant_id
    ).first()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    # 获取权限对象
    permissions = db.query(Permission).filter(
        Permission.id.in_(assignment.permission_ids),
        Permission.is_active == True
    ).all()
    
    if len(permissions) != len(assignment.permission_ids):
        raise HTTPException(status_code=400, detail="部分权限不存在")
    
    # 清除现有权限并分配新权限
    role.permissions.clear()
    role.permissions.extend(permissions)
    
    db.commit()
    
    return {"message": f"已为角色分配 {len(permissions)} 个权限"}


@router.get("/{role_id}/permissions", response_model=List[dict])
@require_permission(Permissions.ROLE_READ)
async def get_role_permissions(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取角色的权限列表"""
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.tenant_id == current_user.tenant_id
    ).first()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    permissions = [
        {
            "id": p.id,
            "name": p.name,
            "display_name": p.display_name,
            "resource_type": p.resource_type,
            "action": p.action,
            "category": p.category
        }
        for p in role.permissions if p.is_active
    ]
    
    return permissions


@router.post("/{role_id}/users", response_model=dict)
@require_permission(Permissions.ROLE_ASSIGN)
async def assign_role_to_users(
    role_id: int,
    assignment: UserRoleAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    permission_manager: PermissionManager = Depends(get_permission_manager)
):
    """为用户分配角色"""
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.tenant_id == current_user.tenant_id
    ).first()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    # 获取用户列表
    users = db.query(User).filter(
        User.id.in_(assignment.user_ids),
        User.tenant_id == current_user.tenant_id,
        User.is_active == True
    ).all()
    
    if len(users) != len(assignment.user_ids):
        raise HTTPException(status_code=400, detail="部分用户不存在")
    
    success_count = 0
    for user in users:
        if permission_manager.assign_role_to_user(
            user.id, role.id, current_user.id, assignment.expires_at
        ):
            success_count += 1
    
    return {"message": f"成功为 {success_count} 个用户分配角色"}


@router.get("/{role_id}/users", response_model=List[dict])
@require_permission(Permissions.ROLE_READ)
async def get_role_users(
    role_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取拥有指定角色的用户列表"""
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.tenant_id == current_user.tenant_id
    ).first()
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    users = db.query(User).join(User.roles).filter(
        Role.id == role_id,
        User.is_active == True
    ).offset(skip).limit(limit).all()
    
    user_list = [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active
        }
        for user in users
    ]
    
    return user_list