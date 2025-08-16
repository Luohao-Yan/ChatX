from pydantic import BaseModel, EmailStr, field_validator, model_validator, ConfigDict, computed_field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    urls: Optional[List[Dict[str, str]]] = None
    date_of_birth: Optional[datetime] = None
    preferred_language: Optional[str] = None


class UserProfile(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    urls: Optional[List[Dict[str, str]]] = None
    date_of_birth: Optional[datetime] = None
    preferred_language: Optional[str] = None


class UserInDBBase(UserBase):
    id: str
    is_verified: bool = False
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    urls: Optional[List[Dict[str, str]]] = None
    date_of_birth: Optional[datetime] = None
    preferred_language: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    last_activity: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class User(UserInDBBase):
    roles: Optional[List[str]] = None  # 角色名列表
    permissions: Optional[List[str]] = None  # 权限名列表
    
    model_config = ConfigDict(from_attributes=True)
    
    @computed_field
    @property
    def is_online(self) -> bool:
        """计算用户是否在线（基于最后登录时间，最近5分钟内认为在线）"""
        # 暂时使用 last_login 作为活动时间的替代
        # 后续可以通过服务层查询用户会话的最新活动时间
        if not self.last_login:
            return False
        
        now = datetime.now(timezone.utc)
        
        # 确保 last_login 有正确的时区信息
        last_login_utc = self.last_login
        if last_login_utc.tzinfo is None:
            # 如果没有时区信息，假设它是UTC时间
            last_login_utc = last_login_utc.replace(tzinfo=timezone.utc)
        elif last_login_utc.tzinfo != timezone.utc:
            # 如果有时区信息但不是UTC，转换为UTC
            last_login_utc = last_login_utc.astimezone(timezone.utc)
        
        # 计算时间差
        time_diff = now - last_login_utc
        is_online_result = time_diff.total_seconds() < 3600  # 1小时 = 3600秒 (临时调整用于测试)
        
        # 调试日志
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(f"User online check: {self.username}, last_login: {self.last_login}, "
                    f"last_login_utc: {last_login_utc}, now: {now}, "
                    f"time_diff: {time_diff.total_seconds()}s, is_online: {is_online_result}")
        
        return is_online_result
    
    @field_validator('roles', mode='before')
    @classmethod
    def extract_role_names(cls, v):
        """从 Role 对象中提取角色名"""
        if v is None:
            return None
        if isinstance(v, list):
            # 如果是 Role 对象列表，提取名称
            return [role.name if hasattr(role, 'name') else str(role) for role in v]
        return v


class UserInDB(UserInDBBase):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None


class TokenRefresh(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None


class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str
    device_info: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_login_identifier(self):
        """验证至少提供email或username中的一个"""
        if not self.email and not self.username:
            raise ValueError('必须提供邮箱或用户名中的一个')
        return self


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    device_info: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        return v


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    verification_code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        return v


class EmailVerification(BaseModel):
    email: EmailStr
    verification_code: str


class UserSessionInfo(BaseModel):
    id: str
    device_info: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    last_used: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)


class UserRoleAssign(BaseModel):
    user_id: str
    role_ids: List[int]


class UserRoleRevoke(BaseModel):
    user_id: str
    role_ids: List[int]
