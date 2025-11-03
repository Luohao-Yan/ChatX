from typing import Generator, Optional
import logging
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
from app.application.services.cached_rbac_service import CachedRoleApplicationService
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

logger = logging.getLogger(__name__)
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

    # 调试：记录Token信息
    logger.debug(f"收到Token: {credentials.credentials[:50]}...")

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        logger.debug(f"JWT解码成功: {payload}")
        token_data = TokenPayload(**payload)
        logger.debug(f"TokenPayload创建成功，用户ID: {token_data.sub}")
    except JWTError as e:
        logger.warning(f"JWT解码失败: {e}")
        raise credentials_exception
    except Exception as e:
        logger.warning(f"TokenPayload创建失败: {e}")
        raise credentials_exception

    # 查询数据库，增加重试机制和更好的错误处理
    logger.debug(f"查询数据库中的用户ID: {token_data.sub}")
    
    # 尝试多次查询以处理潜在的数据库连接问题
    user = None
    for attempt in range(2):  # 最多尝试2次
        try:
            user = db.query(User).filter(User.id == token_data.sub).first()
            if user is not None:
                break
            else:
                logger.warning(f"第{attempt + 1}次查询用户失败，用户ID: {token_data.sub}")
                if attempt == 0:
                    # 第一次失败时，刷新数据库连接
                    db.rollback()
                    import time
                    time.sleep(0.1)  # 等待100毫秒
        except Exception as e:
            logger.error(f"数据库查询异常，第{attempt + 1}次尝试: {e}")
            if attempt == 0:
                db.rollback()
                import time
                time.sleep(0.1)
            else:
                raise
    
    if user is None:
        # 提供更详细的错误信息用于调试
        logger.error(f"JWT Token用户ID '{token_data.sub}' 在数据库中不存在")
        # 查询所有用户ID进行对比
        try:
            all_users = db.query(User.id).all()
            logger.debug(f"数据库中的所有用户ID: {[u.id for u in all_users]}")
        except Exception as e:
            logger.error(f"查询所有用户ID失败: {e}")
        
        raise HTTPException(
            status_code=404, 
            detail="用户不存在",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    logger.debug(f"找到用户: {user.username} ({user.id})")
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    logger.debug(f"get_current_active_user调用")
    logger.debug(f"当前用户: {current_user.username}, 是否激活: {current_user.is_active}")
    
    if not current_user.is_active:
        logger.warning(f"用户未激活，抛出异常")
        raise HTTPException(status_code=400, detail="Inactive user")
    
    logger.debug(f"get_current_active_user成功")
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


def get_cached_role_service(db: Session = Depends(get_db)) -> CachedRoleApplicationService:
    """获取带缓存的角色服务实例 - 依赖注入工厂"""
    role_repo = RoleRepository(db)
    permission_repo = PermissionRepository(db)
    return CachedRoleApplicationService(role_repo, permission_repo)


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
