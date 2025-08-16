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

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, BigInteger, Index
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.infrastructure.persistence.database import Base
from enum import Enum
import uuid

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
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="文件唯一标识ID")
    
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
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    owner_id = Column(String(50), nullable=False, index=True, comment="文件所有者用户ID")
    parent_folder_id = Column(String(50), nullable=True, index=True, comment="父文件夹ID（null表示根目录）")
    
    # 文件使用统计信息
    download_count = Column(Integer, default=0, nullable=False, comment="文件下载次数统计")
    view_count = Column(Integer, default=0, nullable=False, comment="文件查看次数统计")
    
    # 时间戳和访问记录
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, comment="文件创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="文件最后更新时间")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="文件删除时间（软删除）")
    last_accessed = Column(DateTime(timezone=True), nullable=True, comment="文件最后访问时间")
    
    # 不使用直接relationship，通过服务层获取关联数据
    
    # 数据库索引配置（优化查询性能）
    __table_args__ = (
        Index('idx_file_tenant_owner', 'tenant_id', 'owner_id'),   # 租户用户文件查询
        Index('idx_file_owner_status', 'owner_id', 'status'),      # 按所有者和状态查询
        Index('idx_file_type_status', 'file_type', 'status'),      # 按文件类型和状态查询
        Index('idx_file_created', 'created_at'),                   # 按创建时间排序
        Index('idx_file_hash', 'file_hash'),                       # 文件去重查询
        Index('idx_file_tenant_category', 'tenant_id', 'category'), # 租户分类查询
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
    id = Column(String(50), primary_key=True, index=True, comment="文件夹唯一标识ID")
    
    # 文件夹基本信息
    name = Column(String(255), nullable=False, index=True, comment="文件夹名称")
    description = Column(Text, nullable=True, comment="文件夹描述信息")
    
    # 文件夹层级结构关系
    parent_id = Column(String(50), nullable=True, index=True, comment="父文件夹ID（null表示根目录）")
    path = Column(String(1000), nullable=False, index=True, comment="文件夹完整路径（/root/folder1/folder2）")
    level = Column(Integer, default=0, nullable=False, comment="文件夹层级深度（0为根目录）")
    
    # 文件夹所有权和可见性控制
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    owner_id = Column(String(50), nullable=False, index=True, comment="文件夹所有者用户ID")
    visibility = Column(String(20), default=VisibilityLevel.PRIVATE, nullable=False, comment="文件夹可见性级别")
    is_system = Column(Boolean, default=False, nullable=False, comment="是否为系统预定义文件夹（不可删除）")
    
    # 时间戳记录
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="文件夹创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="文件夹最后更新时间")
    
    # 不使用直接relationship，通过服务层获取关联数据
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_folder_tenant_owner', 'tenant_id', 'owner_id'),  # 租户用户文件夹查询
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
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="文件版本记录ID")
    
    # 版本关联信息
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    file_id = Column(String(50), nullable=False, index=True, comment="关联的文件ID")
    version_number = Column(Integer, nullable=False, comment="版本号（从1开始递增）")
    
    # 版本文件信息
    file_name = Column(String(255), nullable=False, comment="版本文件存储名称")
    file_path = Column(String(500), nullable=False, comment="版本文件在MinIO中的存储路径")
    file_size = Column(BigInteger, nullable=False, comment="版本文件大小（字节）")
    file_hash = Column(String(64), nullable=False, comment="版本文件SHA256哈希值")
    
    # 版本变更信息
    change_description = Column(Text, nullable=True, comment="版本变更描述")
    created_by = Column(String(50), nullable=False, comment="版本创建者用户ID")
    
    # 版本创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="版本创建时间")
    
    # 不使用直接relationship，通过服务层获取关联数据
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_version_file_number', 'file_id', 'version_number'),
        Index('idx_version_tenant', 'tenant_id'),
        {"comment": "文件版本管理表，记录文件的历史版本信息"}
    )

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
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="文件分享记录ID")
    
    # 关联信息
    file_id = Column(String(50), nullable=False, index=True, comment="关联的文件ID")
    shared_by = Column(String(50), nullable=False, comment="分享者用户ID")
    shared_with = Column(String(50), nullable=True, comment="分享接收者用户ID（为空表示公开分享）")
    
    # 分享配置
    access_type = Column(String(20), default="read", nullable=False, comment="访问权限类型（read/write/admin）")  
    share_token = Column(String(64), nullable=True, unique=True, comment="分享链接访问令牌")  
    password_protected = Column(Boolean, default=False, nullable=False, comment="是否设置密码保护")
    password_hash = Column(String(255), nullable=True, comment="分享密码哈希值")
    
    # 有效期
    expires_at = Column(DateTime(timezone=True), nullable=True, comment="分享链接过期时间")
    is_active = Column(Boolean, default=True, nullable=False, comment="分享是否有效")
    
    # 统计
    access_count = Column(Integer, default=0, nullable=False, comment="分享链接访问次数")
    last_accessed = Column(DateTime(timezone=True), nullable=True, comment="最后访问时间")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="分享创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="分享更新时间")
    
    # 数据库索引配置
    __table_args__ = (
        {"comment": "文件分享表，管理文件分享功能和权限控制"}
    )

class FileComment(Base):
    """文件评论模型
    
    管理文件的评论和回复功能，支持多级回复和评论编辑。
    提供丰富的文件协作和讨论功能，增强团队协作效率。
    
    主要特性:
    - 多级回复：支持对评论的回复和嵌套回复
    - 内容编辑：支持评论内容的修改和编辑
    - 权限控制：支持评论的查看和管理权限
    - 时间记录：记录评论的创建和修改时间
    """
    __tablename__ = "sys_file_comments"

    id = Column(String(50), primary_key=True, index=True, comment="评论唯一标识ID")
    
    # 关联信息
    file_id = Column(String(50), nullable=False, index=True, comment="关联的文件ID")
    user_id = Column(String(50), nullable=False, comment="评论者用户ID")
    parent_id = Column(String(50), nullable=True, comment="父评论 ID（用于回复功能）")
    
    # 评论内容
    content = Column(Text, nullable=False, comment="评论文本内容")
    is_edited = Column(Boolean, default=False, nullable=False, comment="是否被编辑过")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="评论创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="评论最后修改时间")
    
    # 数据库索引配置
    __table_args__ = (
        {"comment": "文件评论表，管理文件的评论和回复功能"}
    )

class FileCategory(Base):
    """文件分类模型
    
    管理文件的分类体系，支持分层级的分类结构和个性化配置。
    提供丰富的分类管理功能，帮助用户更好地组织和管理文件。
    
    主要特性:
    - 分层级管理：支持多级分类的层级结构
    - 视觉定制：支持自定义颜色和图标
    - 系统分类：支持系统预设和用户自定义分类
    - 权限控制：支持分类的创建和管理权限
    """
    __tablename__ = "sys_file_categories"

    id = Column(String(50), primary_key=True, index=True, comment="分类唯一标识ID")
    
    # 基本信息
    name = Column(String(100), nullable=False, index=True, comment="分类名称")
    description = Column(Text, nullable=True, comment="分类描述信息")
    color = Column(String(7), nullable=True, comment="分类颜色（HEX格式）")
    icon = Column(String(50), nullable=True, comment="分类图标名称")
    
    # 层级关系
    parent_id = Column(String(50), nullable=True, index=True, comment="父分类ID（为空表示顶级分类）")
    path = Column(String(500), nullable=False, index=True, comment="分类完整路径")
    level = Column(Integer, default=0, nullable=False, comment="分类层级深度（0为顶级）")
    
    # 权限和状态
    owner_id = Column(String(50), nullable=False, index=True, comment="分类创建者用户ID")
    is_system = Column(Boolean, default=False, nullable=False, comment="是否为系统预设分类")
    is_active = Column(Boolean, default=True, nullable=False, comment="分类是否激活")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="分类创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="分类最后更新时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_category_owner_name', 'owner_id', 'name'),
        Index('idx_category_path', 'path'),
        {"comment": "文件分类表，管理文件的分类体系"}
    )

class FileTag(Base):
    """文件标签模型
    
    管理文件的标签系统，支持自定义标签和系统预设标签。
    提供灵活的文件标记和分类功能，增强文件的可搜索性。
    
    主要特性:
    - 多样化标签：支持自定义标签和系统预设标签
    - 视觉定制：支持自定义标签颜色和样式
    - 使用统计：记录标签的使用频率和热度
    - 搜索支持：提供基于标签的文件搜索
    """
    __tablename__ = "sys_file_tags"

    id = Column(String(50), primary_key=True, index=True, comment="标签唯一标识ID")
    
    # 标签信息
    name = Column(String(100), nullable=False, index=True, comment="标签名称")
    description = Column(Text, nullable=True, comment="标签描述信息")
    color = Column(String(7), nullable=True, comment="标签颜色（HEX格式）")
    
    # 权限和状态
    owner_id = Column(String(50), nullable=False, index=True, comment="标签创建者用户ID")
    is_system = Column(Boolean, default=False, nullable=False, comment="是否为系统预设标签")
    usage_count = Column(Integer, default=0, nullable=False, comment="标签使用次数统计")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="标签创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="标签最后更新时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_tag_owner_name', 'owner_id', 'name'),
        Index('idx_tag_usage', 'usage_count'),
        {"comment": "文件标签表，管理文件的标签系统"}
    )

class FileTagRelation(Base):
    """文件标签关联模型
    
    管理文件和标签之间的多对多关联关系。
    单个文件可以关联多个标签，单个标签也可以关联多个文件。
    
    主要特性:
    - 多对多关联：支持文件和标签的多对多关联
    - 关联管理：记录关联的创建者和时间
    - 唯一性约束：防止重复关联同一文件和标签
    - 关联统计：支持标签使用频率统计
    """
    __tablename__ = "sys_file_tag_relations"

    id = Column(String(50), primary_key=True, index=True, comment="关联关系唯一标识ID")
    
    # 关联信息
    file_id = Column(String(50), nullable=False, index=True, comment="关联的文件ID")
    tag_id = Column(String(50), nullable=False, index=True, comment="关联的标签ID")
    
    # 关联元信息
    created_by = Column(String(50), nullable=False, comment="关联创建者用户ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="关联创建时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_file_tag_unique', 'file_id', 'tag_id', unique=True),
        {"comment": "文件标签关联表，管理文件和标签的多对多关联"}
    )

class FileActivity(Base):
    """文件活动日志模型
    
    记录文件的所有操作和访问活动，用于安全审计和行为分析。
    提供完整的文件操作过程记录，支持安全监控和问题追溯。
    
    主要特性:
    - 全面记录：记录所有文件操作和访问活动
    - 安全审计：提供安全审计和异常检测功能
    - 用户行为：分析用户的文件使用习惯和模式
    - 问题追溯：支持文件问题的根因分析和追溯
    """
    __tablename__ = "sys_file_activities"

    id = Column(String(50), primary_key=True, index=True, comment="活动记录唯一标识ID")
    
    # 关联信息
    file_id = Column(String(50), nullable=False, index=True, comment="关联的文件ID")
    user_id = Column(String(50), nullable=False, comment="操作者用户ID")
    
    # 活动信息
    action = Column(String(50), nullable=False, index=True, comment="操作类型（upload/download/view/edit/delete/share）")
    details = Column(Text, nullable=True, comment="活动详细信息（JSON格式）")
    ip_address = Column(String(45), nullable=True, comment="操作者IP地址")
    user_agent = Column(Text, nullable=True, comment="用户代理信息")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, comment="活动发生时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_activity_file_action', 'file_id', 'action'),
        Index('idx_activity_user_time', 'user_id', 'created_at'),
        {"comment": "文件活动日志表，记录文件的所有操作和访问活动"}
    )