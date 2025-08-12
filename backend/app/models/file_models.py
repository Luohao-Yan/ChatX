"""文件管理相关的数据库模型

包含:
- FileStatus: 文件状态枚举
- FileType: 文件类型枚举  
- VisibilityLevel: 文件可见性级别枚举
- File: 文件主表模型
- Folder: 文件夹模型
- FileVersion: 文件版本管理模型
- FileShare: 文件分享模型
- FileComment: 文件评论模型
- FileCategory: 文件分类模型
- FileTag: 文件标签模型
- FileTagRelation: 文件标签关联模型
- FileActivity: 文件操作日志模型
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, BigInteger, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from enum import Enum

__all__ = [
    'FileStatus', 'FileType', 'VisibilityLevel', 'File', 'Folder', 'FileVersion',
    'FileShare', 'FileComment', 'FileCategory', 'FileTag', 'FileTagRelation', 'FileActivity'
]

class FileStatus(str, Enum):
    """文件状态枚举
    
    定义文件在系统中的生命周期状态，用于文件状态管理和过滤。
    """
    UPLOADING = "uploading"  # 上传中状态，文件正在上传过程中
    ACTIVE = "active"        # 活跃状态，文件正常可用
    DELETED = "deleted"      # 已删除状态，文件被软删除到回收站
    ARCHIVED = "archived"    # 已归档状态，文件被归档存储

class FileType(str, Enum):
    """文件类型枚举
    
    根据文件扩展名和MIME类型自动识别的文件分类，用于文件筛选和展示。
    """
    DOCUMENT = "document"        # 文档类文件（Word、Pages等）
    IMAGE = "image"             # 图片类文件（JPG、PNG、GIF等）
    VIDEO = "video"             # 视频类文件（MP4、AVI、MOV等）
    AUDIO = "audio"             # 音频类文件（MP3、WAV、AAC等）
    ARCHIVE = "archive"         # 压缩包类文件（ZIP、RAR、7Z等）
    CODE = "code"               # 代码类文件（JS、PY、JAVA等）
    PRESENTATION = "presentation" # 演示文稿类文件（PPT、Keynote等）
    SPREADSHEET = "spreadsheet"  # 电子表格类文件（Excel、Numbers等）
    PDF = "pdf"                 # PDF文档
    TEXT = "text"               # 纯文本文件（TXT、MD等）
    OTHER = "other"             # 其他类型文件

class VisibilityLevel(str, Enum):
    """文件可见性级别枚举
    
    定义文件的访问权限级别，支持从私有到公开的多级访问控制。
    """
    PRIVATE = "private"        # 仅本人可见，文件只有所有者可以访问
    INTERNAL = "internal"      # 组织内部可见，同组织内的用户可以访问
    SHARED = "shared"         # 特定用户可见，通过分享链接或指定用户访问
    PUBLIC = "public"         # 公开可见，所有人都可以访问（包括未登录用户）

class File(Base):
    """文件主表模型
    
    存储系统中所有文件的基本信息、元数据和状态。支持多种文件类型和权限控制。
    文件存储在MinIO对象存储中，数据库只保存文件的元数据信息。
    
    主要特性:
    - 多格式支持：支持各种文件类型的上传和管理
    - 版本控制：支持文件版本历史管理
    - 权限控制：支持多级别的文件访问权限
    - 内容管理：支持文件标题、描述、标签等内容信息
    - 统计功能：记录下载次数、查看次数等使用统计
    - 搜索支持：提供关键词和标签搜索功能
    """
    __tablename__ = "sys_files"

    # 文件唯一标识ID
    id = Column(Integer, primary_key=True, index=True, comment="文件唯一标识ID")
    
    # 基本文件信息
    original_name = Column(String(255), nullable=False, index=True, comment="用户上传时的原始文件名")
    file_name = Column(String(255), nullable=False, unique=True, comment="系统生成的存储文件名（UUID）")  
    file_path = Column(String(500), nullable=False, comment="文件在MinIO对象存储中的完整路径")
    
    # 文件物理属性
    file_size = Column(BigInteger, nullable=False, comment="文件大小（字节）")
    file_type = Column(String(50), nullable=False, index=True, comment="文件类型分类（document/image/video等）")
    mime_type = Column(String(100), nullable=False, comment="文件MIME类型（application/pdf等）")
    file_extension = Column(String(20), nullable=True, index=True, comment="文件扩展名（不含点号）")
    
    # 文件内容元数据信息
    title = Column(String(255), nullable=True, index=True, comment="文件标题（用户自定义）")
    description = Column(Text, nullable=True, comment="文件描述信息")
    tags = Column(Text, nullable=True, comment="文件标签列表（JSON格式存储）")  
    category = Column(String(100), nullable=True, index=True, comment="文件自定义分类")  
    keywords = Column(Text, nullable=True, comment="文件搜索关键词（用于全文搜索）")
    
    # 文件完整性和版本管理
    file_hash = Column(String(64), nullable=False, index=True, comment="文件SHA256哈希值，用于完整性校验和去重")  
    version = Column(Integer, default=1, nullable=False, comment="文件版本号，从1开始递增")
    
    # 文件状态和权限控制
    status = Column(String(20), default=FileStatus.ACTIVE, nullable=False, index=True, comment="文件当前状态（active/deleted/archived等）")
    visibility = Column(String(20), default=VisibilityLevel.PRIVATE, nullable=False, index=True, comment="文件可见性级别（private/internal/shared/public）")
    
    # 文件所有权和组织关系
    owner_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False, index=True, comment="文件所有者用户ID")
    parent_folder_id = Column(Integer, ForeignKey("sys_folders.id"), nullable=True, index=True, comment="父文件夹ID（null表示根目录）")
    
    # 文件使用统计信息
    download_count = Column(Integer, default=0, nullable=False, comment="文件下载次数统计")
    view_count = Column(Integer, default=0, nullable=False, comment="文件查看次数统计")
    
    # 时间戳和访问记录
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, comment="文件创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="文件最后更新时间")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="文件删除时间（软删除）")
    last_accessed = Column(DateTime(timezone=True), nullable=True, comment="文件最后访问时间")
    
    # SQLAlchemy关系映射
    owner = relationship("User", back_populates="files")  # 文件所有者对象
    folder = relationship("Folder", back_populates="files")  # 父文件夹对象
    versions = relationship("FileVersion", back_populates="file", cascade="all, delete-orphan")  # 文件版本历史列表
    shares = relationship("FileShare", back_populates="file", cascade="all, delete-orphan")  # 文件分享记录列表
    comments = relationship("FileComment", back_populates="file", cascade="all, delete-orphan")  # 文件评论列表
    tag_relations = relationship("FileTagRelation", back_populates="file", cascade="all, delete-orphan")  # 文件标签关联列表
    
    # 数据库索引配置（优化查询性能）
    __table_args__ = (
        Index('idx_file_owner_status', 'owner_id', 'status'),      # 按所有者和状态查询
        Index('idx_file_type_status', 'file_type', 'status'),      # 按文件类型和状态查询
        Index('idx_file_created', 'created_at'),                   # 按创建时间排序
        Index('idx_file_hash', 'file_hash'),                       # 文件去重查询
        Index('idx_file_category', 'category'),                    # 按分类查询
        Index('idx_file_owner_category', 'owner_id', 'category'),  # 用户分类文件查询
        {"comment": "文件主表，存储所有文件的基本信息和元数据"}
    )

class Folder(Base):
    """文件夹模型
    
    管理文件的层级组织结构，支持多级目录和权限控制。
    每个文件夹都可以包含子文件夹和文件，形成树状结构。
    
    主要特性:
    - 层级管理：支持任意深度的目录层级
    - 路径管理：自动维护完整路径信息
    - 权限继承：支持文件夹权限继承
    - 系统文件夹：支持系统预定义的特殊目录
    """
    __tablename__ = "sys_folders"

    # 文件夹唯一标识ID
    id = Column(Integer, primary_key=True, index=True, comment="文件夹唯一标识ID")
    
    # 文件夹基本信息
    name = Column(String(255), nullable=False, index=True, comment="文件夹名称")
    description = Column(Text, nullable=True, comment="文件夹描述信息")
    
    # 文件夹层级结构关系
    parent_id = Column(Integer, ForeignKey("sys_folders.id"), nullable=True, index=True, comment="父文件夹ID（null表示根目录）")
    path = Column(String(1000), nullable=False, index=True, comment="文件夹完整路径（/root/folder1/folder2）")
    level = Column(Integer, default=0, nullable=False, comment="文件夹层级深度（0为根目录）")
    
    # 文件夹所有权和可见性控制
    owner_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False, index=True, comment="文件夹所有者用户ID")
    visibility = Column(String(20), default=VisibilityLevel.PRIVATE, nullable=False, comment="文件夹可见性级别")
    is_system = Column(Boolean, default=False, nullable=False, comment="是否为系统预定义文件夹（不可删除）")
    
    # 时间戳记录
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="文件夹创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="文件夹最后更新时间")
    
    # SQLAlchemy关系映射
    owner = relationship("User")  # 文件夹所有者对象
    parent = relationship("Folder", remote_side=[id])  # 父文件夹对象
    children = relationship("Folder", cascade="all, delete-orphan")  # 子文件夹列表
    files = relationship("File", back_populates="folder")  # 文件夹内的文件列表
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_folder_owner_parent', 'owner_id', 'parent_id'),  # 用户文件夹层级查询
        Index('idx_folder_path', 'path'),                          # 路径快速查询
        {"comment": "文件夹表，管理文件的层级组织结构"}
    )

class FileVersion(Base):
    """文件版本管理模型
    
    记录文件的历史版本信息，支持文件版本回滚和变更追踪。
    每次文件更新时自动创建新版本记录，保留完整的版本历史。
    
    主要特性:
    - 版本号管理：自动递增版本号
    - 内容备份：保存每个版本的完整信息
    - 变更追踪：记录版本变更描述和创建者
    - 完整性校验：每个版本都有独立的哈希值
    """
    __tablename__ = "sys_file_versions"

    # 版本记录唯一标识ID
    id = Column(Integer, primary_key=True, index=True, comment="文件版本记录ID")
    
    # 版本关联信息
    file_id = Column(Integer, ForeignKey("sys_files.id"), nullable=False, index=True, comment="关联的文件ID")
    version_number = Column(Integer, nullable=False, comment="版本号（从1开始递增）")
    
    # 版本文件信息
    file_name = Column(String(255), nullable=False, comment="版本文件存储名称")
    file_path = Column(String(500), nullable=False, comment="版本文件在MinIO中的存储路径")
    file_size = Column(BigInteger, nullable=False, comment="版本文件大小（字节）")
    file_hash = Column(String(64), nullable=False, comment="版本文件SHA256哈希值")
    
    # 版本变更信息
    change_description = Column(Text, nullable=True, comment="版本变更描述")
    created_by = Column(Integer, ForeignKey("sys_users.id"), nullable=False, comment="版本创建者用户ID")
    
    # 版本创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="版本创建时间")
    
    # SQLAlchemy关系映射
    file = relationship("File", back_populates="versions")  # 所属文件对象
    creator = relationship("User")  # 版本创建者用户对象

class FileShare(Base):
    """文件分享模型
    
    管理文件分享功能，支持多种分享方式和权限控制。
    可以创建分享链接、设置访问密码、控制有效期等。
    
    主要特性:
    - 分享方式：支持指定用户分享和公开链接分享
    - 权限控制：支持只读、读写、管理等不同权限级别
    - 安全保护：支持密码保护和有效期控制
    - 访问统计：记录分享链接的访问次数和时间
    """
    __tablename__ = "sys_file_shares"

    # 分享记录唯一标识ID
    id = Column(Integer, primary_key=True, index=True, comment="文件分享记录ID")
    
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
    file = relationship("File", back_populates="tag_relations")
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