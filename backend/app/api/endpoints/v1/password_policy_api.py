"""
密码策略管理API接口
提供密码策略的CRUD操作和验证服务
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.password_policy_service import PasswordPolicyService
from app.infrastructure.repositories.password_policy_repository_impl import (
    PasswordPolicyRepositoryImpl, PasswordPolicyRuleRepositoryImpl,
    PasswordPolicyApplicationRepositoryImpl, PasswordPolicyTemplateRepositoryImpl
)
from app.infrastructure.persistence.database import get_db
from app.utils.deps import get_current_active_user
from app.models.user_models import User
from app.models.password_policy_models import PolicyScopeType, PolicyStatus
from app.schemas.password_policy_schemas import (
    PasswordPolicyCreate, PasswordPolicyUpdate, PasswordPolicyResponse,
    PasswordPolicyListResponse, PasswordValidationRequest, PasswordValidationResponse,
    PasswordPolicyTemplateResponse
)
from app.core.exceptions import BusinessLogicError

# 创建路由器
router = APIRouter(prefix="/password-policies", tags=["密码策略管理"])


def get_password_policy_service(db: Session = Depends(get_db)) -> PasswordPolicyService:
    """获取密码策略服务实例"""
    policy_repo = PasswordPolicyRepositoryImpl(db)
    rule_repo = PasswordPolicyRuleRepositoryImpl(db)
    application_repo = PasswordPolicyApplicationRepositoryImpl(db)
    template_repo = PasswordPolicyTemplateRepositoryImpl(db)
    
    return PasswordPolicyService(policy_repo, rule_repo, application_repo, template_repo)


@router.post("", response_model=PasswordPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_password_policy(
    policy_data: PasswordPolicyCreate,
    current_user: User = Depends(get_current_active_user),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """创建密码策略"""
    try:
        policy = await service.create_password_policy(
            name=policy_data.name,
            description=policy_data.description,
            scope_type=policy_data.scope_type,
            scope_id=policy_data.scope_id,
            scope_name=policy_data.scope_name,
            rules=policy_data.rules,
            tenant_id=current_user.current_tenant_id,
            current_user=current_user,
            parent_policy_id=policy_data.parent_policy_id,
            override_parent=policy_data.override_parent
        )
        return PasswordPolicyResponse.model_validate(policy)
    
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建密码策略失败: {str(e)}")


@router.get("", response_model=PasswordPolicyListResponse)
async def list_password_policies(
    scope_type: Optional[PolicyScopeType] = Query(None, description="策略作用域类型"),
    status: Optional[PolicyStatus] = Query(None, description="策略状态"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0, description="跳过条数"),
    limit: int = Query(100, ge=1, le=1000, description="每页条数"),
    current_user: User = Depends(get_current_active_user),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """分页查询密码策略列表"""
    try:
        policies, total = await service.list_password_policies(
            tenant_id=current_user.current_tenant_id,
            current_user=current_user,
            scope_type=scope_type,
            status=status,
            skip=skip,
            limit=limit,
            search=search
        )
        
        return PasswordPolicyListResponse(
            items=[PasswordPolicyResponse.model_validate(policy) for policy in policies],
            total=total,
            skip=skip,
            limit=limit
        )
    
    except BusinessLogicError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询密码策略失败: {str(e)}")


@router.get("/{policy_id}", response_model=PasswordPolicyResponse)
async def get_password_policy(
    policy_id: str,
    current_user: User = Depends(get_current_active_user),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """获取密码策略详情"""
    try:
        policy = await service.policy_repo.get_policy_by_id(policy_id, current_user.current_tenant_id)
        
        if not policy:
            raise HTTPException(status_code=404, detail="密码策略不存在")
        
        return PasswordPolicyResponse.model_validate(policy)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取密码策略失败: {str(e)}")


@router.put("/{policy_id}", response_model=PasswordPolicyResponse)
async def update_password_policy(
    policy_id: str,
    policy_data: PasswordPolicyUpdate,
    current_user: User = Depends(get_current_active_user),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """更新密码策略"""
    try:
        policy = await service.update_password_policy(
            policy_id=policy_id,
            tenant_id=current_user.current_tenant_id,
            current_user=current_user,
            name=policy_data.name,
            description=policy_data.description,
            rules=policy_data.rules,
            status=policy_data.status
        )
        
        return PasswordPolicyResponse.model_validate(policy)
    
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新密码策略失败: {str(e)}")


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_password_policy(
    policy_id: str,
    current_user: User = Depends(get_current_active_user),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """删除密码策略"""
    try:
        success = await service.delete_password_policy(
            policy_id=policy_id,
            tenant_id=current_user.current_tenant_id,
            current_user=current_user
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="密码策略不存在")
    
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除密码策略失败: {str(e)}")


@router.post("/validate", response_model=PasswordValidationResponse)
async def validate_password(
    validation_data: PasswordValidationRequest,
    current_user: User = Depends(get_current_active_user),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """验证密码是否符合策略要求"""
    try:
        is_valid, errors = await service.validate_password(
            password=validation_data.password,
            scope_type=validation_data.scope_type,
            scope_id=validation_data.scope_id,
            tenant_id=current_user.current_tenant_id,
            user_info=validation_data.user_info
        )
        
        return PasswordValidationResponse(
            is_valid=is_valid,
            errors=errors,
            policy_applied=True
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"密码验证失败: {str(e)}")


@router.get("/scope/{scope_type}/{scope_id}/effective", response_model=Optional[PasswordPolicyResponse])
async def get_effective_policy(
    scope_type: PolicyScopeType,
    scope_id: str,
    current_user: User = Depends(get_current_active_user),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """获取特定作用域的有效密码策略"""
    try:
        policy = await service.get_effective_password_policy(
            scope_type=scope_type,
            scope_id=scope_id,
            tenant_id=current_user.current_tenant_id
        )
        
        if policy:
            return PasswordPolicyResponse.model_validate(policy)
        return None
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取有效策略失败: {str(e)}")


@router.get("/scope/{scope_type}/{scope_id}/inheritance-chain", response_model=List[PasswordPolicyResponse])
async def get_policy_inheritance_chain(
    scope_type: PolicyScopeType,
    scope_id: str,
    current_user: User = Depends(get_current_active_user),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """获取策略继承链"""
    try:
        chain = await service.get_policy_inheritance_chain(
            scope_type=scope_type,
            scope_id=scope_id,
            tenant_id=current_user.current_tenant_id
        )
        
        return [PasswordPolicyResponse.model_validate(policy) for policy in chain]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取策略继承链失败: {str(e)}")


@router.post("/from-template/{template_id}", response_model=PasswordPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy_from_template(
    template_id: str,
    policy_data: PasswordPolicyCreate,
    current_user: User = Depends(get_current_active_user),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """从模板创建密码策略"""
    try:
        policy = await service.create_from_template(
            template_id=template_id,
            name=policy_data.name,
            scope_type=policy_data.scope_type,
            scope_id=policy_data.scope_id,
            scope_name=policy_data.scope_name,
            tenant_id=current_user.current_tenant_id,
            current_user=current_user,
            description=policy_data.description
        )
        
        return PasswordPolicyResponse.model_validate(policy)
    
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"从模板创建策略失败: {str(e)}")


# ==================== 模板管理接口 ====================

@router.get("/templates", response_model=List[PasswordPolicyTemplateResponse])
async def list_policy_templates(
    category: Optional[str] = Query(None, description="模板分类"),
    is_system: Optional[bool] = Query(None, description="是否系统模板"),
    limit: int = Query(50, ge=1, le=100, description="返回数量"),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """获取密码策略模板列表"""
    try:
        templates = await service.template_repo.list_templates(
            category=category,
            is_public=True,
            is_system=is_system,
            limit=limit
        )
        
        return [PasswordPolicyTemplateResponse.model_validate(template) for template in templates]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模板列表失败: {str(e)}")


@router.get("/templates/popular", response_model=List[PasswordPolicyTemplateResponse])
async def get_popular_templates(
    limit: int = Query(10, ge=1, le=20, description="返回数量"),
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """获取热门密码策略模板"""
    try:
        templates = await service.template_repo.get_popular_templates(limit=limit)
        return [PasswordPolicyTemplateResponse.model_validate(template) for template in templates]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取热门模板失败: {str(e)}")


@router.get("/templates/{template_id}", response_model=PasswordPolicyTemplateResponse)
async def get_policy_template(
    template_id: str,
    service: PasswordPolicyService = Depends(get_password_policy_service)
):
    """获取密码策略模板详情"""
    try:
        template = await service.template_repo.get_template_by_id(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="策略模板不存在")
        
        return PasswordPolicyTemplateResponse.model_validate(template)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模板详情失败: {str(e)}")