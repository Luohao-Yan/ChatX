"""
回收站管理API
支持软删除、恢复、永久删除等操作
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.core.permissions import require_permission
from app.models.user_models import User, Role, Permission, UserStatus
from app.models.org_models import Organization, Department
from app.schemas.recycle_bin_schemas import (
    RecycleBinResponse, RecycleBinFilter, RecycleBinItem,
    UserRecycleBinItem, OrganizationRecycleBinItem, DepartmentRecycleBinItem,
    RoleRecycleBinItem, PermissionRecycleBinItem,
    BatchSoftDeleteRequest, BatchRestoreRequest, BatchPermanentDeleteRequest,
    UserStatusUpdateRequest, BatchUserStatusUpdateRequest,
    OperationResult, RecycleBinStats, ResourceType,
    UserResponse, OrganizationResponse, DepartmentResponse, RoleResponse, PermissionResponse
)

router = APIRouter(prefix="/recycle-bin", tags=["回收站管理"])


@router.get(
    "/",
    response_model=RecycleBinResponse,
    summary="获取回收站列表",
    description="获取回收站中的已删除项目"
)
@require_permission("recycle_bin:read")
async def get_recycle_bin_items(
    resource_type: Optional[ResourceType] = Query(None, description="资源类型筛选"),
    deleted_by: Optional[int] = Query(None, description="删除者ID筛选"),
    start_date: Optional[datetime] = Query(None, description="开始日期筛选"),
    end_date: Optional[datetime] = Query(None, description="结束日期筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页大小"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取回收站项目列表"""
    items = []
    total = 0
    
    # 构建基础查询条件
    base_conditions = [True]  # 占位符，方便后续添加条件
    
    if start_date:
        base_conditions.append(lambda table: table.deleted_at >= start_date)
    if end_date:
        base_conditions.append(lambda table: table.deleted_at <= end_date)
    if deleted_by:
        base_conditions.append(lambda table: table.deleted_by == deleted_by)
    
    # 查询用户
    if not resource_type or resource_type == ResourceType.USER:
        user_query = db.query(User).filter(
            User.tenant_id == current_user.tenant_id,
            User.is_deleted == True
        )
        
        # 应用通用筛选条件
        for condition in base_conditions:
            if condition != True:  # 跳过占位符
                user_query = user_query.filter(condition(User))
        
        # 搜索条件
        if search:
            user_query = user_query.filter(
                or_(
                    User.username.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    User.full_name.ilike(f"%{search}%")
                )
            )
        
        user_total = user_query.count()
        total += user_total
        
        if not resource_type:  # 如果没有指定类型，则分页查询
            user_items = user_query.offset((page - 1) * size).limit(size).all()
        else:
            user_items = user_query.all()
            
        for user in user_items:
            # 获取删除者信息
            deleted_by_user = None
            if user.deleted_by:
                deleted_by_user = db.query(User).filter(User.id == user.deleted_by).first()
            
            # 获取组织和部门信息
            org_name = None
            dept_name = None
            if user.org_id:
                org = db.query(Organization).filter(Organization.id == user.org_id).first()
                if org:
                    org_name = org.name
            if user.department_id:
                dept = db.query(Department).filter(Department.id == user.department_id).first()
                if dept:
                    dept_name = dept.name
            
            items.append(UserRecycleBinItem(
                id=user.id,
                resource_id=user.id,
                name=user.full_name or user.username,
                deleted_at=user.deleted_at,
                deleted_by=user.deleted_by,
                deleted_by_name=deleted_by_user.full_name if deleted_by_user else None,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                organization_name=org_name,
                department_name=dept_name,
                status=user.status,
                original_data={
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                    "phone": user.phone,
                    "position": user.position,
                    "employee_id": user.employee_id,
                    "org_id": user.org_id,
                    "department_id": user.department_id,
                    "is_active": user.is_active,
                    "is_verified": user.is_verified
                }
            ))
    
    # 查询组织
    if not resource_type or resource_type == ResourceType.ORGANIZATION:
        org_query = db.query(Organization).filter(
            Organization.tenant_id == current_user.tenant_id,
            Organization.is_deleted == True
        )
        
        # 应用通用筛选条件
        for condition in base_conditions:
            if condition != True:
                org_query = org_query.filter(condition(Organization))
        
        # 搜索条件
        if search:
            org_query = org_query.filter(
                or_(
                    Organization.name.ilike(f"%{search}%"),
                    Organization.code.ilike(f"%{search}%"),
                    Organization.description.ilike(f"%{search}%")
                )
            )
        
        org_total = org_query.count()
        total += org_total
        
        if not resource_type:
            org_items = org_query.offset(max(0, (page - 1) * size - len(items))).limit(max(0, size - len(items))).all()
        else:
            org_items = org_query.all()
            
        for org in org_items:
            # 获取删除者信息
            deleted_by_user = None
            if org.deleted_by:
                deleted_by_user = db.query(User).filter(User.id == org.deleted_by).first()
            
            # 获取统计信息
            user_count = db.query(User).filter(User.org_id == org.id).count()
            dept_count = db.query(Department).filter(Department.org_id == org.id).count()
            
            # 获取父组织名称
            parent_name = None
            if org.parent_id:
                parent = db.query(Organization).filter(Organization.id == org.parent_id).first()
                if parent:
                    parent_name = parent.name
            
            items.append(OrganizationRecycleBinItem(
                id=org.id,
                resource_id=org.id,
                name=org.name,
                deleted_at=org.deleted_at,
                deleted_by=org.deleted_by,
                deleted_by_name=deleted_by_user.full_name if deleted_by_user else None,
                code=org.code,
                description=org.description,
                parent_name=parent_name,
                user_count=user_count,
                department_count=dept_count,
                original_data={
                    "name": org.name,
                    "code": org.code,
                    "description": org.description,
                    "logo_url": org.logo_url,
                    "address": org.address,
                    "phone": org.phone,
                    "email": org.email,
                    "website": org.website,
                    "parent_id": org.parent_id,
                    "path": org.path,
                    "level": org.level,
                    "sort_order": org.sort_order,
                    "is_active": org.is_active
                }
            ))
    
    # 查询部门
    if not resource_type or resource_type == ResourceType.DEPARTMENT:
        dept_query = db.query(Department).filter(Department.is_deleted == True)
        
        # 只显示当前租户的组织下的部门
        dept_query = dept_query.join(Organization).filter(
            Organization.tenant_id == current_user.tenant_id
        )
        
        # 应用通用筛选条件
        for condition in base_conditions:
            if condition != True:
                dept_query = dept_query.filter(condition(Department))
        
        # 搜索条件
        if search:
            dept_query = dept_query.filter(
                or_(
                    Department.name.ilike(f"%{search}%"),
                    Department.code.ilike(f"%{search}%"),
                    Department.description.ilike(f"%{search}%")
                )
            )
        
        dept_total = dept_query.count()
        total += dept_total
        
        if not resource_type:
            dept_items = dept_query.offset(max(0, (page - 1) * size - len(items))).limit(max(0, size - len(items))).all()
        else:
            dept_items = dept_query.all()
            
        for dept in dept_items:
            # 获取删除者信息
            deleted_by_user = None
            if dept.deleted_by:
                deleted_by_user = db.query(User).filter(User.id == dept.deleted_by).first()
            
            # 获取组织信息
            org = db.query(Organization).filter(Organization.id == dept.org_id).first()
            org_name = org.name if org else None
            
            # 获取父部门信息
            parent_name = None
            if dept.parent_id:
                parent = db.query(Department).filter(Department.id == dept.parent_id).first()
                if parent:
                    parent_name = parent.name
            
            # 获取管理者信息
            manager_name = None
            if dept.manager_id:
                manager = db.query(User).filter(User.id == dept.manager_id).first()
                if manager:
                    manager_name = manager.full_name
            
            # 获取用户数量
            user_count = db.query(User).filter(User.department_id == dept.id).count()
            
            items.append(DepartmentRecycleBinItem(
                id=dept.id,
                resource_id=dept.id,
                name=dept.name,
                deleted_at=dept.deleted_at,
                deleted_by=dept.deleted_by,
                deleted_by_name=deleted_by_user.full_name if deleted_by_user else None,
                code=dept.code,
                description=dept.description,
                organization_name=org_name,
                parent_name=parent_name,
                manager_name=manager_name,
                user_count=user_count,
                original_data={
                    "name": dept.name,
                    "code": dept.code,
                    "description": dept.description,
                    "org_id": dept.org_id,
                    "parent_id": dept.parent_id,
                    "path": dept.path,
                    "level": dept.level,
                    "sort_order": dept.sort_order,
                    "manager_id": dept.manager_id,
                    "phone": dept.phone,
                    "email": dept.email,
                    "address": dept.address,
                    "is_active": dept.is_active
                }
            ))
    
    # 查询角色
    if not resource_type or resource_type == ResourceType.ROLE:
        role_query = db.query(Role).filter(
            Role.tenant_id == current_user.tenant_id,
            Role.is_deleted == True
        )
        
        # 应用通用筛选条件
        for condition in base_conditions:
            if condition != True:
                role_query = role_query.filter(condition(Role))
        
        # 搜索条件
        if search:
            role_query = role_query.filter(
                or_(
                    Role.name.ilike(f"%{search}%"),
                    Role.display_name.ilike(f"%{search}%"),
                    Role.description.ilike(f"%{search}%")
                )
            )
        
        role_total = role_query.count()
        total += role_total
        
        if not resource_type:
            role_items = role_query.offset(max(0, (page - 1) * size - len(items))).limit(max(0, size - len(items))).all()
        else:
            role_items = role_query.all()
            
        for role in role_items:
            # 获取删除者信息
            deleted_by_user = None
            if role.deleted_by:
                deleted_by_user = db.query(User).filter(User.id == role.deleted_by).first()
            
            # 获取统计信息
            user_count = len(role.users)
            permission_count = len(role.permissions)
            
            items.append(RoleRecycleBinItem(
                id=role.id,
                resource_id=role.id,
                name=role.name,
                deleted_at=role.deleted_at,
                deleted_by=role.deleted_by,
                deleted_by_name=deleted_by_user.full_name if deleted_by_user else None,
                display_name=role.display_name,
                description=role.description,
                role_type=role.role_type,
                level=role.level,
                user_count=user_count,
                permission_count=permission_count,
                original_data={
                    "name": role.name,
                    "display_name": role.display_name,
                    "description": role.description,
                    "role_type": role.role_type,
                    "level": role.level,
                    "is_active": role.is_active,
                    "is_system": role.is_system,
                    "is_default": role.is_default,
                    "parent_id": role.parent_id,
                    "max_users": role.max_users
                }
            ))
    
    # 查询权限
    if not resource_type or resource_type == ResourceType.PERMISSION:
        perm_query = db.query(Permission).filter(Permission.is_deleted == True)
        
        # 应用通用筛选条件
        for condition in base_conditions:
            if condition != True:
                perm_query = perm_query.filter(condition(Permission))
        
        # 搜索条件
        if search:
            perm_query = perm_query.filter(
                or_(
                    Permission.name.ilike(f"%{search}%"),
                    Permission.display_name.ilike(f"%{search}%"),
                    Permission.description.ilike(f"%{search}%")
                )
            )
        
        perm_total = perm_query.count()
        total += perm_total
        
        if not resource_type:
            perm_items = perm_query.offset(max(0, (page - 1) * size - len(items))).limit(max(0, size - len(items))).all()
        else:
            perm_items = perm_query.all()
            
        for perm in perm_items:
            # 获取删除者信息
            deleted_by_user = None
            if perm.deleted_by:
                deleted_by_user = db.query(User).filter(User.id == perm.deleted_by).first()
            
            items.append(PermissionRecycleBinItem(
                id=perm.id,
                resource_id=perm.id,
                name=perm.name,
                deleted_at=perm.deleted_at,
                deleted_by=perm.deleted_by,
                deleted_by_name=deleted_by_user.full_name if deleted_by_user else None,
                display_name=perm.display_name,
                description=perm.description,
                resource_type_name=perm.resource_type,
                action=perm.action,
                category=perm.category,
                original_data={
                    "name": perm.name,
                    "display_name": perm.display_name,
                    "description": perm.description,
                    "resource_type": perm.resource_type,
                    "action": perm.action,
                    "category": perm.category,
                    "group_name": perm.group_name,
                    "parent_id": perm.parent_id,
                    "is_system": perm.is_system,
                    "is_active": perm.is_active,
                    "require_owner": perm.require_owner,
                    "conditions": perm.conditions
                }
            ))
    
    # 按删除时间排序
    items.sort(key=lambda x: x.deleted_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    
    # 如果指定了资源类型，进行分页
    if resource_type:
        offset = (page - 1) * size
        items = items[offset:offset + size]
    
    return RecycleBinResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        has_next=total > page * size,
        has_prev=page > 1
    )


@router.get(
    "/stats",
    response_model=RecycleBinStats,
    summary="回收站统计信息",
    description="获取回收站的统计信息"
)
@require_permission("recycle_bin:read")
async def get_recycle_bin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取回收站统计信息"""
    stats = {"total_items": 0, "by_type": {}, "by_date": {}, "by_user": {}}
    
    # 统计各类型数量
    user_count = db.query(User).filter(
        User.tenant_id == current_user.tenant_id,
        User.is_deleted == True
    ).count()
    stats["by_type"][ResourceType.USER] = user_count
    stats["total_items"] += user_count
    
    org_count = db.query(Organization).filter(
        Organization.tenant_id == current_user.tenant_id,
        Organization.is_deleted == True
    ).count()
    stats["by_type"][ResourceType.ORGANIZATION] = org_count
    stats["total_items"] += org_count
    
    # 部门统计（通过组织关联）
    dept_count = db.query(Department).join(Organization).filter(
        Organization.tenant_id == current_user.tenant_id,
        Department.is_deleted == True
    ).count()
    stats["by_type"][ResourceType.DEPARTMENT] = dept_count
    stats["total_items"] += dept_count
    
    role_count = db.query(Role).filter(
        Role.tenant_id == current_user.tenant_id,
        Role.is_deleted == True
    ).count()
    stats["by_type"][ResourceType.ROLE] = role_count
    stats["total_items"] += role_count
    
    perm_count = db.query(Permission).filter(Permission.is_deleted == True).count()
    stats["by_type"][ResourceType.PERMISSION] = perm_count
    stats["total_items"] += perm_count
    
    # 按日期统计（最近7天）
    end_date = datetime.now(timezone.utc)
    for i in range(7):
        date = end_date - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        
        daily_count = 0
        # 统计各类型当日删除数量
        daily_count += db.query(User).filter(
            User.tenant_id == current_user.tenant_id,
            User.is_deleted == True,
            func.date(User.deleted_at) == date.date()
        ).count()
        
        daily_count += db.query(Organization).filter(
            Organization.tenant_id == current_user.tenant_id,
            Organization.is_deleted == True,
            func.date(Organization.deleted_at) == date.date()
        ).count()
        
        daily_count += db.query(Department).join(Organization).filter(
            Organization.tenant_id == current_user.tenant_id,
            Department.is_deleted == True,
            func.date(Department.deleted_at) == date.date()
        ).count()
        
        daily_count += db.query(Role).filter(
            Role.tenant_id == current_user.tenant_id,
            Role.is_deleted == True,
            func.date(Role.deleted_at) == date.date()
        ).count()
        
        daily_count += db.query(Permission).filter(
            Permission.is_deleted == True,
            func.date(Permission.deleted_at) == date.date()
        ).count()
        
        stats["by_date"][date_str] = daily_count
    
    # 按删除用户统计（前5名）
    deleted_by_users = {}
    
    # 收集所有删除操作的用户
    all_deleted_by = []
    
    # 用户删除记录
    user_deletions = db.query(User.deleted_by).filter(
        User.tenant_id == current_user.tenant_id,
        User.is_deleted == True,
        User.deleted_by.isnot(None)
    ).all()
    all_deleted_by.extend([d[0] for d in user_deletions])
    
    # 组织删除记录
    org_deletions = db.query(Organization.deleted_by).filter(
        Organization.tenant_id == current_user.tenant_id,
        Organization.is_deleted == True,
        Organization.deleted_by.isnot(None)
    ).all()
    all_deleted_by.extend([d[0] for d in org_deletions])
    
    # 统计删除次数
    for user_id in set(all_deleted_by):
        count = all_deleted_by.count(user_id)
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            stats["by_user"][user.full_name or user.username] = count
    
    # 保留前5名
    stats["by_user"] = dict(sorted(stats["by_user"].items(), key=lambda x: x[1], reverse=True)[:5])
    
    return RecycleBinStats(**stats)


# 用户状态管理
@router.patch(
    "/users/{user_id}/status",
    response_model=OperationResult,
    summary="更新用户状态",
    description="更新用户状态（激活、停用、暂停等）"
)
@require_permission("user:update")
async def update_user_status(
    user_id: int,
    request: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新用户状态"""
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 记录原状态
    old_status = user.status
    
    # 更新状态
    user.status = request.status
    user.updated_at = datetime.now(timezone.utc)
    
    # 如果是停用用户，同时设置为非活跃
    if request.status == UserStatus.INACTIVE:
        user.is_active = False
    elif request.status == UserStatus.ACTIVE:
        user.is_active = True
    
    try:
        db.commit()
        return OperationResult(
            success=True,
            message=f"用户状态已从 {old_status} 更新为 {request.status}",
            success_count=1,
            failed_count=0
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新用户状态失败: {str(e)}"
        )


@router.patch(
    "/users/batch-status",
    response_model=OperationResult,
    summary="批量更新用户状态",
    description="批量更新多个用户的状态"
)
@require_permission("user:update")
async def batch_update_user_status(
    request: BatchUserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """批量更新用户状态"""
    success_count = 0
    failed_count = 0
    failed_items = []
    
    for user_id in request.user_ids:
        try:
            user = db.query(User).filter(
                User.id == user_id,
                User.tenant_id == current_user.tenant_id
            ).first()
            
            if not user:
                failed_count += 1
                failed_items.append({
                    "id": user_id,
                    "error": "用户不存在"
                })
                continue
            
            # 更新状态
            user.status = request.status
            user.updated_at = datetime.now(timezone.utc)
            
            # 如果是停用用户，同时设置为非活跃
            if request.status == UserStatus.INACTIVE:
                user.is_active = False
            elif request.status == UserStatus.ACTIVE:
                user.is_active = True
            
            success_count += 1
            
        except Exception as e:
            failed_count += 1
            failed_items.append({
                "id": user_id,
                "error": str(e)
            })
    
    try:
        db.commit()
        return OperationResult(
            success=failed_count == 0,
            message=f"成功更新 {success_count} 个用户状态，失败 {failed_count} 个",
            success_count=success_count,
            failed_count=failed_count,
            failed_items=failed_items if failed_items else None
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量更新用户状态失败: {str(e)}"
        )


# 软删除操作
@router.post(
    "/soft-delete",
    response_model=OperationResult,
    summary="批量软删除",
    description="将指定资源标记为已删除（软删除）"
)
@require_permission("recycle_bin:write")
async def batch_soft_delete(
    request: BatchSoftDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """批量软删除资源"""
    success_count = 0
    failed_count = 0
    failed_items = []
    
    for resource_id in request.resource_ids:
        try:
            resource = None
            
            if request.resource_type == ResourceType.USER:
                resource = db.query(User).filter(
                    User.id == resource_id,
                    User.tenant_id == current_user.tenant_id,
                    User.is_deleted == False
                ).first()
            elif request.resource_type == ResourceType.ORGANIZATION:
                resource = db.query(Organization).filter(
                    Organization.id == resource_id,
                    Organization.tenant_id == current_user.tenant_id,
                    Organization.is_deleted == False
                ).first()
            elif request.resource_type == ResourceType.DEPARTMENT:
                resource = db.query(Department).join(Organization).filter(
                    Department.id == resource_id,
                    Organization.tenant_id == current_user.tenant_id,
                    Department.is_deleted == False
                ).first()
            elif request.resource_type == ResourceType.ROLE:
                resource = db.query(Role).filter(
                    Role.id == resource_id,
                    Role.tenant_id == current_user.tenant_id,
                    Role.is_deleted == False,
                    Role.is_system == False  # 系统角色不能删除
                ).first()
            elif request.resource_type == ResourceType.PERMISSION:
                resource = db.query(Permission).filter(
                    Permission.id == resource_id,
                    Permission.is_deleted == False,
                    Permission.is_system == False  # 系统权限不能删除
                ).first()
            
            if not resource:
                failed_count += 1
                failed_items.append({
                    "id": resource_id,
                    "error": "资源不存在或不允许删除"
                })
                continue
            
            # 执行软删除
            resource.is_deleted = True
            resource.deleted_at = datetime.now(timezone.utc)
            resource.deleted_by = current_user.id
            
            # 如果是用户，同时设置状态为已删除
            if request.resource_type == ResourceType.USER:
                resource.status = UserStatus.DELETED
                resource.is_active = False
            
            success_count += 1
            
        except Exception as e:
            failed_count += 1
            failed_items.append({
                "id": resource_id,
                "error": str(e)
            })
    
    try:
        db.commit()
        return OperationResult(
            success=failed_count == 0,
            message=f"成功软删除 {success_count} 个资源，失败 {failed_count} 个",
            success_count=success_count,
            failed_count=failed_count,
            failed_items=failed_items if failed_items else None
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量软删除失败: {str(e)}"
        )


# 恢复操作
@router.post(
    "/restore",
    response_model=OperationResult,
    summary="批量恢复",
    description="从回收站恢复指定资源"
)
@require_permission("recycle_bin:write")
async def batch_restore(
    request: BatchRestoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """批量恢复资源"""
    success_count = 0
    failed_count = 0
    failed_items = []
    
    for resource_id in request.resource_ids:
        try:
            resource = None
            
            if request.resource_type == ResourceType.USER:
                resource = db.query(User).filter(
                    User.id == resource_id,
                    User.tenant_id == current_user.tenant_id,
                    User.is_deleted == True
                ).first()
            elif request.resource_type == ResourceType.ORGANIZATION:
                resource = db.query(Organization).filter(
                    Organization.id == resource_id,
                    Organization.tenant_id == current_user.tenant_id,
                    Organization.is_deleted == True
                ).first()
            elif request.resource_type == ResourceType.DEPARTMENT:
                resource = db.query(Department).join(Organization).filter(
                    Department.id == resource_id,
                    Organization.tenant_id == current_user.tenant_id,
                    Department.is_deleted == True
                ).first()
            elif request.resource_type == ResourceType.ROLE:
                resource = db.query(Role).filter(
                    Role.id == resource_id,
                    Role.tenant_id == current_user.tenant_id,
                    Role.is_deleted == True
                ).first()
            elif request.resource_type == ResourceType.PERMISSION:
                resource = db.query(Permission).filter(
                    Permission.id == resource_id,
                    Permission.is_deleted == True
                ).first()
            
            if not resource:
                failed_count += 1
                failed_items.append({
                    "id": resource_id,
                    "error": "资源不存在"
                })
                continue
            
            # 执行恢复
            resource.is_deleted = False
            resource.deleted_at = None
            resource.deleted_by = None
            resource.updated_at = datetime.now(timezone.utc)
            
            # 如果是用户，恢复为激活状态
            if request.resource_type == ResourceType.USER:
                resource.status = UserStatus.ACTIVE
                resource.is_active = True
            
            success_count += 1
            
        except Exception as e:
            failed_count += 1
            failed_items.append({
                "id": resource_id,
                "error": str(e)
            })
    
    try:
        db.commit()
        return OperationResult(
            success=failed_count == 0,
            message=f"成功恢复 {success_count} 个资源，失败 {failed_count} 个",
            success_count=success_count,
            failed_count=failed_count,
            failed_items=failed_items if failed_items else None
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量恢复失败: {str(e)}"
        )


# 永久删除操作
@router.delete(
    "/permanent-delete",
    response_model=OperationResult,
    summary="批量永久删除",
    description="从数据库中永久删除指定资源（不可恢复）"
)
@require_permission("recycle_bin:delete")
async def batch_permanent_delete(
    request: BatchPermanentDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """批量永久删除资源"""
    success_count = 0
    failed_count = 0
    failed_items = []
    
    for resource_id in request.resource_ids:
        try:
            resource = None
            
            if request.resource_type == ResourceType.USER:
                resource = db.query(User).filter(
                    User.id == resource_id,
                    User.tenant_id == current_user.tenant_id,
                    User.is_deleted == True
                ).first()
            elif request.resource_type == ResourceType.ORGANIZATION:
                resource = db.query(Organization).filter(
                    Organization.id == resource_id,
                    Organization.tenant_id == current_user.tenant_id,
                    Organization.is_deleted == True
                ).first()
            elif request.resource_type == ResourceType.DEPARTMENT:
                resource = db.query(Department).join(Organization).filter(
                    Department.id == resource_id,
                    Organization.tenant_id == current_user.tenant_id,
                    Department.is_deleted == True
                ).first()
            elif request.resource_type == ResourceType.ROLE:
                resource = db.query(Role).filter(
                    Role.id == resource_id,
                    Role.tenant_id == current_user.tenant_id,
                    Role.is_deleted == True,
                    Role.is_system == False  # 系统角色不能永久删除
                ).first()
            elif request.resource_type == ResourceType.PERMISSION:
                resource = db.query(Permission).filter(
                    Permission.id == resource_id,
                    Permission.is_deleted == True,
                    Permission.is_system == False  # 系统权限不能永久删除
                ).first()
            
            if not resource:
                failed_count += 1
                failed_items.append({
                    "id": resource_id,
                    "error": "资源不存在或不允许永久删除"
                })
                continue
            
            # 检查关联关系
            if request.resource_type == ResourceType.USER:
                # 检查是否有关联的会话、文件等
                session_count = db.query(resource.sessions).count()
                if session_count > 0:
                    # 先删除相关会话
                    for session in resource.sessions:
                        db.delete(session)
                
                # 检查文件关联
                file_count = len(resource.files) if hasattr(resource, 'files') else 0
                if file_count > 0:
                    failed_count += 1
                    failed_items.append({
                        "id": resource_id,
                        "error": f"用户还有 {file_count} 个关联文件，无法永久删除"
                    })
                    continue
                    
            elif request.resource_type == ResourceType.ORGANIZATION:
                # 检查是否有子组织或部门
                children_count = len(resource.children)
                dept_count = len(resource.departments)
                if children_count > 0 or dept_count > 0:
                    failed_count += 1
                    failed_items.append({
                        "id": resource_id,
                        "error": f"组织还有 {children_count} 个子组织和 {dept_count} 个部门，无法永久删除"
                    })
                    continue
                    
            elif request.resource_type == ResourceType.DEPARTMENT:
                # 检查是否有子部门或用户
                children_count = len(resource.children)
                user_count = len(resource.users)
                if children_count > 0 or user_count > 0:
                    failed_count += 1
                    failed_items.append({
                        "id": resource_id,
                        "error": f"部门还有 {children_count} 个子部门和 {user_count} 个用户，无法永久删除"
                    })
                    continue
                    
            elif request.resource_type == ResourceType.ROLE:
                # 检查是否有关联用户
                user_count = len(resource.users)
                if user_count > 0:
                    failed_count += 1
                    failed_items.append({
                        "id": resource_id,
                        "error": f"角色还有 {user_count} 个关联用户，无法永久删除"
                    })
                    continue
            
            # 执行永久删除
            db.delete(resource)
            success_count += 1
            
        except Exception as e:
            failed_count += 1
            failed_items.append({
                "id": resource_id,
                "error": str(e)
            })
    
    try:
        db.commit()
        return OperationResult(
            success=failed_count == 0,
            message=f"成功永久删除 {success_count} 个资源，失败 {failed_count} 个",
            success_count=success_count,
            failed_count=failed_count,
            failed_items=failed_items if failed_items else None
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量永久删除失败: {str(e)}"
        )


# 清理过期删除记录
@router.post(
    "/cleanup",
    response_model=OperationResult,
    summary="清理过期删除记录",
    description="永久删除超过指定天数的回收站记录"
)
@require_permission("recycle_bin:admin")
async def cleanup_expired_items(
    days: int = Query(30, ge=1, le=365, description="删除超过指定天数的记录"),
    resource_type: Optional[ResourceType] = Query(None, description="指定资源类型"),
    confirm: bool = Query(False, description="确认清理操作"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """清理过期的回收站记录"""
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="必须确认清理操作"
        )
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    success_count = 0
    failed_count = 0
    failed_items = []
    
    try:
        # 清理用户记录
        if not resource_type or resource_type == ResourceType.USER:
            expired_users = db.query(User).filter(
                User.tenant_id == current_user.tenant_id,
                User.is_deleted == True,
                User.deleted_at <= cutoff_date
            ).all()
            
            for user in expired_users:
                try:
                    # 清理关联数据
                    for session in user.sessions:
                        db.delete(session)
                    
                    # 检查文件关联
                    if hasattr(user, 'files') and len(user.files) > 0:
                        failed_count += 1
                        failed_items.append({
                            "type": "user",
                            "id": user.id,
                            "name": user.username,
                            "error": "还有关联文件"
                        })
                        continue
                    
                    db.delete(user)
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    failed_items.append({
                        "type": "user",
                        "id": user.id,
                        "name": user.username,
                        "error": str(e)
                    })
        
        # 清理组织记录
        if not resource_type or resource_type == ResourceType.ORGANIZATION:
            expired_orgs = db.query(Organization).filter(
                Organization.tenant_id == current_user.tenant_id,
                Organization.is_deleted == True,
                Organization.deleted_at <= cutoff_date
            ).all()
            
            for org in expired_orgs:
                try:
                    # 检查关联数据
                    if len(org.children) > 0 or len(org.departments) > 0:
                        failed_count += 1
                        failed_items.append({
                            "type": "organization",
                            "id": org.id,
                            "name": org.name,
                            "error": "还有子组织或部门"
                        })
                        continue
                    
                    db.delete(org)
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    failed_items.append({
                        "type": "organization",
                        "id": org.id,
                        "name": org.name,
                        "error": str(e)
                    })
        
        # 清理部门记录
        if not resource_type or resource_type == ResourceType.DEPARTMENT:
            expired_depts = db.query(Department).join(Organization).filter(
                Organization.tenant_id == current_user.tenant_id,
                Department.is_deleted == True,
                Department.deleted_at <= cutoff_date
            ).all()
            
            for dept in expired_depts:
                try:
                    # 检查关联数据
                    if len(dept.children) > 0 or len(dept.users) > 0:
                        failed_count += 1
                        failed_items.append({
                            "type": "department",
                            "id": dept.id,
                            "name": dept.name,
                            "error": "还有子部门或用户"
                        })
                        continue
                    
                    db.delete(dept)
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    failed_items.append({
                        "type": "department",
                        "id": dept.id,
                        "name": dept.name,
                        "error": str(e)
                    })
        
        # 清理角色记录
        if not resource_type or resource_type == ResourceType.ROLE:
            expired_roles = db.query(Role).filter(
                Role.tenant_id == current_user.tenant_id,
                Role.is_deleted == True,
                Role.deleted_at <= cutoff_date,
                Role.is_system == False
            ).all()
            
            for role in expired_roles:
                try:
                    # 检查关联用户
                    if len(role.users) > 0:
                        failed_count += 1
                        failed_items.append({
                            "type": "role",
                            "id": role.id,
                            "name": role.name,
                            "error": "还有关联用户"
                        })
                        continue
                    
                    db.delete(role)
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    failed_items.append({
                        "type": "role",
                        "id": role.id,
                        "name": role.name,
                        "error": str(e)
                    })
        
        # 清理权限记录
        if not resource_type or resource_type == ResourceType.PERMISSION:
            expired_perms = db.query(Permission).filter(
                Permission.is_deleted == True,
                Permission.deleted_at <= cutoff_date,
                Permission.is_system == False
            ).all()
            
            for perm in expired_perms:
                try:
                    db.delete(perm)
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    failed_items.append({
                        "type": "permission",
                        "id": perm.id,
                        "name": perm.name,
                        "error": str(e)
                    })
        
        db.commit()
        
        return OperationResult(
            success=failed_count == 0,
            message=f"成功清理 {success_count} 个过期记录，失败 {failed_count} 个",
            success_count=success_count,
            failed_count=failed_count,
            failed_items=failed_items if failed_items else None
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"清理操作失败: {str(e)}"
        )