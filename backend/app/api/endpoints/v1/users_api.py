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


@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: int,
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
    user_id: int,
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
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """删除用户"""
    await user_service.delete_user(user_id, current_user)
    return {"message": "用户已移至回收站", "user_id": user_id}


@router.get("/sessions", response_model=List[UserSessionInfo])
async def get_user_sessions(
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """获取用户会话列表"""
    return await user_service.get_user_sessions(current_user.id)


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """撤销会话"""
    await user_service.revoke_user_session(session_id, current_user)
    return {"message": "会话已注销"}
