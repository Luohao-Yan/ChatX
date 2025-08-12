from typing import Optional, List, Dict, Any, BinaryIO
from fastapi import HTTPException, UploadFile
from datetime import datetime, timezone
import json

from app.domain.repositories.file_repository import (
    IFileRepository, IFolderRepository, IFileShareRepository, 
    IFileActivityRepository, IFileTagRepository, IFileCategoryRepository
)
from app.domain.services.file_domain_service import (
    FileDomainService, FolderDomainService, FileShareDomainService
)
from app.schemas.file_schemas import (
    FileCreate, FileUpdate, FileSearchParams, FolderCreate, 
    FileShareCreate, FileTagCreate, FileCategoryCreate
)
from app.models.file_models import File, Folder, FileShare, FileTag, FileCategory
from app.models.user_models import User


class FileApplicationService:
    """文件应用服务 - 协调文件管理的业务流程"""
    
    def __init__(
        self,
        file_repo: IFileRepository,
        folder_repo: IFolderRepository,
        share_repo: IFileShareRepository,
        activity_repo: IFileActivityRepository,
        tag_repo: IFileTagRepository,
        category_repo: IFileCategoryRepository,
        storage_service,  # MinIO or other storage service
        search_service=None,  # Weaviate or other search service
        graph_service=None   # Neo4j or other graph service
    ):
        self.file_repo = file_repo
        self.folder_repo = folder_repo
        self.share_repo = share_repo
        self.activity_repo = activity_repo
        self.tag_repo = tag_repo
        self.category_repo = category_repo
        self.storage_service = storage_service
        self.search_service = search_service
        self.graph_service = graph_service
        
        self.file_domain = FileDomainService()
        self.folder_domain = FolderDomainService()
        self.share_domain = FileShareDomainService()
    
    async def upload_file(self, file: UploadFile, user: User, file_create: FileCreate,
                         ip_address: str = None, user_agent: str = None) -> File:
        """上传文件"""
        # 1. 验证文件
        is_valid, error_msg = self.file_domain.validate_file_upload(
            file.filename, file.size or 0, file.content_type or ""
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 2. 计算文件哈希
        file_hash = self.file_domain.calculate_file_hash(file.file)
        
        # 3. 检查文件是否已存在（去重）
        existing_file = await self.file_repo.get_by_hash(file_hash, user.id)
        if existing_file:
            return existing_file
        
        # 4. 准备文件数据
        file_data = self.file_domain.prepare_file_data(
            filename=file.filename,
            file_size=file.size or 0,
            mime_type=file.content_type or "",
            file_hash=file_hash,
            user_id=user.id,
            title=file_create.title,
            description=file_create.description,
            tags=file_create.tags,
            visibility=file_create.visibility,
            parent_folder_id=file_create.parent_folder_id
        )
        
        # 5. 上传到存储服务
        storage_result = await self._upload_to_storage(file, file_data["file_name"], user.id)
        file_data["file_path"] = storage_result["object_name"]
        
        # 6. 创建数据库记录
        db_file = await self.file_repo.create(file_data)
        
        # 7. 记录活动
        await self._log_activity(
            db_file.id, user.id, "upload", 
            {"file_name": file.filename, "file_size": file.size},
            ip_address, user_agent
        )
        
        # 8. 异步处理（向量化、知识图谱等）
        await self._process_file_async(db_file)
        
        return db_file
    
    async def get_file_by_id(self, file_id: int, user: User) -> Optional[File]:
        """获取文件详情"""
        file = await self.file_repo.get_by_id(file_id)
        if not file:
            return None
        
        # 权限检查
        can_access, error_msg = self.file_domain.can_user_access_file(file, user, "read")
        if not can_access:
            # 检查分享权限
            share = await self.share_repo.check_user_access(file_id, user.id)
            if not share:
                raise HTTPException(status_code=403, detail="无权限访问此文件")
        
        return file
    
    async def update_file(self, file_id: int, file_update: FileUpdate, user: User) -> Optional[File]:
        """更新文件信息"""
        file = await self.file_repo.get_by_id(file_id)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 权限检查
        can_modify, error_msg = self.file_domain.can_user_modify_file(file, user)
        if not can_modify:
            raise HTTPException(status_code=403, detail=error_msg)
        
        # 更新数据
        update_data = file_update.model_dump(exclude_unset=True)
        updated_file = await self.file_repo.update(file_id, update_data)
        
        # 记录活动
        await self._log_activity(file_id, user.id, "update", update_data)
        
        return updated_file
    
    async def delete_file(self, file_id: int, user: User, permanent: bool = False) -> bool:
        """删除文件"""
        file = await self.file_repo.get_by_id(file_id)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 权限检查
        can_delete, error_msg = self.file_domain.can_user_delete_file(file, user)
        if not can_delete:
            raise HTTPException(status_code=403, detail=error_msg)
        
        if permanent:
            # 硬删除：删除存储和数据库记录
            await self._delete_from_storage(file.file_path)
            success = await self.file_repo.hard_delete(file_id)
        else:
            # 软删除
            success = await self.file_repo.soft_delete(file_id)
        
        # 记录活动
        await self._log_activity(file_id, user.id, "delete", {"permanent": permanent})
        
        return success
    
    async def search_files(self, search_params: FileSearchParams, user: User) -> Dict[str, Any]:
        """搜索文件"""
        return await self.file_repo.search(search_params, user.id)
    
    async def download_file(self, file_id: int, user: User) -> bytes:
        """下载文件"""
        file = await self.get_file_by_id(file_id, user)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 从存储服务下载
        file_data = await self._download_from_storage(file.file_path)
        
        # 更新统计信息
        await self.file_repo.update(file_id, {
            "download_count": file.download_count + 1,
            "last_accessed": datetime.now(timezone.utc)
        })
        
        # 记录活动
        await self._log_activity(file_id, user.id, "download")
        
        return file_data
    
    # ==================== 文件夹管理 ====================
    
    async def create_folder(self, folder_create: FolderCreate, user: User) -> Folder:
        """创建文件夹"""
        # 验证
        is_valid, error_msg = self.folder_domain.validate_folder_creation(folder_create.name)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 获取父文件夹
        parent_folder = None
        if folder_create.parent_id:
            parent_folder = await self.folder_repo.get_by_id(folder_create.parent_id)
            if not parent_folder or parent_folder.owner_id != user.id:
                raise HTTPException(status_code=404, detail="父文件夹不存在")
        
        # 检查名称重复
        if await self.folder_repo.check_name_exists(
            folder_create.name, folder_create.parent_id, user.id
        ):
            raise HTTPException(status_code=400, detail="文件夹名称已存在")
        
        # 准备数据
        folder_data = self.folder_domain.prepare_folder_data(
            folder_create.name, folder_create.description, 
            parent_folder, user.id, folder_create.visibility
        )
        
        return await self.folder_repo.create(folder_data)
    
    async def get_folder_tree(self, user: User) -> List[Dict]:
        """获取文件夹树形结构"""
        return await self.folder_repo.get_folder_tree(user.id)
    
    async def get_folder_files(self, folder_id: int, user: User) -> List[File]:
        """获取文件夹下的文件"""
        return await self.file_repo.get_folder_files(folder_id, user.id)
    
    # ==================== 文件分享 ====================
    
    async def share_file(self, file_id: int, user: User, share_create: FileShareCreate) -> FileShare:
        """分享文件"""
        file = await self.file_repo.get_by_id(file_id)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 权限检查
        can_share, error_msg = self.share_domain.can_user_share_file(file, user)
        if not can_share:
            raise HTTPException(status_code=403, detail=error_msg)
        
        # 准备分享数据
        share_token = None if share_create.shared_with else self.share_domain.generate_share_token()
        
        share_data = self.share_domain.prepare_share_data(
            file_id=file_id,
            shared_by=user.id,
            shared_with=share_create.shared_with,
            access_type=share_create.access_type,
            share_token=share_token,
            password_protected=share_create.password_protected,
            expires_at=share_create.expires_at
        )
        
        share = await self.share_repo.create_share(share_data)
        
        # 记录活动
        await self._log_activity(
            file_id, user.id, "share",
            {"shared_with": share_create.shared_with, "access_type": share_create.access_type}
        )
        
        return share
    
    async def get_file_shares(self, file_id: int, user: User) -> List[FileShare]:
        """获取文件分享列表"""
        file = await self.file_repo.get_by_id(file_id)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        if file.owner_id != user.id:
            raise HTTPException(status_code=403, detail="无权限查看分享信息")
        
        return await self.share_repo.get_file_shares(file_id, user.id)
    
    async def get_shared_files(self, user: User, skip: int = 0, limit: int = 100) -> List[File]:
        """获取分享给我的文件"""
        return await self.share_repo.get_shared_files(user.id, skip, limit)
    
    # ==================== 统计信息 ====================
    
    async def get_file_statistics(self, user: User) -> Dict[str, Any]:
        """获取文件统计信息"""
        return await self.file_repo.get_file_statistics(user.id)
    
    # ==================== 标签管理 ====================
    
    async def create_tag(self, tag_create: FileTagCreate, user: User) -> FileTag:
        """创建标签"""
        tag_data = {
            "name": tag_create.name,
            "description": tag_create.description,
            "color": tag_create.color,
            "owner_id": user.id
        }
        return await self.tag_repo.create_tag(tag_data)
    
    async def get_user_tags(self, user: User) -> List[FileTag]:
        """获取用户标签"""
        return await self.tag_repo.get_user_tags(user.id)
    
    async def add_file_tags(self, file_id: int, tag_names: List[str], user: User) -> List[FileTag]:
        """为文件添加标签"""
        file = await self.get_file_by_id(file_id, user)
        if not file:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        return await self.tag_repo.add_file_tags(file_id, tag_names, user.id)
    
    # ==================== 分类管理 ====================
    
    async def create_category(self, category_create: FileCategoryCreate, user: User) -> FileCategory:
        """创建分类"""
        # 获取父分类
        parent_category = None
        if category_create.parent_id:
            parent_category = await self.category_repo.get_user_categories(user.id)
            parent_category = next((c for c in parent_category if c.id == category_create.parent_id), None)
            if not parent_category:
                raise HTTPException(status_code=404, detail="父分类不存在")
        
        # 构建路径
        path = category_create.name
        level = 0
        if parent_category:
            path = f"{parent_category.path}/{category_create.name}"
            level = parent_category.level + 1
        
        category_data = {
            "name": category_create.name,
            "description": category_create.description,
            "color": category_create.color,
            "icon": category_create.icon,
            "parent_id": category_create.parent_id,
            "path": path,
            "level": level,
            "owner_id": user.id
        }
        
        return await self.category_repo.create_category(category_data)
    
    async def get_category_tree(self, user: User) -> List[Dict]:
        """获取分类树形结构"""
        return await self.category_repo.get_category_tree(user.id)
    
    # ==================== 私有方法 ====================
    
    async def _upload_to_storage(self, file: UploadFile, filename: str, user_id: int) -> Dict[str, str]:
        """上传文件到存储服务"""
        if hasattr(self.storage_service, 'upload_file'):
            return self.storage_service.upload_file(
                file_data=file.file,
                file_name=filename,
                content_type=file.content_type,
                user_id=user_id,
                folder="files"
            )
        else:
            # 模拟返回
            return {"object_name": f"files/{filename}"}
    
    async def _download_from_storage(self, file_path: str) -> bytes:
        """从存储服务下载文件"""
        if hasattr(self.storage_service, 'download_file'):
            return self.storage_service.download_file(file_path)
        else:
            # 模拟返回
            return b"file content"
    
    async def _delete_from_storage(self, file_path: str) -> bool:
        """从存储服务删除文件"""
        if hasattr(self.storage_service, 'delete_file'):
            return self.storage_service.delete_file(file_path)
        return True
    
    async def _log_activity(self, file_id: int, user_id: int, action: str, 
                           details: Dict = None, ip_address: str = None, user_agent: str = None):
        """记录文件活动"""
        activity_data = {
            "file_id": file_id,
            "user_id": user_id,
            "action": action,
            "details": json.dumps(details) if details else None,
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        await self.activity_repo.log_activity(activity_data)
    
    async def _process_file_async(self, file: File):
        """异步处理文件：向量化、知识图谱等"""
        try:
            # 添加到知识图谱
            if self.graph_service:
                self.graph_service.create_document_node(
                    str(file.id),
                    {
                        "title": file.title or file.original_name,
                        "file_type": file.file_type,
                        "created_at": file.created_at,
                        "size": file.file_size
                    }
                )
                
                # 创建用户-文档关系
                self.graph_service.create_relationship(
                    {"label": "User", "id": file.owner_id},
                    {"label": "Document", "id": str(file.id)},
                    "OWNS",
                    {"created_at": datetime.now().isoformat()}
                )
        except Exception as e:
            # 记录错误但不影响主流程
            pass