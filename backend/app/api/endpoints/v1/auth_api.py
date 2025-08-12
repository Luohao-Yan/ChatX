from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm

from app.application.services.user_service import UserService
from app.schemas.user_schemas import Token, UserCreate, User as UserSchema, LoginRequest
from app.models.user_models import User
from app.utils.deps import get_current_active_user, get_user_service

router = APIRouter()


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    user_service: UserService = Depends(get_user_service)
):
    """用户登录 - 薄控制器"""
    # 转换 OAuth2PasswordRequestForm 为 LoginRequest
    login_data = LoginRequest(
        email=form_data.username,  # OAuth2 form 使用 username 字段传递 email
        password=form_data.password,
        device_info=request.headers.get("User-Agent") if request else None
    )
    
    client_ip = request.client.host if request and request.client else None
    
    return await user_service.authenticate_and_login(login_data, client_ip)


@router.post("/register", response_model=UserSchema)
async def register(
    user_data: UserCreate, 
    user_service: UserService = Depends(get_user_service)
):
    """用户注册 - 薄控制器"""
    return await user_service.register_user(user_data)


@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """获取当前用户信息 - 薄控制器"""
    return current_user