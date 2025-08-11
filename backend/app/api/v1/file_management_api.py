from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File as FastAPIFile,
    Form,
    Request,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.minio_client import get_minio, MinIOClient
from app.core.weaviate_client import get_weaviate, WeaviateClient
from app.core.neo4j_client import get_neo4j, Neo4jClient
from app.services.file_service import FileService
from app.models.user_models import User
from app.models.file_models import File, Folder, FileShare
from app.schemas.file_schemas import (
    FileCreate,
    FileUpdate,
    FileInfo,
    FileDetail,
    FileListResponse,
    FolderCreate,
    FolderUpdate,
    Folder as FolderSchema,
    FolderTree,
    FileSearchParams,
    FileUploadResponse,
    MultiFileUploadResponse,
    FileShare as FileShareSchema,
    FileShareCreate,
    FileShareUpdate,
    FileComment as FileCommentSchema,
    FileCommentCreate,
    FileCommentUpdate,
    FileStatistics,
    UserFileStatistics,
)
from app.utils.deps import get_current_active_user
import logging
from io import BytesIO

logger = logging.getLogger(__name__)
router = APIRouter()


def get_file_service(
    db: Session = Depends(get_db),
    minio: MinIOClient = Depends(get_minio),
    weaviate: WeaviateClient = Depends(get_weaviate),
    neo4j: Neo4jClient = Depends(get_neo4j),
) -> FileService:
    return FileService(db, minio, weaviate, neo4j)


def get_client_info(request: Request):
    """获取客户端信息"""
    return {
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
    }


# ==================== 文件上传 ====================


@router.post("/upload", response_model=FileUploadResponse)
async def upload_single_file(
    file: UploadFile = FastAPIFile(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    visibility: str = Form("private"),
    parent_folder_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
    request: Request = None,
):
    """上传单个文件"""
    client_info = get_client_info(request)

    file_create = FileCreate(
        title=title,
        description=description,
        tags=tags,
        visibility=visibility,
        parent_folder_id=parent_folder_id,
    )

    try:
        uploaded_file = await file_service.upload_file(
            file=file,
            user_id=current_user.id,
            file_create=file_create,
            ip_address=client_info["ip_address"],
            user_agent=client_info["user_agent"],
        )

        return FileUploadResponse(
            file_id=uploaded_file.id,
            message="文件上传成功",
            file_info=FileInfo.from_orm(uploaded_file),
        )
    except Exception as e:
        logger.error(f"文件上传失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/upload-multiple", response_model=MultiFileUploadResponse)
async def upload_multiple_files(
    files: List[UploadFile] = FastAPIFile(...),
    visibility: str = Form("private"),
    parent_folder_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
    request: Request = None,
):
    """批量上传文件"""
    if len(files) > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="一次最多只能上传20个文件"
        )

    client_info = get_client_info(request)
    uploaded_files = []
    failed_files = []

    for file in files:
        try:
            file_create = FileCreate(
                title=file.filename,
                visibility=visibility,
                parent_folder_id=parent_folder_id,
            )

            uploaded_file = await file_service.upload_file(
                file=file,
                user_id=current_user.id,
                file_create=file_create,
                ip_address=client_info["ip_address"],
                user_agent=client_info["user_agent"],
            )

            uploaded_files.append(FileInfo.from_orm(uploaded_file))

        except Exception as e:
            failed_files.append({"filename": file.filename, "error": str(e)})

    return MultiFileUploadResponse(
        uploaded_files=uploaded_files,
        failed_files=failed_files,
        total_uploaded=len(uploaded_files),
        total_failed=len(failed_files),
    )


# ==================== 文件管理 ====================


@router.get("/search", response_model=FileListResponse)
async def search_files(
    keyword: Optional[str] = None,
    file_type: Optional[str] = None,
    mime_type: Optional[str] = None,
    folder_id: Optional[int] = None,
    visibility: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
):
    """搜索和筛选文件"""
    search_params = FileSearchParams(
        keyword=keyword,
        file_type=file_type,
        mime_type=mime_type,
        folder_id=folder_id,
        visibility=visibility,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )

    result = file_service.search_files(search_params, current_user.id)

    return FileListResponse(
        files=[FileInfo.from_orm(f) for f in result["files"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        pages=result["pages"],
    )


@router.get("/{file_id}", response_model=FileDetail)
async def get_file_detail(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
    db: Session = Depends(get_db),
):
    """获取文件详情"""
    file = file_service.get_file_by_id(file_id, current_user.id)
    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")

    # 增加查看次数
    file.view_count += 1
    db.commit()

    # 记录活动
    file_service._log_file_activity(file_id, current_user.id, "view")

    return FileDetail.from_orm(file)


@router.put("/{file_id}", response_model=FileInfo)
async def update_file(
    file_id: int,
    file_update: FileUpdate,
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
    db: Session = Depends(get_db),
):
    """更新文件信息"""
    file = file_service.get_file_by_id(file_id, current_user.id)
    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")

    if not file_service._check_file_access(file, current_user.id, "write"):
        raise HTTPException(status_code=403, detail="无权限修改此文件")

    # 更新字段
    update_data = file_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(file, field, value)

    db.commit()
    db.refresh(file)

    # 记录活动
    file_service._log_file_activity(file_id, current_user.id, "update", update_data)

    return FileInfo.from_orm(file)


@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    permanent: bool = False,
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
):
    """删除文件"""
    success = file_service.delete_file(file_id, current_user.id, not permanent)

    return {
        "message": "文件删除成功" if success else "文件删除失败",
        "permanent": permanent,
    }


@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
    db: Session = Depends(get_db),
):
    """下载文件"""
    file = file_service.get_file_by_id(file_id, current_user.id)
    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")

    try:
        # 从MinIO获取文件
        file_data = file_service.minio.download_file(file.file_path)

        # 增加下载次数
        file.download_count += 1
        file.last_accessed = datetime.now()
        db.commit()

        # 记录活动
        file_service._log_file_activity(file_id, current_user.id, "download")

        # 返回文件流
        return StreamingResponse(
            BytesIO(file_data),
            media_type=file.mime_type,
            headers={
                "Content-Disposition": f"attachment; filename={file.original_name}",
                "Content-Length": str(len(file_data)),
            },
        )
    except Exception as e:
        logger.error(f"文件下载失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="文件下载失败"
        )


# ==================== 文件夹管理 ====================


@router.post("/folders", response_model=FolderSchema)
async def create_folder(
    folder_create: FolderCreate,
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
):
    """创建文件夹"""
    folder = file_service.create_folder(folder_create, current_user.id)
    return FolderSchema.from_orm(folder)


@router.get("/folders/tree", response_model=List[FolderTree])
async def get_folder_tree(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
):
    """获取文件夹树形结构"""
    # 获取用户的所有文件夹
    folders = (
        db.query(Folder)
        .filter(Folder.owner_id == current_user.id)
        .order_by(Folder.path)
        .all()
    )

    # 构建树形结构
    folder_dict = {f.id: FolderTree.from_orm(f) for f in folders}
    root_folders = []

    for folder in folders:
        folder_tree = folder_dict[folder.id]

        # 计算文件数量
        file_count = (
            db.query(File)
            .filter(File.parent_folder_id == folder.id, File.status == "active")
            .count()
        )
        folder_tree.file_count = file_count

        if folder.parent_id and folder.parent_id in folder_dict:
            folder_dict[folder.parent_id].children.append(folder_tree)
        else:
            root_folders.append(folder_tree)

    return root_folders


@router.get("/folders/{folder_id}/files", response_model=FileListResponse)
async def get_folder_files(
    folder_id: int,
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
):
    """获取文件夹下的文件"""
    search_params = FileSearchParams(folder_id=folder_id, page=page, per_page=per_page)

    result = file_service.search_files(search_params, current_user.id)

    return FileListResponse(
        files=[FileInfo.from_orm(f) for f in result["files"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        pages=result["pages"],
    )


# ==================== 文件分享 ====================


@router.post("/{file_id}/share", response_model=FileShareSchema)
async def share_file(
    file_id: int,
    share_create: FileShareCreate,
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
):
    """分享文件"""
    share = file_service.share_file(file_id, current_user.id, share_create)
    return FileShareSchema.from_orm(share)


@router.get("/{file_id}/shares", response_model=List[FileShareSchema])
async def get_file_shares(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
    db: Session = Depends(get_db),
):
    """获取文件的分享列表"""
    file = file_service.get_file_by_id(file_id, current_user.id)
    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")

    if not file_service._check_file_access(file, current_user.id, "admin"):
        raise HTTPException(status_code=403, detail="无权限查看分享信息")

    shares = (
        db.query(FileShare)
        .filter(FileShare.file_id == file_id, FileShare.shared_by == current_user.id)
        .all()
    )

    return [FileShareSchema.from_orm(share) for share in shares]


@router.get("/shared-with-me", response_model=FileListResponse)
async def get_shared_files(
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取分享给我的文件"""
    # 查询分享给当前用户的文件
    shared_file_ids = (
        db.query(FileShare.file_id)
        .filter(FileShare.shared_with == current_user.id, FileShare.is_active == True)
        .subquery()
    )

    query = db.query(File).filter(File.id.in_(shared_file_ids), File.status == "active")

    total = query.count()
    offset = (page - 1) * per_page
    files = query.offset(offset).limit(per_page).all()

    return FileListResponse(
        files=[FileInfo.from_orm(f) for f in files],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


# ==================== 统计信息 ====================


@router.get("/statistics/overview", response_model=FileStatistics)
async def get_file_statistics(
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
):
    """获取文件统计信息"""
    stats = file_service.get_file_statistics(current_user.id)

    return FileStatistics(
        total_files=stats["total_files"],
        total_size=stats["total_size"],
        by_type=stats["by_type"],
        by_status=stats["by_status"],
        by_visibility=stats["by_visibility"],
        recent_uploads=[FileInfo.from_orm(f) for f in stats["recent_uploads"]],
        popular_files=[FileInfo.from_orm(f) for f in stats["popular_files"]],
    )


@router.get("/statistics/user", response_model=UserFileStatistics)
async def get_user_statistics(
    current_user: User = Depends(get_current_active_user),
    file_service: FileService = Depends(get_file_service),
    db: Session = Depends(get_db),
):
    """获取用户文件统计"""
    stats = file_service.get_file_statistics(current_user.id)

    # 假设用户配额为10GB
    quota_limit = 10 * 1024 * 1024 * 1024  # 10GB
    quota_used = (stats["total_size"] / quota_limit) * 100

    # 获取最近活动
    from app.models.file_models import FileActivity

    recent_activity = (
        db.query(FileActivity)
        .filter(FileActivity.user_id == current_user.id)
        .order_by(FileActivity.created_at.desc())
        .limit(10)
        .all()
    )

    return UserFileStatistics(
        user_id=current_user.id,
        total_files=stats["total_files"],
        total_size=stats["total_size"],
        quota_used=min(quota_used, 100.0),
        quota_limit=quota_limit,
        by_type=stats["by_type"],
        recent_activity=recent_activity,
    )
