from typing import List, Optional, Dict, Any, BinaryIO
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from fastapi import HTTPException, status, UploadFile
import hashlib
import uuid
import mimetypes
import os
from datetime import datetime, timedelta
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.models.file_models import (
    File, Folder, FileVersion, FileShare, FileComment, FileActivity,
    FileStatus, FileType, VisibilityLevel, FileCategory, FileTag, FileTagRelation
)
from app.schemas.file_schemas import (
    FileCreate, FileUpdate, FileSearchParams, 
    FolderCreate, FolderUpdate, FileShareCreate,
    FileCategoryCreate, FileTagCreate
)
from app.core.minio_client import MinIOClient
from app.core.weaviate_client import WeaviateClient
from app.core.neo4j_client import Neo4jClient
import logging

logger = logging.getLogger(__name__)

class FileService:
    def __init__(self, db: Session, minio: MinIOClient, 
                 weaviate: WeaviateClient, neo4j: Neo4jClient):
        self.db = db
        self.minio = minio
        self.weaviate = weaviate
        self.neo4j = neo4j
        self.executor = ThreadPoolExecutor(max_workers=4)

    def _get_file_type(self, mime_type: str, file_extension: str) -> FileType:
        """根据MIME类型和文件扩展名确定文件类型"""
        mime_type = mime_type.lower() if mime_type else ""
        extension = file_extension.lower() if file_extension else ""
        
        # 图片类型
        if mime_type.startswith('image/') or extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff']:
            return FileType.IMAGE
            
        # 视频类型
        elif mime_type.startswith('video/') or extension in ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp']:
            return FileType.VIDEO
            
        # 音频类型
        elif mime_type.startswith('audio/') or extension in ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.opus']:
            return FileType.AUDIO
            
        # PDF类型
        elif mime_type == 'application/pdf' or extension == '.pdf':
            return FileType.PDF
            
        # 文档类型
        elif (mime_type in ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] or
              extension in ['.doc', '.docx', '.rtf', '.odt', '.pages']):
            return FileType.DOCUMENT
            
        # 表格类型
        elif (mime_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] or
              extension in ['.xls', '.xlsx', '.csv', '.ods', '.numbers']):
            return FileType.SPREADSHEET
            
        # 演示文稿类型
        elif (mime_type in ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'] or
              extension in ['.ppt', '.pptx', '.odp', '.key']):
            return FileType.PRESENTATION
            
        # 代码类型
        elif (mime_type.startswith('text/') and extension in ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.sql', '.html', '.css', '.scss', '.less', '.xml', '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.sh', '.bat', '.ps1', '.dockerfile', '.md', '.rst', '.tex']):
            return FileType.CODE
            
        # 纯文本类型
        elif mime_type.startswith('text/') or extension in ['.txt', '.log', '.readme']:
            return FileType.TEXT
            
        # 压缩包类型
        elif (mime_type in ['application/zip', 'application/x-rar-compressed', 'application/x-tar', 'application/gzip'] or
              extension in ['.zip', '.rar', '.tar', '.gz', '.7z', '.bz2', '.xz']):
            return FileType.ARCHIVE
            
        else:
            return FileType.OTHER

    def _calculate_file_hash(self, file_data: BinaryIO) -> str:
        """计算文件SHA256哈希值"""
        sha256_hash = hashlib.sha256()
        file_data.seek(0)
        for byte_block in iter(lambda: file_data.read(4096), b""):
            sha256_hash.update(byte_block)
        file_data.seek(0)
        return sha256_hash.hexdigest()

    def _generate_unique_filename(self, original_name: str) -> str:
        """生成唯一的文件名"""
        name, extension = os.path.splitext(original_name)
        unique_id = str(uuid.uuid4())
        return f"{unique_id}{extension}"

    def _log_file_activity(self, file_id: int, user_id: int, action: str, 
                          details: Dict = None, ip_address: str = None, user_agent: str = None):
        """记录文件活动"""
        activity = FileActivity(
            file_id=file_id,
            user_id=user_id,
            action=action,
            details=json.dumps(details) if details else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(activity)
        self.db.commit()

    async def upload_file(self, file: UploadFile, user_id: int, 
                         file_create: FileCreate, ip_address: str = None, 
                         user_agent: str = None) -> File:
        """上传文件"""
        try:
            # 计算文件哈希
            file_hash = self._calculate_file_hash(file.file)
            
            # 检查文件是否已存在（去重）
            existing_file = self.db.query(File).filter(
                File.file_hash == file_hash,
                File.owner_id == user_id,
                File.status == FileStatus.ACTIVE
            ).first()
            
            if existing_file:
                # 如果文件已存在，增加引用计数或创建软链接
                logger.info(f"文件已存在，复用: {file_hash}")
                return existing_file

            # 生成唯一文件名
            unique_filename = self._generate_unique_filename(file.filename)
            
            # 获取文件信息
            file_size = file.size or 0
            mime_type = file.content_type or mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'
            file_extension = os.path.splitext(file.filename)[1]
            file_type = self._get_file_type(mime_type, file_extension)

            # 上传到MinIO
            upload_result = self.minio.upload_file(
                file_data=file.file,
                file_name=unique_filename,
                content_type=mime_type,
                user_id=user_id,
                folder="files"
            )

            # 创建数据库记录
            db_file = File(
                original_name=file.filename,
                file_name=unique_filename,
                file_path=upload_result["object_name"],
                file_size=file_size,
                file_type=file_type,
                mime_type=mime_type,
                file_extension=file_extension,
                file_hash=file_hash,
                title=file_create.title or file.filename,
                description=file_create.description,
                tags=file_create.tags,
                category=file_create.category,
                keywords=file_create.keywords,
                visibility=file_create.visibility,
                parent_folder_id=file_create.parent_folder_id,
                owner_id=user_id,
                status=FileStatus.ACTIVE
            )
            
            self.db.add(db_file)
            self.db.commit()
            self.db.refresh(db_file)

            # 记录活动
            self._log_file_activity(
                db_file.id, user_id, "upload", 
                {"file_name": file.filename, "file_size": file_size},
                ip_address, user_agent
            )

            # 异步处理：向量化和知识图谱
            asyncio.create_task(self._process_file_async(db_file))

            return db_file

        except Exception as e:
            logger.error(f"文件上传失败: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"文件上传失败: {str(e)}"
            )

    async def _process_file_async(self, file: File):
        """异步处理文件：向量化、知识图谱等"""
        try:
            # 如果是文档类型，提取文本内容并向量化
            if file.file_type == FileType.DOCUMENT:
                # 这里可以添加文档内容提取逻辑
                # content = await self._extract_document_content(file)
                
                # 添加到向量数据库
                # await self._add_to_vector_db(file, content)
                pass
            
            # 添加到知识图谱
            self.neo4j.create_document_node(
                str(file.id),
                {
                    "title": file.title or file.original_name,
                    "file_type": file.file_type,
                    "created_at": file.created_at,
                    "size": file.file_size
                }
            )
            
            # 创建用户-文档关系
            self.neo4j.create_relationship(
                {"label": "User", "id": file.owner_id},
                {"label": "Document", "id": str(file.id)},
                "OWNS",
                {"created_at": datetime.now().isoformat()}
            )

        except Exception as e:
            logger.error(f"异步处理文件失败: {e}")

    def get_file_by_id(self, file_id: int, user_id: int) -> Optional[File]:
        """根据ID获取文件"""
        file = self.db.query(File).filter(File.id == file_id).first()
        
        if not file:
            return None
            
        # 权限检查
        if not self._check_file_access(file, user_id, "read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限访问此文件"
            )
            
        return file

    def _check_file_access(self, file: File, user_id: int, access_type: str = "read") -> bool:
        """检查文件访问权限"""
        # 文件所有者有所有权限
        if file.owner_id == user_id:
            return True
            
        # 公开文件，所有人可读
        if file.visibility == VisibilityLevel.PUBLIC and access_type == "read":
            return True
            
        # 检查共享权限
        share = self.db.query(FileShare).filter(
            FileShare.file_id == file.id,
            FileShare.shared_with == user_id,
            FileShare.is_active == True,
            or_(FileShare.expires_at.is_(None), FileShare.expires_at > datetime.now())
        ).first()
        
        if share:
            if access_type == "read":
                return True
            elif access_type == "write" and share.access_type in ["write", "admin"]:
                return True
            elif access_type == "admin" and share.access_type == "admin":
                return True
                
        return False

    def search_files(self, search_params: FileSearchParams, user_id: int) -> Dict[str, Any]:
        """搜索文件"""
        query = self.db.query(File).filter(File.status == FileStatus.ACTIVE)
        
        # 权限过滤：只能看到自己的文件或有权限的文件
        access_filter = or_(
            File.owner_id == user_id,  # 自己的文件
            File.visibility == VisibilityLevel.PUBLIC,  # 公开文件
            File.id.in_(  # 共享给自己的文件
                self.db.query(FileShare.file_id).filter(
                    FileShare.shared_with == user_id,
                    FileShare.is_active == True,
                    or_(FileShare.expires_at.is_(None), FileShare.expires_at > datetime.now())
                )
            )
        )
        query = query.filter(access_filter)
        
        # 关键词搜索
        if search_params.keyword:
            keyword = f"%{search_params.keyword}%"
            query = query.filter(
                or_(
                    File.original_name.ilike(keyword),
                    File.title.ilike(keyword),
                    File.description.ilike(keyword),
                    File.tags.ilike(keyword),
                    File.category.ilike(keyword),
                    File.keywords.ilike(keyword)
                )
            )
        
        # 文件类型过滤
        if search_params.file_type:
            query = query.filter(File.file_type == search_params.file_type)
            
        if search_params.mime_type:
            query = query.filter(File.mime_type == search_params.mime_type)
        
        # 文件夹过滤
        if search_params.folder_id:
            query = query.filter(File.parent_folder_id == search_params.folder_id)
        
        # 分类过滤
        if search_params.category:
            query = query.filter(File.category == search_params.category)
        
        # 标签ID过滤
        if search_params.tag_ids:
            query = query.filter(
                File.id.in_(
                    self.db.query(FileTagRelation.file_id).filter(
                        FileTagRelation.tag_id.in_(search_params.tag_ids)
                    )
                )
            )
        
        # 时间范围过滤
        if search_params.created_from:
            query = query.filter(File.created_at >= search_params.created_from)
        if search_params.created_to:
            query = query.filter(File.created_at <= search_params.created_to)
        
        # 文件大小过滤
        if search_params.min_size:
            query = query.filter(File.file_size >= search_params.min_size)
        if search_params.max_size:
            query = query.filter(File.file_size <= search_params.max_size)
        
        # 排序
        sort_column = getattr(File, search_params.sort_by, File.created_at)
        if search_params.sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        # 分页
        total = query.count()
        offset = (search_params.page - 1) * search_params.per_page
        files = query.offset(offset).limit(search_params.per_page).all()
        
        return {
            "files": files,
            "total": total,
            "page": search_params.page,
            "per_page": search_params.per_page,
            "pages": (total + search_params.per_page - 1) // search_params.per_page
        }

    def delete_file(self, file_id: int, user_id: int, soft_delete: bool = True) -> bool:
        """删除文件"""
        file = self.get_file_by_id(file_id, user_id)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
            
        if not self._check_file_access(file, user_id, "admin"):
            raise HTTPException(status_code=403, detail="无权限删除此文件")
        
        if soft_delete:
            # 软删除
            file.status = FileStatus.DELETED
            file.deleted_at = datetime.now()
        else:
            # 硬删除
            # 删除MinIO中的文件
            self.minio.delete_file(file.file_path)
            # 删除数据库记录
            self.db.delete(file)
        
        # 记录活动
        self._log_file_activity(
            file_id, user_id, "delete", 
            {"soft_delete": soft_delete}
        )
        
        self.db.commit()
        return True

    def create_folder(self, folder_create: FolderCreate, user_id: int) -> Folder:
        """创建文件夹"""
        # 构建路径
        path = folder_create.name
        level = 0
        
        if folder_create.parent_id:
            parent = self.db.query(Folder).filter(
                Folder.id == folder_create.parent_id,
                Folder.owner_id == user_id
            ).first()
            
            if not parent:
                raise HTTPException(status_code=404, detail="父文件夹不存在")
                
            path = f"{parent.path}/{folder_create.name}"
            level = parent.level + 1
        
        # 检查同级文件夹名称重复
        existing = self.db.query(Folder).filter(
            Folder.name == folder_create.name,
            Folder.parent_id == folder_create.parent_id,
            Folder.owner_id == user_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="文件夹名称已存在")
        
        folder = Folder(
            name=folder_create.name,
            description=folder_create.description,
            parent_id=folder_create.parent_id,
            path=path,
            level=level,
            owner_id=user_id,
            visibility=folder_create.visibility
        )
        
        self.db.add(folder)
        self.db.commit()
        self.db.refresh(folder)
        
        return folder

    def share_file(self, file_id: int, user_id: int, share_create: FileShareCreate) -> FileShare:
        """分享文件"""
        file = self.get_file_by_id(file_id, user_id)
        if not self._check_file_access(file, user_id, "admin"):
            raise HTTPException(status_code=403, detail="无权限分享此文件")
        
        # 生成分享令牌
        share_token = str(uuid.uuid4()) if not share_create.shared_with else None
        
        share = FileShare(
            file_id=file_id,
            shared_by=user_id,
            shared_with=share_create.shared_with,
            access_type=share_create.access_type,
            share_token=share_token,
            password_protected=share_create.password_protected,
            expires_at=share_create.expires_at
        )
        
        if share_create.password_protected and share_create.password:
            # 这里应该使用密码哈希
            share.password_hash = hashlib.sha256(share_create.password.encode()).hexdigest()
        
        self.db.add(share)
        self.db.commit()
        self.db.refresh(share)
        
        # 记录活动
        self._log_file_activity(
            file_id, user_id, "share",
            {"shared_with": share_create.shared_with, "access_type": share_create.access_type}
        )
        
        return share

    def get_file_statistics(self, user_id: int = None) -> Dict[str, Any]:
        """获取文件统计信息"""
        base_query = self.db.query(File).filter(File.status == FileStatus.ACTIVE)
        
        if user_id:
            base_query = base_query.filter(File.owner_id == user_id)
        
        # 基本统计
        total_files = base_query.count()
        total_size = base_query.with_entities(func.sum(File.file_size)).scalar() or 0
        
        # 按类型统计
        by_type = dict(
            base_query.with_entities(File.file_type, func.count(File.id))
            .group_by(File.file_type).all()
        )
        
        # 按状态统计
        by_status = dict(
            self.db.query(File.status, func.count(File.id))
            .group_by(File.status).all()
        )
        
        # 按可见性统计
        by_visibility = dict(
            base_query.with_entities(File.visibility, func.count(File.id))
            .group_by(File.visibility).all()
        )
        
        # 最近上传
        recent_uploads = (
            base_query.order_by(desc(File.created_at))
            .limit(10).all()
        )
        
        # 热门文件
        popular_files = (
            base_query.order_by(desc(File.download_count))
            .limit(10).all()
        )
        
        return {
            "total_files": total_files,
            "total_size": total_size,
            "by_type": by_type,
            "by_status": by_status,
            "by_visibility": by_visibility,
            "recent_uploads": recent_uploads,
            "popular_files": popular_files
        }

    # ==================== 分类管理 ====================
    
    def create_category(self, category_create: FileCategoryCreate, user_id: int) -> FileCategory:
        """创建文件分类"""
        # 构建路径
        path = category_create.name
        level = 0
        
        if category_create.parent_id:
            parent = self.db.query(FileCategory).filter(
                FileCategory.id == category_create.parent_id,
                FileCategory.owner_id == user_id,
                FileCategory.is_active == True
            ).first()
            
            if not parent:
                raise HTTPException(status_code=404, detail="父分类不存在")
                
            path = f"{parent.path}/{category_create.name}"
            level = parent.level + 1
        
        # 检查同级分类名称重复
        existing = self.db.query(FileCategory).filter(
            FileCategory.name == category_create.name,
            FileCategory.parent_id == category_create.parent_id,
            FileCategory.owner_id == user_id,
            FileCategory.is_active == True
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="分类名称已存在")
        
        category = FileCategory(
            name=category_create.name,
            description=category_create.description,
            color=category_create.color,
            icon=category_create.icon,
            parent_id=category_create.parent_id,
            path=path,
            level=level,
            owner_id=user_id
        )
        
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def get_categories(self, user_id: int) -> List[FileCategory]:
        """获取用户的所有分类"""
        return self.db.query(FileCategory).filter(
            FileCategory.owner_id == user_id,
            FileCategory.is_active == True
        ).order_by(FileCategory.path).all()
    
    def get_category_tree(self, user_id: int) -> List[Dict]:
        """获取分类树形结构"""
        categories = self.get_categories(user_id)
        
        category_dict = {c.id: {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "color": c.color,
            "icon": c.icon,
            "path": c.path,
            "level": c.level,
            "parent_id": c.parent_id,
            "children": [],
            "file_count": self.db.query(File).filter(
                File.category == c.name,
                File.owner_id == user_id,
                File.status == FileStatus.ACTIVE
            ).count()
        } for c in categories}
        
        root_categories = []
        
        for category in categories:
            if category.parent_id and category.parent_id in category_dict:
                category_dict[category.parent_id]["children"].append(category_dict[category.id])
            else:
                root_categories.append(category_dict[category.id])
        
        return root_categories
    
    def update_category(self, category_id: int, user_id: int, **kwargs) -> FileCategory:
        """更新分类"""
        category = self.db.query(FileCategory).filter(
            FileCategory.id == category_id,
            FileCategory.owner_id == user_id
        ).first()
        
        if not category:
            raise HTTPException(status_code=404, detail="分类不存在")
        
        for key, value in kwargs.items():
            if hasattr(category, key) and value is not None:
                setattr(category, key, value)
        
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def delete_category(self, category_id: int, user_id: int) -> bool:
        """删除分类（软删除）"""
        category = self.db.query(FileCategory).filter(
            FileCategory.id == category_id,
            FileCategory.owner_id == user_id
        ).first()
        
        if not category:
            raise HTTPException(status_code=404, detail="分类不存在")
        
        # 检查是否有子分类
        child_count = self.db.query(FileCategory).filter(
            FileCategory.parent_id == category_id,
            FileCategory.is_active == True
        ).count()
        
        if child_count > 0:
            raise HTTPException(status_code=400, detail="请先删除子分类")
        
        # 检查是否有文件使用此分类
        file_count = self.db.query(File).filter(
            File.category == category.name,
            File.owner_id == user_id,
            File.status == FileStatus.ACTIVE
        ).count()
        
        if file_count > 0:
            raise HTTPException(status_code=400, detail="分类下还有文件，无法删除")
        
        category.is_active = False
        self.db.commit()
        
        return True

    # ==================== 标签管理 ====================
    
    def create_tag(self, tag_create: FileTagCreate, user_id: int) -> FileTag:
        """创建文件标签"""
        # 检查标签名称重复
        existing = self.db.query(FileTag).filter(
            FileTag.name == tag_create.name,
            FileTag.owner_id == user_id
        ).first()
        
        if existing:
            return existing  # 如果标签已存在，直接返回
        
        tag = FileTag(
            name=tag_create.name,
            description=tag_create.description,
            color=tag_create.color,
            owner_id=user_id
        )
        
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        
        return tag
    
    def get_tags(self, user_id: int, include_system: bool = True) -> List[FileTag]:
        """获取用户的所有标签"""
        query = self.db.query(FileTag)
        
        if include_system:
            query = query.filter(
                or_(
                    FileTag.owner_id == user_id,
                    FileTag.is_system == True
                )
            )
        else:
            query = query.filter(FileTag.owner_id == user_id)
        
        return query.order_by(FileTag.usage_count.desc(), FileTag.name).all()
    
    def get_popular_tags(self, user_id: int, limit: int = 20) -> List[FileTag]:
        """获取热门标签"""
        return self.db.query(FileTag).filter(
            or_(
                FileTag.owner_id == user_id,
                FileTag.is_system == True
            ),
            FileTag.usage_count > 0
        ).order_by(FileTag.usage_count.desc()).limit(limit).all()
    
    def add_file_tags(self, file_id: int, tag_names: List[str], user_id: int) -> List[FileTag]:
        """为文件添加标签"""
        file = self.get_file_by_id(file_id, user_id)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        added_tags = []
        
        for tag_name in tag_names:
            # 获取或创建标签
            tag = self.db.query(FileTag).filter(
                FileTag.name == tag_name,
                FileTag.owner_id == user_id
            ).first()
            
            if not tag:
                tag = FileTag(
                    name=tag_name,
                    owner_id=user_id
                )
                self.db.add(tag)
                self.db.commit()
                self.db.refresh(tag)
            
            # 检查关联是否已存在
            existing_relation = self.db.query(FileTagRelation).filter(
                FileTagRelation.file_id == file_id,
                FileTagRelation.tag_id == tag.id
            ).first()
            
            if not existing_relation:
                relation = FileTagRelation(
                    file_id=file_id,
                    tag_id=tag.id,
                    created_by=user_id
                )
                self.db.add(relation)
                
                # 增加标签使用次数
                tag.usage_count += 1
                
                added_tags.append(tag)
        
        self.db.commit()
        
        return added_tags
    
    def remove_file_tags(self, file_id: int, tag_ids: List[int], user_id: int) -> bool:
        """移除文件标签"""
        file = self.get_file_by_id(file_id, user_id)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 删除关联关系
        relations = self.db.query(FileTagRelation).filter(
            FileTagRelation.file_id == file_id,
            FileTagRelation.tag_id.in_(tag_ids)
        ).all()
        
        for relation in relations:
            # 减少标签使用次数
            tag = self.db.query(FileTag).filter(FileTag.id == relation.tag_id).first()
            if tag and tag.usage_count > 0:
                tag.usage_count -= 1
            
            self.db.delete(relation)
        
        self.db.commit()
        
        return True
    
    def get_file_tags(self, file_id: int, user_id: int) -> List[FileTag]:
        """获取文件的标签"""
        file = self.get_file_by_id(file_id, user_id)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        return self.db.query(FileTag).join(
            FileTagRelation, FileTag.id == FileTagRelation.tag_id
        ).filter(
            FileTagRelation.file_id == file_id
        ).all()