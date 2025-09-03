"""
组织管理API接口
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.infrastructure.persistence.database import get_db
from app.utils.deps import get_current_active_user
from app.models.user_models import User
from app.application.services.org_service import OrgService
from app.schemas.org_schemas import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationListResponse,
    TeamCreate,
    BatchOrganizationRequest,
    BatchOperationResponse,
    TeamUpdate,
    TeamResponse,
    TeamListResponse,
    UserOrganizationCreate,
    UserTeamCreate,
    OrganizationTreeNode,
    OrganizationStatsResponse,
)
from app.core.exceptions import ValidationError, PermissionError

router = APIRouter()


def get_org_service(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
) -> OrgService:
    """获取组织服务实例"""
    return OrgService(db, current_user.id, current_user.current_tenant_id)


# ==================== 组织管理接口 ====================


@router.post("/organizations", response_model=OrganizationResponse, tags=["组织管理"])
async def create_organization(
    org_data: OrganizationCreate, 
    org_service: OrgService = Depends(get_org_service),
    current_user: User = Depends(get_current_active_user)
):
    """创建组织"""
    try:
        # 如果请求中包含tenant_id且与当前用户的租户ID不同，需要检查是否是超级管理员
        if org_data.tenant_id and org_data.tenant_id != current_user.current_tenant_id:
            if not current_user.is_superuser:
                raise HTTPException(status_code=403, detail="只有超级管理员可以跨租户创建组织")
        
        return org_service.create_organization(org_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except IntegrityError as e:
        if "duplicate key value violates unique constraint" in str(e):
            if "idx_org_tenant_name" in str(e):
                raise HTTPException(status_code=400, detail="该租户下已存在同名组织")
            else:
                raise HTTPException(status_code=400, detail="数据冲突，请检查输入信息")
        else:
            raise HTTPException(status_code=400, detail="数据完整性错误")
    except Exception as e:
        # 记录未预期的错误
        import logging
        logging.error(f"创建组织时发生未预期错误: {str(e)}")
        raise HTTPException(status_code=500, detail="服务器内部错误")


@router.get(
    "/organizations", response_model=List[OrganizationResponse], tags=["组织管理"]
)
async def get_organizations(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    parent_id: Optional[str] = Query(None, description="父组织ID"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    tenant_id: Optional[str] = Query(None, description="租户ID"),
    org_service: OrgService = Depends(get_org_service),
):
    """获取组织列表"""
    return org_service.get_organizations(
        skip=skip, limit=limit, parent_id=parent_id, search=search, tenant_id=tenant_id
    )


@router.get(
    "/organizations/recycle-bin",
    response_model=List[OrganizationResponse],
    tags=["组织管理"],
)
async def get_deleted_organizations(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    tenant_id: Optional[str] = Query(None, description="租户ID（超级管理员可指定）"),
    current_user: User = Depends(get_current_active_user),
    org_service: OrgService = Depends(get_org_service),
):
    """获取回收站中的组织列表"""
    try:
        return org_service.get_deleted_organizations(skip=skip, limit=limit, tenant_id=tenant_id)
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"获取回收站失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取回收站失败: {str(e)}")


@router.get(
    "/organizations/tree", response_model=List[OrganizationTreeNode], tags=["组织管理"]
)
async def get_organization_tree(
    root_id: Optional[str] = Query(None, description="根组织ID"),
    org_service: OrgService = Depends(get_org_service),
):
    """获取组织树结构"""
    return org_service.get_organization_tree(root_id)


@router.get(
    "/organizations/stats", response_model=OrganizationStatsResponse, tags=["组织管理"]
)
async def get_organization_stats(org_service: OrgService = Depends(get_org_service)):
    """获取组织统计信息"""
    return org_service.get_organization_stats()


@router.get(
    "/organizations/{org_id}", response_model=OrganizationResponse, tags=["组织管理"]
)
async def get_organization(
    org_id: str, org_service: OrgService = Depends(get_org_service)
):
    """获取组织详情"""
    organization = org_service.get_organization(org_id)
    if not organization:
        raise HTTPException(status_code=404, detail="组织不存在")
    return organization


@router.put(
    "/organizations/{org_id}", response_model=OrganizationResponse, tags=["组织管理"]
)
async def update_organization(
    org_id: str,
    org_data: OrganizationUpdate,
    org_service: OrgService = Depends(get_org_service),
):
    """更新组织"""
    try:
        return org_service.update_organization(org_id, org_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.delete("/organizations/{org_id}", tags=["组织管理"])
async def delete_organization(
    org_id: str, org_service: OrgService = Depends(get_org_service)
):
    """软删除组织（移至回收站）"""
    try:
        success = org_service.delete_organization(org_id)
        if success:
            return {"message": "组织已移至回收站"}
        else:
            raise HTTPException(status_code=400, detail="删除失败")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get(
    "/organizations/tree", response_model=List[OrganizationTreeNode], tags=["组织管理"]
)
async def get_organization_tree(
    root_id: Optional[str] = Query(None, description="根组织ID"),
    org_service: OrgService = Depends(get_org_service),
):
    """获取组织树结构"""
    return org_service.get_organization_tree(root_id)


@router.get(
    "/organizations/stats", response_model=OrganizationStatsResponse, tags=["组织管理"]
)
async def get_organization_stats(org_service: OrgService = Depends(get_org_service)):
    """获取组织统计信息"""
    return org_service.get_organization_stats()


# ==================== 团队管理接口 ====================


@router.post("/teams", response_model=TeamResponse, tags=["团队管理"])
async def create_team(
    team_data: TeamCreate, org_service: OrgService = Depends(get_org_service)
):
    """创建团队"""
    try:
        return org_service.create_team(team_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/teams", response_model=List[TeamResponse], tags=["团队管理"])
async def get_teams(
    organization_id: Optional[str] = Query(None, description="组织ID"),
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    org_service: OrgService = Depends(get_org_service),
):
    """获取团队列表"""
    return org_service.get_teams(
        organization_id=organization_id, skip=skip, limit=limit
    )


# ==================== 成员管理接口 ====================

# ==================== 回收站管理接口 ====================


@router.post("/organizations/{org_id}/restore", tags=["组织管理"])
async def restore_organization(
    org_id: str, org_service: OrgService = Depends(get_org_service)
):
    """从回收站恢复组织"""
    try:
        success = org_service.restore_organization(org_id)
        if success:
            return {"message": "组织恢复成功"}
        else:
            raise HTTPException(status_code=400, detail="恢复失败")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.delete("/organizations/{org_id}/permanent", tags=["组织管理"])
async def permanently_delete_organization(
    org_id: str, org_service: OrgService = Depends(get_org_service)
):
    """永久删除组织（不可恢复）"""
    try:
        success = org_service.permanently_delete_organization(org_id)
        if success:
            return {"message": "组织已永久删除"}
        else:
            raise HTTPException(status_code=400, detail="永久删除失败")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ==================== 批量操作接口 ====================


@router.post("/organizations/batch/restore", response_model=BatchOperationResponse, tags=["组织管理"])
async def batch_restore_organizations(
    request: BatchOrganizationRequest,
    org_service: OrgService = Depends(get_org_service)
):
    """批量恢复组织"""
    try:
        result = org_service.batch_restore_organizations(request.organization_ids)
        return BatchOperationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量恢复失败: {str(e)}")


@router.delete("/organizations/batch/permanent", response_model=BatchOperationResponse, tags=["组织管理"])
async def batch_permanently_delete_organizations(
    request: BatchOrganizationRequest,
    org_service: OrgService = Depends(get_org_service)
):
    """批量永久删除组织"""
    try:
        result = org_service.batch_permanently_delete_organizations(request.organization_ids)
        return BatchOperationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量删除失败: {str(e)}")


# ==================== 组织移动接口 ====================


@router.put(
    "/organizations/{org_id}/move",
    response_model=OrganizationResponse,
    tags=["组织管理"],
)
async def move_organization(
    org_id: str,
    new_parent_id: Optional[str] = None,
    org_service: OrgService = Depends(get_org_service),
):
    """移动组织到新的父级"""
    try:
        return org_service.move_organization(org_id, new_parent_id)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ==================== 成员管理接口 ====================


@router.post("/organizations/{org_id}/members", tags=["成员管理"])
async def add_user_to_organization(
    org_id: str,
    user_org_data: UserOrganizationCreate,
    org_service: OrgService = Depends(get_org_service),
):
    """添加用户到组织"""
    try:
        # 确保组织ID一致
        user_org_data.organization_id = org_id
        success = org_service.add_user_to_organization(user_org_data)
        if success:
            return {"message": "用户添加到组织成功"}
        else:
            raise HTTPException(status_code=400, detail="添加失败")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/organizations/{org_id}/members", tags=["成员管理"])
async def get_organization_members(
    org_id: str,
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    org_service: OrgService = Depends(get_org_service),
):
    """获取组织成员列表"""
    return org_service.get_organization_members(org_id, skip=skip, limit=limit)


@router.delete("/organizations/{org_id}/members/{user_id}", tags=["成员管理"])
async def remove_user_from_organization(
    org_id: str, user_id: str, org_service: OrgService = Depends(get_org_service)
):
    """从组织中移除用户"""
    try:
        success = org_service.remove_user_from_organization(org_id, user_id)
        if success:
            return {"message": "用户移除成功"}
        else:
            raise HTTPException(status_code=400, detail="移除失败")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ==================== 邀请管理接口 ====================


@router.post("/organizations/{org_id}/invitations", tags=["邀请管理"])
async def create_organization_invitation(
    org_id: str,
    invitation_data: dict,
    org_service: OrgService = Depends(get_org_service),
):
    """创建组织邀请"""
    try:
        invitation = org_service.create_invitation(
            org_id=org_id,
            invitee_email=invitation_data["invitee_email"],
            role=invitation_data.get("role", "member"),
            message=invitation_data.get("message"),
        )
        return {"message": "邀请已发送", "invitation_id": invitation["id"]}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/invitations/accept", tags=["邀请管理"])
async def accept_invitation(
    token: str, accept_data: dict, org_service: OrgService = Depends(get_org_service)
):
    """接受邀请"""
    try:
        result = org_service.accept_invitation(
            token=token,
            username=accept_data.get("username"),
            password=accept_data.get("password"),
        )
        return {"message": "邀请接受成功", "user_id": result["user_id"]}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/organizations/{org_id}/invitations", tags=["邀请管理"])
async def get_organization_invitations(
    org_id: str,
    status: Optional[str] = Query(None, description="邀请状态过滤"),
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(50, ge=1, le=200, description="返回记录数"),
    org_service: OrgService = Depends(get_org_service),
):
    """获取组织邀请列表"""
    return org_service.get_organization_invitations(
        org_id=org_id, status=status, skip=skip, limit=limit
    )
