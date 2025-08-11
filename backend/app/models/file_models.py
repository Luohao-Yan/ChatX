from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, BigInteger, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
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
    CODE = "code"
    PRESENTATION = "presentation"
    SPREADSHEET = "spreadsheet"
    PDF = "pdf"
    TEXT = "text"
    OTHER = "other"

class VisibilityLevel(str, Enum):
    PRIVATE = "private"        # 仅本人可见
    INTERNAL = "internal"      # 组织内部可见
    SHARED = "shared"         # 特定用户可见
    PUBLIC = "public"         # 公开可见

class File(Base):
    __tablename__ = "sys_files"

    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    original_name = Column(String(255), nullable=False, index=True)
    file_name = Column(String(255), nullable=False, unique=True)  # 存储的文件名
    file_path = Column(String(500), nullable=False)  # MinIO中的路径
    
    # 文件属性
    file_size = Column(BigInteger, nullable=False)
    file_type = Column(String(50), nullable=False, index=True)
    mime_type = Column(String(100), nullable=False)
    file_extension = Column(String(20), nullable=True, index=True)
    
    # 内容信息
    title = Column(String(255), nullable=True, index=True)
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON格式存储标签
    category = Column(String(100), nullable=True, index=True)  # 自定义分类
    keywords = Column(Text, nullable=True)  # 搜索关键词
    
    # 文件哈希和版本
    file_hash = Column(String(64), nullable=False, index=True)  # SHA256
    version = Column(Integer, default=1, nullable=False)
    
    # 状态和权限
    status = Column(String(20), default=FileStatus.ACTIVE, nullable=False, index=True)
    visibility = Column(String(20), default=VisibilityLevel.PRIVATE, nullable=False, index=True)
    
    # 关联信息
    owner_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False, index=True)
    parent_folder_id = Column(Integer, ForeignKey("sys_folders.id"), nullable=True, index=True)
    
    # 统计信息
    download_count = Column(Integer, default=0, nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    last_accessed = Column(DateTime(timezone=True), nullable=True)
    
    # 关系
    owner = relationship("User", back_populates="files")
    folder = relationship("Folder", back_populates="files")
    versions = relationship("FileVersion", back_populates="file", cascade="all, delete-orphan")
    shares = relationship("FileShare", back_populates="file", cascade="all, delete-orphan")
    comments = relationship("FileComment", back_populates="file", cascade="all, delete-orphan")
    tag_relations = relationship("FileTagRelation", back_populates="file", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_file_owner_status', 'owner_id', 'status'),
        Index('idx_file_type_status', 'file_type', 'status'),
        Index('idx_file_created', 'created_at'),
        Index('idx_file_hash', 'file_hash'),
        Index('idx_file_category', 'category'),
        Index('idx_file_owner_category', 'owner_id', 'category'),
    )

class Folder(Base):
    __tablename__ = "sys_folders"

    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # 层级关系
    parent_id = Column(Integer, ForeignKey("sys_folders.id"), nullable=True, index=True)
    path = Column(String(1000), nullable=False, index=True)  # 完整路径
    level = Column(Integer, default=0, nullable=False)
    
    # 权限和状态
    owner_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False, index=True)
    visibility = Column(String(20), default=VisibilityLevel.PRIVATE, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)  # 系统文件夹
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    owner = relationship("User")
    parent = relationship("Folder", remote_side=[id])
    children = relationship("Folder", cascade="all, delete-orphan")
    files = relationship("File", back_populates="folder")
    
    # 索引
    __table_args__ = (
        Index('idx_folder_owner_parent', 'owner_id', 'parent_id'),
        Index('idx_folder_path', 'path'),
    )

class FileVersion(Base):
    __tablename__ = "sys_file_versions"

    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    file_id = Column(Integer, ForeignKey("sys_files.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    
    # 版本信息
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_hash = Column(String(64), nullable=False)
    
    # 变更信息
    change_description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("sys_users.id"), nullable=False)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    file = relationship("File", back_populates="versions")
    creator = relationship("User")

class FileShare(Base):
    __tablename__ = "sys_file_shares"

    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    file_id = Column(Integer, ForeignKey("sys_files.id"), nullable=False, index=True)
    shared_by = Column(Integer, ForeignKey("sys_users.id"), nullable=False)
    shared_with = Column(Integer, ForeignKey("sys_users.id"), nullable=True)  # 为空表示公开分享
    
    # 分享配置
    access_type = Column(String(20), default="read", nullable=False)  # read, write, admin
    share_token = Column(String(64), nullable=True, unique=True)  # 分享链接令牌
    password_protected = Column(Boolean, default=False, nullable=False)
    password_hash = Column(String(255), nullable=True)
    
    # 有效期
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # 统计
    access_count = Column(Integer, default=0, nullable=False)
    last_accessed = Column(DateTime(timezone=True), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    file = relationship("File", back_populates="shares")
    sharer = relationship("User", foreign_keys=[shared_by])
    recipient = relationship("User", foreign_keys=[shared_with])

class FileComment(Base):
    __tablename__ = "sys_file_comments"

    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    file_id = Column(Integer, ForeignKey("sys_files.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("sys_file_comments.id"), nullable=True)  # 回复功能
    
    # 评论内容
    content = Column(Text, nullable=False)
    is_edited = Column(Boolean, default=False, nullable=False)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    file = relationship("File", back_populates="comments")
    user = relationship("User")
    parent = relationship("FileComment", remote_side=[id])
    replies = relationship("FileComment", cascade="all, delete-orphan")

class FileCategory(Base):
    __tablename__ = "sys_file_categories"

    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)  # HEX颜色值
    icon = Column(String(50), nullable=True)  # 图标名称
    
    # 层级关系
    parent_id = Column(Integer, ForeignKey("sys_file_categories.id"), nullable=True, index=True)
    path = Column(String(500), nullable=False, index=True)
    level = Column(Integer, default=0, nullable=False)
    
    # 权限和状态
    owner_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False, index=True)
    is_system = Column(Boolean, default=False, nullable=False)  # 系统预设分类
    is_active = Column(Boolean, default=True, nullable=False)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    owner = relationship("User")
    parent = relationship("FileCategory", remote_side=[id])
    children = relationship("FileCategory", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_category_owner_name', 'owner_id', 'name'),
        Index('idx_category_path', 'path'),
    )

class FileTag(Base):
    __tablename__ = "sys_file_tags"

    id = Column(Integer, primary_key=True, index=True)
    
    # 标签信息
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)  # HEX颜色值
    
    # 权限和状态
    owner_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False, index=True)
    is_system = Column(Boolean, default=False, nullable=False)  # 系统预设标签
    usage_count = Column(Integer, default=0, nullable=False)  # 使用次数
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    owner = relationship("User")
    
    # 索引
    __table_args__ = (
        Index('idx_tag_owner_name', 'owner_id', 'name'),
        Index('idx_tag_usage', 'usage_count'),
    )

class FileTagRelation(Base):
    __tablename__ = "sys_file_tag_relations"

    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    file_id = Column(Integer, ForeignKey("sys_files.id"), nullable=False, index=True)
    tag_id = Column(Integer, ForeignKey("sys_file_tags.id"), nullable=False, index=True)
    
    # 关联信息
    created_by = Column(Integer, ForeignKey("sys_users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    file = relationship("File")
    tag = relationship("FileTag")
    creator = relationship("User")
    
    # 唯一约束
    __table_args__ = (
        Index('idx_file_tag_unique', 'file_id', 'tag_id', unique=True),
    )

class FileActivity(Base):
    __tablename__ = "sys_file_activities"

    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    file_id = Column(Integer, ForeignKey("sys_files.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False)
    
    # 活动信息
    action = Column(String(50), nullable=False, index=True)  # upload, download, view, edit, delete, share
    details = Column(Text, nullable=True)  # JSON格式的详细信息
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 关系
    file = relationship("File")
    user = relationship("User")
    
    # 索引
    __table_args__ = (
        Index('idx_activity_file_action', 'file_id', 'action'),
        Index('idx_activity_user_time', 'user_id', 'created_at'),
    )