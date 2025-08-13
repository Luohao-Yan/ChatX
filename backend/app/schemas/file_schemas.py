from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class FileStatus(str, Enum):
    UPLOADING = "uploading"
    ACTIVE = "active"
    DELETED = "deleted"
    ARCHIVED = "archived"

class FileType(str, Enum):
    DOCUMENT = "document"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    ARCHIVE = "archive"
    OTHER = "other"

class VisibilityLevel(str, Enum):
    PRIVATE = "private"
    INTERNAL = "internal"
    SHARED = "shared"
    PUBLIC = "public"

class AccessType(str, Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"

# 文件分类相关
class FileCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None

class FileCategoryCreate(FileCategoryBase):
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('分类名称不能为空')
        if len(v) > 100:
            raise ValueError('分类名称过长')
        return v.strip()

class FileCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None

class FileCategory(FileCategoryBase):
    id: int
    owner_id: int
    path: str
    level: int
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

class FileCategoryTree(FileCategory):
    children: List['FileCategoryTree'] = []
    file_count: int = 0

# 文件标签相关
class FileTagBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None

class FileTagCreate(FileTagBase):
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('标签名称不能为空')
        if len(v) > 100:
            raise ValueError('标签名称过长')
        return v.strip()

class FileTagUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class FileTag(FileTagBase):
    id: int
    owner_id: int
    is_system: bool
    usage_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

# 文件夹相关模式
class FolderBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    visibility: VisibilityLevel = VisibilityLevel.PRIVATE

class FolderCreate(FolderBase):
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('文件夹名称不能为空')
        if len(v) > 255:
            raise ValueError('文件夹名称过长')
        return v.strip()

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    visibility: Optional[VisibilityLevel] = None

class Folder(FolderBase):
    id: int
    owner_id: int
    path: str
    level: int
    is_system: bool
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class FolderTree(Folder):
    children: List['FolderTree'] = []
    file_count: int = 0

# 文件相关模式
class FileBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[str] = None
    visibility: VisibilityLevel = VisibilityLevel.PRIVATE
    parent_folder_id: Optional[int] = None

class FileCreate(FileBase):
    original_name: str
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v and len(v) > 255:
            raise ValueError('标题过长')
        return v

class FileUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[str] = None
    visibility: Optional[VisibilityLevel] = None
    parent_folder_id: Optional[int] = None

class File(FileBase):
    id: int
    original_name: str
    file_name: str
    file_path: str
    file_size: int
    file_type: str
    mime_type: str
    file_extension: Optional[str]
    file_hash: str
    version: int
    status: FileStatus
    owner_id: int
    download_count: int
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    last_accessed: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class FileInfo(BaseModel):
    """文件基本信息（列表显示用）"""
    id: int
    title: Optional[str]
    original_name: str
    file_size: int
    file_type: str
    mime_type: str
    status: FileStatus
    visibility: VisibilityLevel
    owner_id: int
    created_at: datetime
    download_count: int
    view_count: int

    model_config = ConfigDict(from_attributes=True)

class FileDetail(File):
    """文件详细信息"""
    folder: Optional[Folder] = None
    owner_name: Optional[str] = None
    version_count: int = 0
    share_count: int = 0
    comment_count: int = 0

# 文件版本
class FileVersionBase(BaseModel):
    change_description: Optional[str] = None

class FileVersionCreate(FileVersionBase):
    pass

class FileVersion(FileVersionBase):
    id: int
    file_id: int
    version_number: int
    file_name: str
    file_size: int
    file_hash: str
    created_by: int
    created_at: datetime
    creator_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 文件分享
class FileShareBase(BaseModel):
    access_type: AccessType = AccessType.READ
    password_protected: bool = False
    expires_at: Optional[datetime] = None

class FileShareCreate(FileShareBase):
    shared_with: Optional[int] = None  # 为空表示公开分享
    password: Optional[str] = None

class FileShareUpdate(BaseModel):
    access_type: Optional[AccessType] = None
    password_protected: Optional[bool] = None
    password: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None

class FileShare(FileShareBase):
    id: int
    file_id: int
    shared_by: int
    shared_with: Optional[int]
    share_token: Optional[str]
    is_active: bool
    access_count: int
    last_accessed: Optional[datetime]
    created_at: datetime
    
    # 关联信息
    file_name: Optional[str] = None
    sharer_name: Optional[str] = None
    recipient_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 文件评论
class FileCommentBase(BaseModel):
    content: str
    parent_id: Optional[int] = None

class FileCommentCreate(FileCommentBase):
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('评论内容不能为空')
        if len(v) > 2000:
            raise ValueError('评论内容过长')
        return v.strip()

class FileCommentUpdate(BaseModel):
    content: str
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('评论内容不能为空')
        if len(v) > 2000:
            raise ValueError('评论内容过长')
        return v.strip()

class FileComment(FileCommentBase):
    id: int
    file_id: int
    user_id: int
    is_edited: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    # 关联信息
    user_name: Optional[str] = None
    reply_count: int = 0
    replies: List['FileComment'] = []

    model_config = ConfigDict(from_attributes=True)

# 文件活动记录
class FileActivity(BaseModel):
    id: int
    file_id: int
    user_id: int
    action: str
    details: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    
    # 关联信息
    user_name: Optional[str] = None
    file_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 文件搜索和过滤
class FileSearchParams(BaseModel):
    keyword: Optional[str] = None
    file_type: Optional[str] = None
    mime_type: Optional[str] = None
    owner_id: Optional[int] = None
    folder_id: Optional[int] = None
    status: Optional[FileStatus] = None
    visibility: Optional[VisibilityLevel] = None
    category: Optional[str] = None
    created_from: Optional[datetime] = None
    created_to: Optional[datetime] = None
    min_size: Optional[int] = None
    max_size: Optional[int] = None
    tags: Optional[List[str]] = None
    tag_ids: Optional[List[int]] = None
    
    # 排序选项
    sort_by: str = "created_at"
    sort_order: str = "desc"
    
    # 分页
    page: int = 1
    per_page: int = 20
    
    @field_validator('per_page')
    @classmethod
    def validate_per_page(cls, v):
        if v < 1 or v > 100:
            raise ValueError('每页数量必须在1-100之间')
        return v

class FileListResponse(BaseModel):
    files: List[FileInfo]
    total: int
    page: int
    per_page: int
    pages: int

# 文件上传相关
class FileUploadResponse(BaseModel):
    file_id: int
    message: str
    file_info: FileInfo

class MultiFileUploadResponse(BaseModel):
    uploaded_files: List[FileInfo]
    failed_files: List[dict]
    total_uploaded: int
    total_failed: int

# 文件统计
class FileStatistics(BaseModel):
    total_files: int
    total_size: int
    by_type: dict
    by_status: dict
    by_visibility: dict
    recent_uploads: List[FileInfo]
    popular_files: List[FileInfo]

class UserFileStatistics(BaseModel):
    user_id: int
    total_files: int
    total_size: int
    quota_used: float  # 百分比
    quota_limit: int
    by_type: dict
    recent_activity: List[FileActivity]