"""
组织管理API接口
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.infrastructure.persistence.database import get_db
from app.utils.deps import get_current_active_user
from app.models.user_models import User
from app.application.services.org_service import OrgService
from app.schemas.org_schemas import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse, OrganizationListResponse,
    TeamCreate, TeamUpdate, TeamResponse, TeamListResponse,
    UserOrganizationCreate, UserTeamCreate,
    OrganizationTreeNode, OrganizationStatsResponse
)
from app.core.exceptions import ValidationError, PermissionError

router = APIRouter()


def get_org_service(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> OrgService:
    """获取组织服务实例"""
    return OrgService(db, current_user.id, current_user.tenant_id)


# ==================== 组织管理接口 ====================

@router.post("/organizations", response_model=OrganizationResponse, tags=["组织管理"])
async def create_organization(
    org_data: OrganizationCreate,
    org_service: OrgService = Depends(get_org_service)
):
    """创建组织"""
    try:
        return org_service.create_organization(org_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/organizations", response_model=List[OrganizationResponse], tags=["组织管理"])
async def get_organizations(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    parent_id: Optional[str] = Query(None, description="父组织ID"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    org_service: OrgService = Depends(get_org_service)
):
    """获取组织列表"""
    return org_service.get_organizations(skip=skip, limit=limit, parent_id=parent_id, search=search)


@router.get("/organizations/{org_id}", response_model=OrganizationResponse, tags=["组织管理"])
async def get_organization(
    org_id: str,
    org_service: OrgService = Depends(get_org_service)
):
    """获取组织详情"""
    organization = org_service.get_organization(org_id)
    if not organization:
        raise HTTPException(status_code=404, detail="组织不存在")
    return organization


@router.put("/organizations/{org_id}", response_model=OrganizationResponse, tags=["组织管理"])
async def update_organization(
    org_id: str,
    org_data: OrganizationUpdate,
    org_service: OrgService = Depends(get_org_service)
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
    org_id: str,
    org_service: OrgService = Depends(get_org_service)
):
    """删除组织"""
    try:
        success = org_service.delete_organization(org_id)
        if success:
            return {"message": "组织删除成功"}
        else:
            raise HTTPException(status_code=400, detail="删除失败")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/organizations/tree", response_model=List[OrganizationTreeNode], tags=["组织管理"])
async def get_organization_tree(
    root_id: Optional[str] = Query(None, description="根组织ID"),
    org_service: OrgService = Depends(get_org_service)
):
    """获取组织树结构"""
    return org_service.get_organization_tree(root_id)


@router.get("/organizations/stats", response_model=OrganizationStatsResponse, tags=["组织管理"])
async def get_organization_stats(
    org_service: OrgService = Depends(get_org_service)
):
    """获取组织统计信息"""
    return org_service.get_organization_stats()


# ==================== 团队管理接口 ====================

@router.post("/teams", response_model=TeamResponse, tags=["团队管理"])
async def create_team(
    team_data: TeamCreate,
    org_service: OrgService = Depends(get_org_service)
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
    org_service: OrgService = Depends(get_org_service)
):
    """获取团队列表"""
    return org_service.get_teams(organization_id=organization_id, skip=skip, limit=limit)


# ==================== 成员管理接口 ====================

@router.post("/organizations/{org_id}/members", tags=["成员管理"])
async def add_user_to_organization(
    org_id: str,
    user_org_data: UserOrganizationCreate,
    org_service: OrgService = Depends(get_org_service)
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