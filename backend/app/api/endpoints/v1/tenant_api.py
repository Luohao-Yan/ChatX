"""
租户管理API接口
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.infrastructure.persistence.database import get_db
from app.utils.deps import get_current_active_user
from app.models.user_models import User
from app.application.services.tenant_service import TenantApplicationService
from app.schemas.tenant_schemas import (
    TenantCreate,
    TenantUpdate,
    TenantResponse,
    TenantStatsResponse,
    TenantUserCreate,
    TenantUserResponse,
    TenantBackupCreate,
    TenantBackupResponse,
)
from app.core.exceptions import ValidationError, PermissionError, NotFoundError

router = APIRouter()


def get_tenant_service(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
) -> TenantApplicationService:
    """获取租户服务实例"""
    return TenantApplicationService(db, current_user.id)


@router.post("/", response_model=TenantResponse, tags=["租户管理"])
async def create_tenant(
    tenant_data: TenantCreate,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """创建新租户"""
    try:
        tenant = tenant_service.create_tenant(tenant_data)
        return TenantResponse.from_orm(tenant)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建租户失败: {str(e)}")


@router.get("/", response_model=List[TenantResponse], tags=["租户管理"])
async def get_tenants(
    include_deleted: bool = Query(False, description="是否包含已删除的租户"),
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """获取租户列表"""
    try:
        tenants = tenant_service.get_tenants(include_deleted)
        return [TenantResponse.from_orm(tenant) for tenant in tenants]
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取租户列表失败: {str(e)}")


@router.get("/{tenant_id}", response_model=TenantResponse, tags=["租户管理"])
async def get_tenant(
    tenant_id: str,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """获取租户详情"""
    try:
        tenant = tenant_service.get_tenant_by_id(tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="租户不存在")
        return TenantResponse.from_orm(tenant)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取租户详情失败: {str(e)}")


@router.put("/{tenant_id}", response_model=TenantResponse, tags=["租户管理"])
async def update_tenant(
    tenant_id: str,
    tenant_update: TenantUpdate,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """更新租户信息"""
    try:
        tenant = tenant_service.update_tenant(tenant_id, tenant_update)
        if not tenant:
            raise HTTPException(status_code=404, detail="租户不存在")
        return TenantResponse.from_orm(tenant)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新租户失败: {str(e)}")


@router.delete("/{tenant_id}", tags=["租户管理"])
async def delete_tenant(
    tenant_id: str,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """软删除租户"""
    try:
        success = tenant_service.delete_tenant(tenant_id)
        if not success:
            raise HTTPException(status_code=404, detail="租户不存在")
        return {"message": "租户删除成功"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除租户失败: {str(e)}")


@router.get("/{tenant_id}/stats", response_model=TenantStatsResponse, tags=["租户管理"])
async def get_tenant_stats(
    tenant_id: str,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """获取租户统计信息"""
    try:
        stats = tenant_service.get_tenant_stats(tenant_id)
        if not stats:
            raise HTTPException(status_code=404, detail="租户不存在")
        return stats
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取租户统计失败: {str(e)}")


# ==================== 租户用户管理接口 ====================


@router.post(
    "/{tenant_id}/users", response_model=TenantUserResponse, tags=["租户用户管理"]
)
async def add_user_to_tenant(
    tenant_id: str,
    user_data: TenantUserCreate,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """将用户添加到租户"""
    try:
        tenant_user = tenant_service.add_user_to_tenant(tenant_id, user_data)
        return TenantUserResponse.from_orm(tenant_user)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加用户到租户失败: {str(e)}")


@router.delete("/{tenant_id}/users/{user_id}", tags=["租户用户管理"])
async def remove_user_from_tenant(
    tenant_id: str,
    user_id: str,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """从租户中移除用户"""
    try:
        success = tenant_service.remove_user_from_tenant(tenant_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="用户不在该租户中")
        return {"message": "用户移除成功"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"移除用户失败: {str(e)}")


@router.get(
    "/{tenant_id}/users", response_model=List[TenantUserResponse], tags=["租户用户管理"]
)
async def get_tenant_users(
    tenant_id: str,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """获取租户用户列表"""
    try:
        tenant_users = tenant_service.get_tenant_users(tenant_id)
        return [TenantUserResponse.from_orm(tu) for tu in tenant_users]
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取租户用户列表失败: {str(e)}")


# ==================== 租户备份管理接口 ====================


@router.post(
    "/{tenant_id}/backup", response_model=TenantBackupResponse, tags=["租户备份管理"]
)
async def backup_tenant(
    tenant_id: str,
    backup_data: TenantBackupCreate,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """备份租户"""
    try:
        backup_record = tenant_service.backup_tenant(
            tenant_id, 
            backup_data.backup_name, 
            backup_data.description
        )
        return TenantBackupResponse.from_orm(backup_record)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"备份租户失败: {str(e)}")


@router.get(
    "/{tenant_id}/backups", response_model=List[TenantBackupResponse], tags=["租户备份管理"]
)
async def get_tenant_backups(
    tenant_id: str,
    tenant_service: TenantApplicationService = Depends(get_tenant_service),
):
    """获取租户备份列表"""
    try:
        backups = tenant_service.get_tenant_backups(tenant_id)
        return [TenantBackupResponse.from_orm(backup) for backup in backups]
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取租户备份列表失败: {str(e)}")
