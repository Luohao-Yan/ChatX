from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.infrastructure.persistence.database import get_db
from app.core.config import settings
from app.models.user_models import User
from app.schemas.user_schemas import TokenPayload
from app.application.services.user_service import UserService
from app.application.services.recycle_bin_service import RecycleBinService
from app.application.services.file_service import FileApplicationService
from app.application.services.rbac_service import (
    RoleApplicationService,
    PermissionApplicationService,
    UserPermissionApplicationService,
)
from app.infrastructure.repositories.user_repository_impl import (
    UserRepository,
    UserSessionRepository,
    UserVerificationRepository,
)
from app.infrastructure.repositories.file_repository_impl import (
    FileRepository,
    FolderRepository,
    FileShareRepository,
    FileActivityRepository,
    FileTagRepository,
    FileCategoryRepository,
)
from app.infrastructure.repositories.rbac_repository_impl import (
    RoleRepository,
    PermissionRepository,
    UserPermissionRepository,
)
from app.infrastructure.clients.minio_client import get_minio
from app.infrastructure.clients.weaviate_client import get_weaviate
from app.infrastructure.clients.neo4j_client import get_neo4j

security = HTTPBearer()


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        token_data = TokenPayload(**payload)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == token_data.sub).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    """获取用户仓储实例 - 依赖注入工厂"""
    return UserRepository(db)


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """获取用户服务实例 - 依赖注入工厂"""
    user_repo = UserRepository(db)
    session_repo = UserSessionRepository(db)
    verification_repo = UserVerificationRepository(db)

    return UserService(user_repo, session_repo, verification_repo)


def get_file_service(
    db: Session = Depends(get_db),
    minio_client=Depends(get_minio),
    weaviate_client=Depends(get_weaviate),
    neo4j_client=Depends(get_neo4j),
) -> FileApplicationService:
    """获取文件服务实例 - 依赖注入工厂"""
    file_repo = FileRepository(db)
    folder_repo = FolderRepository(db)
    share_repo = FileShareRepository(db)
    activity_repo = FileActivityRepository(db)
    tag_repo = FileTagRepository(db)
    category_repo = FileCategoryRepository(db)

    return FileApplicationService(
        file_repo=file_repo,
        folder_repo=folder_repo,
        share_repo=share_repo,
        activity_repo=activity_repo,
        tag_repo=tag_repo,
        category_repo=category_repo,
        storage_service=minio_client,
        search_service=weaviate_client,
        graph_service=neo4j_client,
    )


def get_role_service(db: Session = Depends(get_db)) -> RoleApplicationService:
    """获取角色服务实例 - 依赖注入工厂"""
    role_repo = RoleRepository(db)
    return RoleApplicationService(role_repo)


def get_permission_service(
    db: Session = Depends(get_db),
) -> PermissionApplicationService:
    """获取权限服务实例 - 依赖注入工厂"""
    permission_repo = PermissionRepository(db)
    return PermissionApplicationService(permission_repo)


def get_user_permission_service(
    db: Session = Depends(get_db),
) -> UserPermissionApplicationService:
    """获取用户权限服务实例 - 依赖注入工厂"""
    user_permission_repo = UserPermissionRepository(db)
    permission_repo = PermissionRepository(db)
    return UserPermissionApplicationService(user_permission_repo, permission_repo)


def get_recycle_bin_service(db: Session = Depends(get_db)) -> RecycleBinService:
    """获取回收站服务实例 - 依赖注入工厂"""
    user_repo = UserRepository(db)
    return RecycleBinService(user_repo)
