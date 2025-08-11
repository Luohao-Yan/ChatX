from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core import security
from app.models.user_models import User, UserSession, UserVerification, UserStatus
from app.schemas.user_schemas import (
    User as UserSchema, UserCreate, UserUpdate, LoginRequest, 
    Token, TokenRefresh, PasswordReset, PasswordResetConfirm,
    EmailVerification, UserSessionInfo
)
from app.utils.deps import get_current_active_user
from app.tasks.user_tasks import send_verification_email
from app.core.permissions import require_permission, Permissions

router = APIRouter()


@router.post("/register", response_model=UserSchema)
async def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = db.query(User).filter(
        (User.email == user_in.email) | (User.username == user_in.username)
    ).first()
    if existing_user:
        if existing_user.email == user_in.email:
            raise HTTPException(
                status_code=400,
                detail="该邮箱已被注册"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="该用户名已被使用"
            )

    is_valid, message = security.validate_password_strength(user_in.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)

    hashed_password = security.get_password_hash(user_in.password)
    
    db_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=hashed_password,
        tenant_id=1,  # 默认租户
        is_active=True,
        is_verified=False,
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    verification_code = security.generate_verification_code()
    verification = UserVerification(
        user_id=db_user.id,
        verification_type="email",
        verification_code=verification_code,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(verification)
    db.commit()
    
    send_verification_email.delay(db_user.email, verification_code)
    
    return db_user


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail="邮箱或密码错误"
        )
    
    if not security.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="邮箱或密码错误"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="账号已被禁用"
        )
    
    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)
    
    client_host = request.client.host if request.client else None
    device_info = login_data.device_info or request.headers.get("User-Agent", "Unknown")
    
    user_session = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        device_info=device_info,
        ip_address=client_host,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_active=True,
    )
    db.add(user_session)
    
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db),
):
    payload = security.verify_token(token_data.refresh_token, "refresh")
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="无效的刷新令牌"
        )
    
    session = db.query(UserSession).filter(
        UserSession.refresh_token == token_data.refresh_token,
        UserSession.is_active == True
    ).first()
    
    if not session or session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=401,
            detail="刷新令牌已过期"
        )
    
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="用户不存在或已被禁用"
        )
    
    access_token = security.create_access_token(subject=user.id)
    
    session.last_used = datetime.now(timezone.utc)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(
    token_data: TokenRefresh,
    db: Session = Depends(get_db),
):
    session = db.query(UserSession).filter(
        UserSession.refresh_token == token_data.refresh_token
    ).first()
    
    if session:
        session.is_active = False
        db.commit()
    
    return {"message": "退出登录成功"}


@router.post("/logout-all")
async def logout_all(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    return {"message": "已退出所有设备"}


@router.post("/verify-email")
async def verify_email(
    verification_data: EmailVerification,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == verification_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    verification = db.query(UserVerification).filter(
        UserVerification.user_id == user.id,
        UserVerification.verification_type == "email",
        UserVerification.verification_code == verification_data.verification_code,
        UserVerification.is_used == False,
        UserVerification.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not verification:
        raise HTTPException(status_code=400, detail="验证码无效或已过期")
    
    user.is_verified = True
    verification.is_used = True
    db.commit()
    
    return {"message": "邮箱验证成功"}


@router.post("/forgot-password")
async def forgot_password(
    password_reset: PasswordReset,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == password_reset.email).first()
    if not user:
        return {"message": "如果该邮箱存在，我们已发送重置密码链接"}
    
    verification_code = security.generate_verification_code()
    verification = UserVerification(
        user_id=user.id,
        verification_type="password_reset",
        verification_code=verification_code,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(verification)
    db.commit()
    
    send_verification_email.delay(user.email, verification_code, "password_reset")
    
    return {"message": "如果该邮箱存在，我们已发送重置密码链接"}


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == reset_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    verification = db.query(UserVerification).filter(
        UserVerification.user_id == user.id,
        UserVerification.verification_type == "password_reset",
        UserVerification.verification_code == reset_data.verification_code,
        UserVerification.is_used == False,
        UserVerification.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not verification:
        raise HTTPException(status_code=400, detail="验证码无效或已过期")
    
    is_valid, message = security.validate_password_strength(reset_data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    user.hashed_password = security.get_password_hash(reset_data.new_password)
    verification.is_used = True
    
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    
    return {"message": "密码重置成功"}


@router.get("/sessions", response_model=List[UserSessionInfo])
async def get_user_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).order_by(UserSession.last_used.desc()).all()
    
    return sessions


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    session.is_active = False
    db.commit()
    
    return {"message": "会话已注销"}


@router.get("/", response_model=List[UserSchema])
@require_permission("user:read")
async def read_users(
    skip: int = 0,
    limit: int = 100,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取用户列表，默认排除已删除用户"""
    query = db.query(User).filter(User.tenant_id == current_user.tenant_id)
    
    # 默认排除已删除的用户
    if not include_deleted:
        query = query.filter(User.is_deleted == False)
    
    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserSchema)
@require_permission("user:read")
async def read_user(
    user_id: int,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取单个用户信息"""
    query = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    )
    
    # 默认排除已删除的用户
    if not include_deleted:
        query = query.filter(User.is_deleted == False)
    
    user = query.first()
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 权限检查：只能查看自己的信息，或具有管理权限
    if user.id != current_user.id:
        # 这里可以根据实际需求调整权限逻辑
        pass  # require_permission装饰器已经处理了权限检查

    return user


@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = user_update.model_dump(exclude_unset=True)

    if "password" in update_data:
        hashed_password = security.get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
@require_permission("user:delete")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """软删除用户（将用户标记为已删除，可在回收站中恢复）"""
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id,
        User.is_deleted == False
    ).first()
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 不允许删除自己
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能删除自己的账户")
    
    # 检查是否是超级管理员，超级管理员不能被删除
    if user.is_superuser:
        raise HTTPException(status_code=400, detail="不能删除超级管理员账户")

    # 执行软删除
    user.is_deleted = True
    user.deleted_at = datetime.now(timezone.utc)
    user.deleted_by = current_user.id
    user.status = UserStatus.DELETED
    user.is_active = False
    
    db.commit()
    return {"message": "用户已移至回收站", "user_id": user_id}
