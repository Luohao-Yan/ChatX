from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from app.models.file_models import File, Folder, FileShare, FileActivity, FileTag, FileCategory
from app.schemas.file_schemas import FileSearchParams


class IFileRepository(ABC):
    """文件仓储接口"""
    
    @abstractmethod
    async def create(self, file_data: dict) -> File:
        """创建文件记录"""
        pass
    
    @abstractmethod
    async def get_by_id(self, file_id: int) -> Optional[File]:
        """根据ID获取文件"""
        pass
    
    @abstractmethod
    async def get_by_hash(self, file_hash: str, user_id: int) -> Optional[File]:
        """根据哈希值获取文件（去重）"""
        pass
    
    @abstractmethod
    async def update(self, file_id: int, update_data: dict) -> Optional[File]:
        """更新文件信息"""
        pass
    
    @abstractmethod
    async def soft_delete(self, file_id: int) -> bool:
        """软删除文件"""
        pass
    
    @abstractmethod
    async def hard_delete(self, file_id: int) -> bool:
        """硬删除文件"""
        pass
    
    @abstractmethod
    async def search(self, search_params: FileSearchParams, user_id: int) -> Dict[str, Any]:
        """搜索文件"""
        pass
    
    @abstractmethod
    async def get_user_files(self, user_id: int, skip: int = 0, limit: int = 100) -> List[File]:
        """获取用户文件列表"""
        pass
    
    @abstractmethod
    async def get_folder_files(self, folder_id: int, user_id: int) -> List[File]:
        """获取文件夹下的文件"""
        pass
    
    @abstractmethod
    async def get_file_statistics(self, user_id: int = None) -> Dict[str, Any]:
        """获取文件统计信息"""
        pass


class IFolderRepository(ABC):
    """文件夹仓储接口"""
    
    @abstractmethod
    async def create(self, folder_data: dict) -> Folder:
        """创建文件夹"""
        pass
    
    @abstractmethod
    async def get_by_id(self, folder_id: int) -> Optional[Folder]:
        """根据ID获取文件夹"""
        pass
    
    @abstractmethod
    async def get_user_folders(self, user_id: int) -> List[Folder]:
        """获取用户文件夹列表"""
        pass
    
    @abstractmethod
    async def get_folder_tree(self, user_id: int) -> List[Dict]:
        """获取文件夹树形结构"""
        pass
    
    @abstractmethod
    async def update(self, folder_id: int, update_data: dict) -> Optional[Folder]:
        """更新文件夹"""
        pass
    
    @abstractmethod
    async def delete(self, folder_id: int) -> bool:
        """删除文件夹"""
        pass
    
    @abstractmethod
    async def check_name_exists(self, name: str, parent_id: int, user_id: int, exclude_id: int = None) -> bool:
        """检查同级文件夹名称是否存在"""
        pass


class IFileShareRepository(ABC):
    """文件分享仓储接口"""
    
    @abstractmethod
    async def create_share(self, share_data: dict) -> FileShare:
        """创建文件分享"""
        pass
    
    @abstractmethod
    async def get_by_token(self, share_token: str) -> Optional[FileShare]:
        """根据分享令牌获取分享"""
        pass
    
    @abstractmethod
    async def get_file_shares(self, file_id: int, user_id: int) -> List[FileShare]:
        """获取文件的分享列表"""
        pass
    
    @abstractmethod
    async def get_shared_files(self, user_id: int, skip: int = 0, limit: int = 100) -> List[File]:
        """获取分享给用户的文件"""
        pass
    
    @abstractmethod
    async def update_share(self, share_id: int, update_data: dict) -> Optional[FileShare]:
        """更新分享"""
        pass
    
    @abstractmethod
    async def revoke_share(self, share_id: int) -> bool:
        """撤销分享"""
        pass
    
    @abstractmethod
    async def check_user_access(self, file_id: int, user_id: int) -> Optional[FileShare]:
        """检查用户对文件的访问权限"""
        pass


class IFileActivityRepository(ABC):
    """文件活动仓储接口"""
    
    @abstractmethod
    async def log_activity(self, activity_data: dict) -> FileActivity:
        """记录文件活动"""
        pass
    
    @abstractmethod
    async def get_file_activities(self, file_id: int, limit: int = 50) -> List[FileActivity]:
        """获取文件活动记录"""
        pass
    
    @abstractmethod
    async def get_user_activities(self, user_id: int, limit: int = 50) -> List[FileActivity]:
        """获取用户活动记录"""
        pass


class IFileTagRepository(ABC):
    """文件标签仓储接口"""
    
    @abstractmethod
    async def create_tag(self, tag_data: dict) -> FileTag:
        """创建标签"""
        pass
    
    @abstractmethod
    async def get_user_tags(self, user_id: int) -> List[FileTag]:
        """获取用户标签"""
        pass
    
    @abstractmethod
    async def get_popular_tags(self, user_id: int, limit: int = 20) -> List[FileTag]:
        """获取热门标签"""
        pass
    
    @abstractmethod
    async def add_file_tags(self, file_id: int, tag_names: List[str], user_id: int) -> List[FileTag]:
        """为文件添加标签"""
        pass
    
    @abstractmethod
    async def remove_file_tags(self, file_id: int, tag_ids: List[int]) -> bool:
        """移除文件标签"""
        pass
    
    @abstractmethod
    async def get_file_tags(self, file_id: int) -> List[FileTag]:
        """获取文件标签"""
        pass


class IFileCategoryRepository(ABC):
    """文件分类仓储接口"""
    
    @abstractmethod
    async def create_category(self, category_data: dict) -> FileCategory:
        """创建分类"""
        pass
    
    @abstractmethod
    async def get_user_categories(self, user_id: int) -> List[FileCategory]:
        """获取用户分类"""
        pass
    
    @abstractmethod
    async def get_category_tree(self, user_id: int) -> List[Dict]:
        """获取分类树形结构"""
        pass
    
    @abstractmethod
    async def update_category(self, category_id: int, update_data: dict) -> Optional[FileCategory]:
        """更新分类"""
        pass
    
    @abstractmethod
    async def delete_category(self, category_id: int) -> bool:
        """删除分类"""
        pass