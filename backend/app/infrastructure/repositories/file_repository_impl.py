from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from datetime import datetime, timezone

from app.domain.repositories.file_repository import (
    IFileRepository, IFolderRepository, IFileShareRepository, 
    IFileActivityRepository, IFileTagRepository, IFileCategoryRepository
)
from app.models.file_models import (
    File, Folder, FileShare, FileActivity, FileTag, FileCategory, 
    FileTagRelation, FileStatus, VisibilityLevel
)
from app.schemas.file_schemas import FileSearchParams


class FileRepository(IFileRepository):
    """文件仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, file_data: dict) -> File:
        """创建文件记录"""
        file = File(**file_data)
        self.db.add(file)
        self.db.commit()
        self.db.refresh(file)
        return file
    
    async def get_by_id(self, file_id: int) -> Optional[File]:
        """根据ID获取文件"""
        return self.db.query(File).filter(File.id == file_id).first()
    
    async def get_by_hash(self, file_hash: str, user_id: int) -> Optional[File]:
        """根据哈希值获取文件（去重）"""
        return self.db.query(File).filter(
            File.file_hash == file_hash,
            File.owner_id == user_id,
            File.status == FileStatus.ACTIVE
        ).first()
    
    async def update(self, file_id: int, update_data: dict) -> Optional[File]:
        """更新文件信息"""
        file = await self.get_by_id(file_id)
        if not file:
            return None
        
        for key, value in update_data.items():
            if hasattr(file, key):
                setattr(file, key, value)
        
        file.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(file)
        return file
    
    async def soft_delete(self, file_id: int) -> bool:
        """软删除文件"""
        file = await self.get_by_id(file_id)
        if not file:
            return False
        
        file.status = FileStatus.DELETED
        file.deleted_at = datetime.now(timezone.utc)
        self.db.commit()
        return True
    
    async def hard_delete(self, file_id: int) -> bool:
        """硬删除文件"""
        file = await self.get_by_id(file_id)
        if not file:
            return False
        
        self.db.delete(file)
        self.db.commit()
        return True
    
    async def search(self, search_params: FileSearchParams, user_id: int) -> Dict[str, Any]:
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
                    or_(FileShare.expires_at.is_(None), FileShare.expires_at > datetime.now(timezone.utc))
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
    
    async def get_user_files(self, user_id: int, skip: int = 0, limit: int = 100) -> List[File]:
        """获取用户文件列表"""
        return self.db.query(File).filter(
            File.owner_id == user_id,
            File.status == FileStatus.ACTIVE
        ).offset(skip).limit(limit).all()
    
    async def get_folder_files(self, folder_id: int, user_id: int) -> List[File]:
        """获取文件夹下的文件"""
        return self.db.query(File).filter(
            File.parent_folder_id == folder_id,
            File.owner_id == user_id,
            File.status == FileStatus.ACTIVE
        ).all()
    
    async def get_file_statistics(self, user_id: int = None) -> Dict[str, Any]:
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


class FolderRepository(IFolderRepository):
    """文件夹仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, folder_data: dict) -> Folder:
        """创建文件夹"""
        folder = Folder(**folder_data)
        self.db.add(folder)
        self.db.commit()
        self.db.refresh(folder)
        return folder
    
    async def get_by_id(self, folder_id: int) -> Optional[Folder]:
        """根据ID获取文件夹"""
        return self.db.query(Folder).filter(Folder.id == folder_id).first()
    
    async def get_user_folders(self, user_id: int) -> List[Folder]:
        """获取用户文件夹列表"""
        return self.db.query(Folder).filter(
            Folder.owner_id == user_id
        ).order_by(Folder.path).all()
    
    async def get_folder_tree(self, user_id: int) -> List[Dict]:
        """获取文件夹树形结构"""
        folders = await self.get_user_folders(user_id)
        
        folder_dict = {f.id: {
            "id": f.id,
            "name": f.name,
            "description": f.description,
            "path": f.path,
            "level": f.level,
            "parent_id": f.parent_id,
            "children": [],
            "file_count": self.db.query(File).filter(
                File.parent_folder_id == f.id,
                File.owner_id == user_id,
                File.status == FileStatus.ACTIVE
            ).count()
        } for f in folders}
        
        root_folders = []
        
        for folder in folders:
            if folder.parent_id and folder.parent_id in folder_dict:
                folder_dict[folder.parent_id]["children"].append(folder_dict[folder.id])
            else:
                root_folders.append(folder_dict[folder.id])
        
        return root_folders
    
    async def update(self, folder_id: int, update_data: dict) -> Optional[Folder]:
        """更新文件夹"""
        folder = await self.get_by_id(folder_id)
        if not folder:
            return None
        
        for key, value in update_data.items():
            if hasattr(folder, key):
                setattr(folder, key, value)
        
        self.db.commit()
        self.db.refresh(folder)
        return folder
    
    async def delete(self, folder_id: int) -> bool:
        """删除文件夹"""
        folder = await self.get_by_id(folder_id)
        if not folder:
            return False
        
        self.db.delete(folder)
        self.db.commit()
        return True
    
    async def check_name_exists(self, name: str, parent_id: int, user_id: int, exclude_id: int = None) -> bool:
        """检查同级文件夹名称是否存在"""
        query = self.db.query(Folder).filter(
            Folder.name == name,
            Folder.parent_id == parent_id,
            Folder.owner_id == user_id
        )
        
        if exclude_id:
            query = query.filter(Folder.id != exclude_id)
        
        return query.first() is not None


class FileShareRepository(IFileShareRepository):
    """文件分享仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_share(self, share_data: dict) -> FileShare:
        """创建文件分享"""
        share = FileShare(**share_data)
        self.db.add(share)
        self.db.commit()
        self.db.refresh(share)
        return share
    
    async def get_by_token(self, share_token: str) -> Optional[FileShare]:
        """根据分享令牌获取分享"""
        return self.db.query(FileShare).filter(
            FileShare.share_token == share_token,
            FileShare.is_active == True
        ).first()
    
    async def get_file_shares(self, file_id: int, user_id: int) -> List[FileShare]:
        """获取文件的分享列表"""
        return self.db.query(FileShare).filter(
            FileShare.file_id == file_id,
            FileShare.shared_by == user_id
        ).all()
    
    async def get_shared_files(self, user_id: int, skip: int = 0, limit: int = 100) -> List[File]:
        """获取分享给用户的文件"""
        shared_file_ids = (
            self.db.query(FileShare.file_id)
            .filter(
                FileShare.shared_with == user_id,
                FileShare.is_active == True,
                or_(FileShare.expires_at.is_(None), FileShare.expires_at > datetime.now(timezone.utc))
            )
            .subquery()
        )
        
        return self.db.query(File).filter(
            File.id.in_(shared_file_ids),
            File.status == FileStatus.ACTIVE
        ).offset(skip).limit(limit).all()
    
    async def update_share(self, share_id: int, update_data: dict) -> Optional[FileShare]:
        """更新分享"""
        share = self.db.query(FileShare).filter(FileShare.id == share_id).first()
        if not share:
            return None
        
        for key, value in update_data.items():
            if hasattr(share, key):
                setattr(share, key, value)
        
        self.db.commit()
        self.db.refresh(share)
        return share
    
    async def revoke_share(self, share_id: int) -> bool:
        """撤销分享"""
        share = self.db.query(FileShare).filter(FileShare.id == share_id).first()
        if not share:
            return False
        
        share.is_active = False
        self.db.commit()
        return True
    
    async def check_user_access(self, file_id: int, user_id: int) -> Optional[FileShare]:
        """检查用户对文件的访问权限"""
        return self.db.query(FileShare).filter(
            FileShare.file_id == file_id,
            FileShare.shared_with == user_id,
            FileShare.is_active == True,
            or_(FileShare.expires_at.is_(None), FileShare.expires_at > datetime.now(timezone.utc))
        ).first()


class FileActivityRepository(IFileActivityRepository):
    """文件活动仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def log_activity(self, activity_data: dict) -> FileActivity:
        """记录文件活动"""
        activity = FileActivity(**activity_data)
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)
        return activity
    
    async def get_file_activities(self, file_id: int, limit: int = 50) -> List[FileActivity]:
        """获取文件活动记录"""
        return self.db.query(FileActivity).filter(
            FileActivity.file_id == file_id
        ).order_by(desc(FileActivity.created_at)).limit(limit).all()
    
    async def get_user_activities(self, user_id: int, limit: int = 50) -> List[FileActivity]:
        """获取用户活动记录"""
        return self.db.query(FileActivity).filter(
            FileActivity.user_id == user_id
        ).order_by(desc(FileActivity.created_at)).limit(limit).all()


class FileTagRepository(IFileTagRepository):
    """文件标签仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_tag(self, tag_data: dict) -> FileTag:
        """创建标签"""
        tag = FileTag(**tag_data)
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        return tag
    
    async def get_user_tags(self, user_id: int) -> List[FileTag]:
        """获取用户标签"""
        return self.db.query(FileTag).filter(
            or_(
                FileTag.owner_id == user_id,
                FileTag.is_system == True
            )
        ).order_by(FileTag.usage_count.desc(), FileTag.name).all()
    
    async def get_popular_tags(self, user_id: int, limit: int = 20) -> List[FileTag]:
        """获取热门标签"""
        return self.db.query(FileTag).filter(
            or_(
                FileTag.owner_id == user_id,
                FileTag.is_system == True
            ),
            FileTag.usage_count > 0
        ).order_by(FileTag.usage_count.desc()).limit(limit).all()
    
    async def add_file_tags(self, file_id: int, tag_names: List[str], user_id: int) -> List[FileTag]:
        """为文件添加标签"""
        added_tags = []
        
        for tag_name in tag_names:
            # 获取或创建标签
            tag = self.db.query(FileTag).filter(
                FileTag.name == tag_name,
                FileTag.owner_id == user_id
            ).first()
            
            if not tag:
                tag = FileTag(name=tag_name, owner_id=user_id)
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
    
    async def remove_file_tags(self, file_id: int, tag_ids: List[int]) -> bool:
        """移除文件标签"""
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
    
    async def get_file_tags(self, file_id: int) -> List[FileTag]:
        """获取文件标签"""
        return self.db.query(FileTag).join(
            FileTagRelation, FileTag.id == FileTagRelation.tag_id
        ).filter(
            FileTagRelation.file_id == file_id
        ).all()


class FileCategoryRepository(IFileCategoryRepository):
    """文件分类仓储实现类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_category(self, category_data: dict) -> FileCategory:
        """创建分类"""
        category = FileCategory(**category_data)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category
    
    async def get_user_categories(self, user_id: int) -> List[FileCategory]:
        """获取用户分类"""
        return self.db.query(FileCategory).filter(
            FileCategory.owner_id == user_id,
            FileCategory.is_active == True
        ).order_by(FileCategory.path).all()
    
    async def get_category_tree(self, user_id: int) -> List[Dict]:
        """获取分类树形结构"""
        categories = await self.get_user_categories(user_id)
        
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
    
    async def update_category(self, category_id: int, update_data: dict) -> Optional[FileCategory]:
        """更新分类"""
        category = self.db.query(FileCategory).filter(
            FileCategory.id == category_id
        ).first()
        
        if not category:
            return None
        
        for key, value in update_data.items():
            if hasattr(category, key) and value is not None:
                setattr(category, key, value)
        
        self.db.commit()
        self.db.refresh(category)
        return category
    
    async def delete_category(self, category_id: int) -> bool:
        """删除分类"""
        category = self.db.query(FileCategory).filter(
            FileCategory.id == category_id
        ).first()
        
        if not category:
            return False
        
        category.is_active = False
        self.db.commit()
        return True