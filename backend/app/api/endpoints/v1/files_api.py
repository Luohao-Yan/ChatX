from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form, Request
from fastapi.responses import StreamingResponse
from io import BytesIO

from app.application.services.file_service import FileApplicationService
from app.schemas.file_schemas import (
    FileCreate, FileUpdate, FileInfo, FileDetail, FileListResponse,
    FolderCreate, Folder as FolderSchema, FolderTree, FileSearchParams,
    FileUploadResponse, MultiFileUploadResponse, FileShare as FileShareSchema,
    FileShareCreate, FileStatistics, UserFileStatistics
)
from app.models.user_models import User
from app.utils.deps import get_current_active_user, get_file_service

router = APIRouter()


def get_client_info(request: Request) -> dict:
    """获取客户端信息"""
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent")
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
    file_service: FileApplicationService = Depends(get_file_service),
    request: Request = None,
):
    """上传单个文件 - 薄控制器"""
    client_info = get_client_info(request)
    
    file_create = FileCreate(
        title=title,
        description=description,
        tags=tags,
        visibility=visibility,
        parent_folder_id=parent_folder_id,
    )
    
    uploaded_file = await file_service.upload_file(
        file=file,
        user=current_user,
        file_create=file_create,
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"],
    )
    
    return FileUploadResponse(
        file_id=uploaded_file.id,
        message="文件上传成功",
        file_info=FileInfo.from_orm(uploaded_file),
    )


@router.post("/upload-multiple", response_model=MultiFileUploadResponse)
async def upload_multiple_files(
    files: List[UploadFile] = FastAPIFile(...),
    visibility: str = Form("private"),
    parent_folder_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service),
    request: Request = None,
):
    """批量上传文件 - 薄控制器"""
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="一次最多只能上传20个文件")
    
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
                user=current_user,
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
    file_service: FileApplicationService = Depends(get_file_service),
):
    """搜索和筛选文件 - 薄控制器"""
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
    
    result = await file_service.search_files(search_params, current_user)
    
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
    file_service: FileApplicationService = Depends(get_file_service),
):
    """获取文件详情 - 薄控制器"""
    file = await file_service.get_file_by_id(file_id, current_user)
    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 增加查看次数由服务层处理
    await file_service.file_repo.update(file_id, {"view_count": file.view_count + 1})
    
    # 记录活动
    await file_service._log_activity(file_id, current_user.id, "view")
    
    return FileDetail.from_orm(file)


@router.put("/{file_id}", response_model=FileInfo)
async def update_file(
    file_id: int,
    file_update: FileUpdate,
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service),
):
    """更新文件信息 - 薄控制器"""
    updated_file = await file_service.update_file(file_id, file_update, current_user)
    return FileInfo.from_orm(updated_file)


@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    permanent: bool = False,
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service),
):
    """删除文件 - 薄控制器"""
    success = await file_service.delete_file(file_id, current_user, permanent)
    return {
        "message": "文件删除成功" if success else "文件删除失败",
        "permanent": permanent,
    }


@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service),
):
    """下载文件 - 薄控制器"""
    file = await file_service.get_file_by_id(file_id, current_user)
    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    file_data = await file_service.download_file(file_id, current_user)
    
    return StreamingResponse(
        BytesIO(file_data),
        media_type=file.mime_type,
        headers={
            "Content-Disposition": f"attachment; filename={file.original_name}",
            "Content-Length": str(len(file_data)),
        },
    )


# ==================== 文件夹管理 ====================

@router.post("/folders", response_model=FolderSchema)
async def create_folder(
    folder_create: FolderCreate,
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service),
):
    """创建文件夹 - 薄控制器"""
    folder = await file_service.create_folder(folder_create, current_user)
    return FolderSchema.from_orm(folder)


@router.get("/folders/tree", response_model=List[FolderTree])
async def get_folder_tree(
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service)
):
    """获取文件夹树形结构 - 薄控制器"""
    return await file_service.get_folder_tree(current_user)


@router.get("/folders/{folder_id}/files", response_model=FileListResponse)
async def get_folder_files(
    folder_id: int,
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service),
):
    """获取文件夹下的文件 - 薄控制器"""
    search_params = FileSearchParams(folder_id=folder_id, page=page, per_page=per_page)
    
    result = await file_service.search_files(search_params, current_user)
    
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
    file_service: FileApplicationService = Depends(get_file_service),
):
    """分享文件 - 薄控制器"""
    share = await file_service.share_file(file_id, current_user, share_create)
    return FileShareSchema.from_orm(share)


@router.get("/{file_id}/shares", response_model=List[FileShareSchema])
async def get_file_shares(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service),
):
    """获取文件的分享列表 - 薄控制器"""
    shares = await file_service.get_file_shares(file_id, current_user)
    return [FileShareSchema.from_orm(share) for share in shares]


@router.get("/shared-with-me", response_model=FileListResponse)
async def get_shared_files(
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service),
):
    """获取分享给我的文件 - 薄控制器"""
    files = await file_service.get_shared_files(current_user, (page-1)*per_page, per_page)
    
    return FileListResponse(
        files=[FileInfo.from_orm(f) for f in files],
        total=len(files),  # 这里简化处理，实际需要单独查询总数
        page=page,
        per_page=per_page,
        pages=1,  # 简化处理
    )


# ==================== 统计信息 ====================

@router.get("/statistics/overview", response_model=FileStatistics)
async def get_file_statistics(
    current_user: User = Depends(get_current_active_user),
    file_service: FileApplicationService = Depends(get_file_service),
):
    """获取文件统计信息 - 薄控制器"""
    stats = await file_service.get_file_statistics(current_user)
    
    return FileStatistics(
        total_files=stats["total_files"],
        total_size=stats["total_size"],
        by_type=stats["by_type"],
        by_status=stats["by_status"],
        by_visibility=stats["by_visibility"],
        recent_uploads=[FileInfo.from_orm(f) for f in stats["recent_uploads"]],
        popular_files=[FileInfo.from_orm(f) for f in stats["popular_files"]],
    )