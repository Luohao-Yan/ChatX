"""
权限管理 API
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import require_permission, get_permission_manager, PermissionManager, Permissions
from app.models.user_models import User, Permission, UserPermission
from app.schemas.rbac_schemas import (
    PermissionCreate, PermissionUpdate, PermissionSchema,
    UserPermissionAssign, UserPermissionSchema
)
from app.utils.deps import get_current_active_user

router = APIRouter()


@router.post("/", response_model=PermissionSchema)
@require_permission(Permissions.PERMISSION_CREATE)
async def create_permission(
    permission_in: PermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """创建新权限"""
    # 检查权限名是否已存在
    existing_permission = db.query(Permission).filter(
        Permission.name == permission_in.name
    ).first()
    
    if existing_permission:
        raise HTTPException(
            status_code=400,
            detail="权限名已存在"
        )
    
    # 创建权限
    permission = Permission(
        name=permission_in.name,
        display_name=permission_in.display_name,
        description=permission_in.description,
        resource_type=permission_in.resource_type,
        action=permission_in.action,
        category=permission_in.category,
        group_name=permission_in.group_name,
        parent_id=permission_in.parent_id,
        require_owner=permission_in.require_owner or False,
        conditions=permission_in.conditions
    )
    
    db.add(permission)
    db.commit()
    db.refresh(permission)
    
    return permission


@router.get("/", response_model=List[PermissionSchema])
@require_permission(Permissions.PERMISSION_READ)
async def list_permissions(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    resource_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取权限列表"""
    query = db.query(Permission).filter(Permission.is_active == True)
    
    if category:
        query = query.filter(Permission.category == category)
    
    if resource_type:
        query = query.filter(Permission.resource_type == resource_type)
    
    permissions = query.offset(skip).limit(limit).all()
    
    return permissions


@router.get("/{permission_id}", response_model=PermissionSchema)
@require_permission(Permissions.PERMISSION_READ)
async def get_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取指定权限"""
    permission = db.query(Permission).filter(
        Permission.id == permission_id,
        Permission.is_active == True
    ).first()
    
    if not permission:
        raise HTTPException(status_code=404, detail="权限不存在")
    
    return permission


@router.put("/{permission_id}", response_model=PermissionSchema)
@require_permission(Permissions.PERMISSION_UPDATE)
async def update_permission(
    permission_id: int,
    permission_update: PermissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """更新权限"""
    permission = db.query(Permission).filter(
        Permission.id == permission_id
    ).first()
    
    if not permission:
        raise HTTPException(status_code=404, detail="权限不存在")
    
    # 检查是否为系统权限
    if permission.is_system and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="无法修改系统权限")
    
    # 更新权限信息
    update_data = permission_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(permission, field, value)
    
    db.commit()
    db.refresh(permission)
    
    return permission


@router.delete("/{permission_id}")
@require_permission(Permissions.PERMISSION_DELETE)
async def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """删除权限"""
    permission = db.query(Permission).filter(
        Permission.id == permission_id
    ).first()
    
    if not permission:
        raise HTTPException(status_code=404, detail="权限不存在")
    
    # 检查是否为系统权限
    if permission.is_system and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="无法删除系统权限")
    
    # 软删除
    permission.is_active = False
    db.commit()
    
    return {"message": "权限删除成功"}


@router.get("/categories/", response_model=List[dict])
@require_permission(Permissions.PERMISSION_READ)
async def get_permission_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取权限分类列表"""
    categories = db.query(Permission.category).filter(
        Permission.is_active == True,
        Permission.category.isnot(None)
    ).distinct().all()
    
    category_list = [
        {"name": cat[0], "count": 0} for cat in categories if cat[0]
    ]
    
    # 统计每个分类的权限数量
    for category in category_list:
        count = db.query(Permission).filter(
            Permission.category == category["name"],
            Permission.is_active == True
        ).count()
        category["count"] = count
    
    return category_list


@router.post("/users/{user_id}/assign", response_model=dict)
@require_permission(Permissions.PERMISSION_ASSIGN)
async def assign_permission_to_user(
    user_id: int,
    assignment: UserPermissionAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    permission_manager: PermissionManager = Depends(get_permission_manager)
):
    """为用户直接分配权限"""
    # 检查用户是否存在
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id,
        User.is_active == True
    ).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 检查权限是否存在
    permission = db.query(Permission).filter(
        Permission.id == assignment.permission_id,
        Permission.is_active == True
    ).first()
    
    if not permission:
        raise HTTPException(status_code=404, detail="权限不存在")
    
    # 分配权限
    success = permission_manager.grant_permission_to_user(
        user_id=user_id,
        permission_name=permission.name,
        granted_by=current_user.id,
        resource_id=assignment.resource_id,
        expires_at=assignment.expires_at
    )
    
    if success:
        return {"message": f"成功为用户分配权限: {permission.display_name}"}
    else:
        raise HTTPException(status_code=500, detail="权限分配失败")


@router.delete("/users/{user_id}/permissions/{permission_id}")
@require_permission(Permissions.PERMISSION_ASSIGN)
async def revoke_user_permission(
    user_id: int,
    permission_id: int,
    resource_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """撤销用户的直接权限"""
    # 检查用户权限是否存在
    user_permission = db.query(UserPermission).filter(
        UserPermission.user_id == user_id,
        UserPermission.permission_id == permission_id,
        UserPermission.resource_id == resource_id,
        UserPermission.is_active == True
    ).first()
    
    if not user_permission:
        raise HTTPException(status_code=404, detail="用户权限不存在")
    
    # 撤销权限
    user_permission.granted = False
    user_permission.is_active = False
    
    db.commit()
    
    return {"message": "用户权限已撤销"}


@router.get("/users/{user_id}/permissions", response_model=List[UserPermissionSchema])
@require_permission(Permissions.PERMISSION_READ)
async def get_user_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    permission_manager: PermissionManager = Depends(get_permission_manager)
):
    """获取用户的所有权限（包括角色权限）"""
    # 检查用户是否存在
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 获取用户所有权限
    all_permissions = permission_manager.get_user_permissions(target_user)
    
    # 获取权限详细信息
    permissions_detail = db.query(Permission).filter(
        Permission.name.in_(all_permissions),
        Permission.is_active == True
    ).all()
    
    # 获取直接权限
    direct_permissions = db.query(UserPermission).join(Permission).filter(
        UserPermission.user_id == user_id,
        UserPermission.is_active == True,
        UserPermission.granted == True,
        Permission.is_active == True
    ).all()
    
    result = []
    for permission in permissions_detail:
        # 检查是否为直接权限
        direct_perm = None
        for dp in direct_permissions:
            if dp.permission_id == permission.id:
                direct_perm = dp
                break
        
        result.append({
            "permission": permission,
            "source": "direct" if direct_perm else "role",
            "resource_id": direct_perm.resource_id if direct_perm else None,
            "expires_at": direct_perm.expires_at if direct_perm else None,
            "granted_by": direct_perm.granter.username if direct_perm and direct_perm.granter else None
        })
    
    return result


@router.get("/users/{user_id}/check", response_model=dict)
@require_permission(Permissions.PERMISSION_READ)
async def check_user_permission(
    user_id: int,
    permission_name: str,
    resource_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    permission_manager: PermissionManager = Depends(get_permission_manager)
):
    """检查用户是否有指定权限"""
    # 检查用户是否存在
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 检查权限
    has_permission = permission_manager.has_permission(
        target_user, permission_name, resource_id
    )
    
    return {
        "user_id": user_id,
        "permission": permission_name,
        "resource_id": resource_id,
        "has_permission": has_permission
    }