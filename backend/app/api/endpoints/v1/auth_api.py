from fastapi import APIRouter, Depends, Request

from app.application.services.user_service import UserService
from app.schemas.user_schemas import (
    Token, UserCreate, User as UserSchema, LoginRequest, TokenRefresh,
    PasswordReset, PasswordResetConfirm, UserSessionInfo
)
from app.models.user_models import User
from app.utils.deps import get_current_active_user, get_user_service, get_user_repository
from app.application.middleware.user_cache_service import get_user_cache_service

router = APIRouter()


@router.post("/login", response_model=Token)
async def login_for_access_token(
    login_data: LoginRequest,
    request: Request = None,
    user_service: UserService = Depends(get_user_service),
):
    """用户登录"""
    # 添加设备信息（创建新的LoginRequest对象）
    if request and not login_data.device_info:
        login_data = LoginRequest(
            email=login_data.email,
            username=login_data.username,
            password=login_data.password,
            device_info=request.headers.get("User-Agent"),
        )

    client_ip = request.client.host if request and request.client else None

    return await user_service.authenticate_and_login(login_data, client_ip)


@router.post("/register", response_model=UserSchema)
async def register(
    user_data: UserCreate, user_service: UserService = Depends(get_user_service)
):
    """用户注册"""
    return await user_service.register_user(user_data)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    user_service: UserService = Depends(get_user_service),
):
    """刷新访问令牌"""
    result = await user_service.refresh_access_token(token_data.refresh_token)
    return result


@router.post("/logout")
async def logout(
    token_data: TokenRefresh,
    user_service: UserService = Depends(get_user_service),
):
    """用户登出"""
    await user_service.logout(token_data.refresh_token)
    return {"message": "退出登录成功"}


@router.post("/logout-all")
async def logout_all_devices(
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """退出所有设备"""
    await user_service.logout_all_devices(current_user.id)
    return {"message": "已退出所有设备"}


@router.post("/forgot-password")
async def forgot_password(
    password_reset: PasswordReset,
    request: Request,
    user_service: UserService = Depends(get_user_service),
):
    """忘记密码 - 发送重置验证码"""
    client_ip = request.client.host if request and request.client else None
    result = await user_service.send_password_reset_code(password_reset.email, client_ip)
    return result


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordResetConfirm,
    user_service: UserService = Depends(get_user_service),
):
    """重置密码"""
    await user_service.reset_password_with_code(
        reset_data.email, 
        reset_data.verification_code, 
        reset_data.new_password
    )
    return {"message": "密码重置成功"}


@router.get("/sessions", response_model=list[UserSessionInfo])
async def get_user_sessions(
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """获取用户会话列表"""
    sessions = await user_service.get_user_sessions(current_user.id)
    return sessions


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service),
):
    """注销指定会话"""
    await user_service.revoke_user_session(session_id, current_user)
    return {"message": "会话已注销"}


@router.get("/me", response_model=UserSchema)
async def read_users_me(
    current_user: User = Depends(get_current_active_user),
    user_repo = Depends(get_user_repository),
    user_cache = Depends(get_user_cache_service)
):
    """获取当前用户信息"""
    # 优先从缓存获取完整用户信息，支持降级到数据库
    try:
        user_data = await user_cache.get_or_fetch_user_profile(current_user.id, user_repo)
        if user_data:
            return user_data
    except Exception as e:
        # 缓存失败时记录日志但不抛出异常，降级到数据库查询
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"用户缓存获取失败，降级到数据库查询: {e}")
    
    # 缓存失败或数据为空时，直接从数据库获取
    user_data = await user_repo.get_user_with_profile(current_user.id)
    if not user_data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="用户信息未找到")
    
    # 尝试更新缓存（可选，失败不影响响应）
    try:
        await user_cache.cache_user_profile(user_data)
    except Exception:
        pass  # 缓存更新失败不影响响应
    
    return user_data
