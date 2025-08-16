from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request

from app.application.services.user_service import UserService
from app.schemas.user_schemas import (
    User as UserSchema,
    UserCreate,
    UserUpdate,
    LoginRequest,
    Token,
    TokenRefresh,
    EmailVerification,
    UserSessionInfo,
)
from app.schemas.batch_schemas import BatchUserRequest, BatchOperationResponse
from app.models.user_models import User
from app.utils.deps import get_current_active_user, get_user_service

router = APIRouter()


@router.post("/register", response_model=UserSchema)
async def register_user(
    user_data: UserCreate, user_service: UserService = Depends(get_user_service)
):
    """用户注册，只处理HTTP层面的事务"""
    return await user_service.register_user(user_data)


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request,
    user_service: UserService = Depends(get_user_service),
):
    """用户登录"""
    client_ip = request.client.host if request.client else None
    return await user_service.authenticate_and_login(login_data, client_ip)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh, user_service: UserService = Depends(get_user_service)
):
    """刷新访问令牌"""
    return await user_service.refresh_access_token(token_data.refresh_token)


@router.post("/logout")
async def logout(
    token_data: TokenRefresh, user_service: UserService = Depends(get_user_service)
):
    """用户登出"""
    await user_service.logout(token_data.refresh_token)
    return {"message": "退出登录成功"}


@router.post("/logout-all")
async def logout_all(
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """用户登出所有设备"""
    await user_service.logout_all_devices(current_user.id)
    return {"message": "已退出所有设备"}


@router.post("/verify-email")
async def verify_email(
    verification_data: EmailVerification,
    user_service: UserService = Depends(get_user_service),
):
    """邮箱验证"""
    await user_service.verify_email(
        verification_data.email, verification_data.verification_code
    )
    return {"message": "邮箱验证成功"}


@router.get("/me", response_model=UserSchema)
async def get_current_user(current_user: User = Depends(get_current_active_user)):
    """获取当前用户信息 - 无需服务层，直接返回"""
    return current_user


@router.get("", response_model=List[UserSchema])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    include_deleted: bool = False,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """获取用户列表"""
    return await user_service.get_users_list(current_user, skip, limit, include_deleted)


@router.get("/recycle-bin", response_model=List[UserSchema])
async def get_deleted_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """获取回收站中的已删除用户"""
    return await user_service.get_deleted_users(current_user, skip, limit)


@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """获取单个用户信息"""
    user = await user_service.get_user_by_id(user_id, current_user)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """更新用户信息"""
    updated_user = await user_service.update_user(user_id, user_update, current_user)
    if not updated_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return updated_user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """软删除用户"""
    await user_service.delete_user(user_id, current_user)
    return {"message": "用户已移至回收站", "user_id": user_id}


@router.patch("/batch/disable", response_model=BatchOperationResponse)
async def batch_disable_users(
    request: BatchUserRequest,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """批量停用用户"""
    result = await user_service.batch_disable_users(request.user_ids, current_user)
    return result


@router.patch("/batch/delete", response_model=BatchOperationResponse)
async def batch_delete_users(
    request: BatchUserRequest,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """批量软删除用户"""
    result = await user_service.batch_delete_users(request.user_ids, current_user)
    return result


@router.post("/cache/clear")
async def clear_user_cache(
    current_user: User = Depends(get_current_active_user),
):
    """清除用户缓存（仅管理员可用）"""
    from app.application.middleware.user_cache_service import get_user_cache_service
    
    # 只有超级管理员可以清除缓存
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="权限不足")
    
    cache_service = await get_user_cache_service()
    
    # 清除当前用户的缓存作为测试
    await cache_service.invalidate_user_cache(current_user.id)
    
    return {"message": "用户缓存已清除"}


@router.post("/recycle-bin/{user_id}/restore")
async def restore_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """从回收站恢复用户"""
    await user_service.restore_user(user_id, current_user)
    return {"message": "用户已恢复", "user_id": user_id}


@router.delete("/recycle-bin/{user_id}/permanent")
async def permanently_delete_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """彻底删除用户（不可恢复）"""
    await user_service.permanently_delete_user(user_id, current_user)
    return {"message": "用户已彻底删除", "user_id": user_id}


@router.patch("/recycle-bin/batch/restore", response_model=BatchOperationResponse)
async def batch_restore_users(
    request: BatchUserRequest,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """批量恢复用户"""
    result = await user_service.batch_restore_users(request.user_ids, current_user)
    return result


@router.delete("/recycle-bin/batch/permanent", response_model=BatchOperationResponse)
async def batch_permanently_delete_users(
    request: BatchUserRequest,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """批量彻底删除用户"""
    result = await user_service.batch_permanently_delete_users(request.user_ids, current_user)
    return result


@router.get("/sessions", response_model=List[UserSessionInfo])
async def get_user_sessions(
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """获取用户会话列表"""
    return await user_service.get_user_sessions(current_user.id)


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """撤销会话"""
    await user_service.revoke_user_session(session_id, current_user)
    return {"message": "会话已注销"}
