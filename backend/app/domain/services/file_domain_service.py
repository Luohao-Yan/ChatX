from typing import Optional, Tuple, BinaryIO
from app.models.file_models import File, Folder, FileType, VisibilityLevel, FileStatus
from app.models.user_models import User
import hashlib
import uuid
import mimetypes
import os


class FileDomainService:
    """文件领域服务 - 包含文件相关的核心业务逻辑"""
    
    @staticmethod
    def calculate_file_hash(file_data: BinaryIO) -> str:
        """计算文件SHA256哈希值"""
        sha256_hash = hashlib.sha256()
        file_data.seek(0)
        for byte_block in iter(lambda: file_data.read(4096), b""):
            sha256_hash.update(byte_block)
        file_data.seek(0)
        return sha256_hash.hexdigest()
    
    @staticmethod
    def generate_unique_filename(original_name: str) -> str:
        """生成唯一的文件名"""
        name, extension = os.path.splitext(original_name)
        unique_id = str(uuid.uuid4())
        return f"{unique_id}{extension}"
    
    @staticmethod
    def determine_file_type(mime_type: str, file_extension: str) -> FileType:
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
    
    @staticmethod
    def can_user_access_file(file: File, user: User, access_type: str = "read") -> Tuple[bool, Optional[str]]:
        """检查用户是否可以访问文件"""
        # 文件所有者有所有权限
        if file.owner_id == user.id:
            return True, None
            
        # 公开文件，所有人可读
        if file.visibility == VisibilityLevel.PUBLIC and access_type == "read":
            return True, None
            
        # 其他情况需要检查分享权限（在应用服务层处理）
        return False, "需要检查分享权限"
    
    @staticmethod
    def can_user_delete_file(file: File, user: User) -> Tuple[bool, Optional[str]]:
        """检查用户是否可以删除文件"""
        # 只有文件所有者可以删除
        if file.owner_id != user.id:
            return False, "只有文件所有者可以删除文件"
        
        # 已删除的文件不能再次删除
        if file.status == FileStatus.DELETED:
            return False, "文件已被删除"
        
        return True, None
    
    @staticmethod
    def can_user_modify_file(file: File, user: User) -> Tuple[bool, Optional[str]]:
        """检查用户是否可以修改文件"""
        # 只有文件所有者可以修改基本信息
        if file.owner_id != user.id:
            return False, "只有文件所有者可以修改文件信息"
        
        return True, None
    
    @staticmethod
    def validate_file_upload(filename: str, file_size: int, mime_type: str) -> Tuple[bool, Optional[str]]:
        """验证文件上传"""
        # 文件名检查
        if not filename or len(filename.strip()) == 0:
            return False, "文件名不能为空"
        
        if len(filename) > 255:
            return False, "文件名长度不能超过255个字符"
        
        # 文件大小检查（100MB限制）
        max_file_size = 100 * 1024 * 1024  # 100MB
        if file_size > max_file_size:
            return False, f"文件大小不能超过{max_file_size // (1024*1024)}MB"
        
        # 危险文件类型检查
        dangerous_extensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js']
        file_extension = os.path.splitext(filename)[1].lower()
        if file_extension in dangerous_extensions:
            return False, f"不支持上传 {file_extension} 类型的文件"
        
        return True, None
    
    @staticmethod
    def prepare_file_data(filename: str, file_size: int, mime_type: str, file_hash: str, 
                         user_id: int, title: str = None, description: str = None, 
                         tags: str = None, visibility: str = "private", 
                         parent_folder_id: int = None) -> dict:
        """准备文件数据用于创建"""
        file_extension = os.path.splitext(filename)[1]
        file_type = FileDomainService.determine_file_type(mime_type, file_extension)
        unique_filename = FileDomainService.generate_unique_filename(filename)
        
        return {
            "original_name": filename,
            "file_name": unique_filename,
            "file_path": f"files/{unique_filename}",  # 默认路径
            "file_size": file_size,
            "file_type": file_type,
            "mime_type": mime_type,
            "file_extension": file_extension,
            "file_hash": file_hash,
            "title": title or filename,
            "description": description,
            "tags": tags,
            "visibility": visibility,
            "parent_folder_id": parent_folder_id,
            "owner_id": user_id,
            "status": FileStatus.ACTIVE
        }


class FolderDomainService:
    """文件夹领域服务"""
    
    @staticmethod
    def validate_folder_creation(name: str, parent_folder: Folder = None) -> Tuple[bool, Optional[str]]:
        """验证文件夹创建"""
        if not name or len(name.strip()) == 0:
            return False, "文件夹名称不能为空"
        
        if len(name) > 100:
            return False, "文件夹名称长度不能超过100个字符"
        
        # 检查文件夹层级深度（最多10层）
        if parent_folder and parent_folder.level >= 10:
            return False, "文件夹层级不能超过10层"
        
        return True, None
    
    @staticmethod
    def prepare_folder_data(name: str, description: str, parent_folder: Folder, 
                           user_id: int, visibility: str = "private") -> dict:
        """准备文件夹数据"""
        if parent_folder:
            path = f"{parent_folder.path}/{name}"
            level = parent_folder.level + 1
            parent_id = parent_folder.id
        else:
            path = name
            level = 0
            parent_id = None
        
        return {
            "name": name,
            "description": description,
            "parent_id": parent_id,
            "path": path,
            "level": level,
            "owner_id": user_id,
            "visibility": visibility
        }


class FileShareDomainService:
    """文件分享领域服务"""
    
    @staticmethod
    def can_user_share_file(file: File, user: User) -> Tuple[bool, Optional[str]]:
        """检查用户是否可以分享文件"""
        if file.owner_id != user.id:
            return False, "只有文件所有者可以分享文件"
        
        if file.status != FileStatus.ACTIVE:
            return False, "只能分享活跃状态的文件"
        
        return True, None
    
    @staticmethod
    def generate_share_token() -> str:
        """生成分享令牌"""
        return str(uuid.uuid4())
    
    @staticmethod
    def prepare_share_data(file_id: int, shared_by: int, shared_with: int = None, 
                          access_type: str = "read", share_token: str = None, 
                          password_protected: bool = False, expires_at = None) -> dict:
        """准备分享数据"""
        return {
            "file_id": file_id,
            "shared_by": shared_by,
            "shared_with": shared_with,
            "access_type": access_type,
            "share_token": share_token or FileShareDomainService.generate_share_token(),
            "password_protected": password_protected,
            "expires_at": expires_at,
            "is_active": True
        }