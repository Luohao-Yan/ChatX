from minio import Minio
from minio.error import S3Error
from app.core.config import settings
import logging
from typing import Optional, BinaryIO
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)

class MinIOClient:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET
        self._ensure_bucket()
    
    def _ensure_bucket(self):
        """确保存储桶存在"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"创建MinIO存储桶: {self.bucket_name}")
        except S3Error as e:
            logger.error(f"创建MinIO存储桶失败: {e}")
            raise
    
    def upload_file(
        self,
        file_data: BinaryIO,
        file_name: str,
        content_type: str,
        user_id: int,
        folder: str = "uploads"
    ) -> dict:
        """上传文件"""
        try:
            # 生成唯一文件名
            file_extension = file_name.split('.')[-1] if '.' in file_name else ''
            unique_name = f"{uuid.uuid4().hex}.{file_extension}" if file_extension else uuid.uuid4().hex
            object_name = f"{folder}/{user_id}/{unique_name}"
            
            # 重置文件指针
            file_data.seek(0)
            
            # 获取文件大小
            file_data.seek(0, 2)  # 移动到文件末尾
            file_size = file_data.tell()
            file_data.seek(0)  # 重置到开始
            
            # 上传文件
            result = self.client.put_object(
                self.bucket_name,
                object_name,
                file_data,
                length=file_size,
                content_type=content_type,
                metadata={
                    "user_id": str(user_id),
                    "original_name": file_name,
                    "upload_time": datetime.now().isoformat()
                }
            )
            
            file_info = {
                "object_name": object_name,
                "bucket_name": self.bucket_name,
                "file_size": file_size,
                "content_type": content_type,
                "original_name": file_name,
                "user_id": user_id,
                "upload_time": datetime.now(),
                "etag": result.etag
            }
            
            logger.info(f"文件上传成功: {object_name}")
            return file_info
            
        except S3Error as e:
            logger.error(f"文件上传失败: {e}")
            raise Exception(f"文件上传失败: {str(e)}")
    
    def download_file(self, object_name: str) -> bytes:
        """下载文件"""
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            logger.error(f"文件下载失败: {e}")
            raise Exception(f"文件下载失败: {str(e)}")
    
    def delete_file(self, object_name: str) -> bool:
        """删除文件"""
        try:
            self.client.remove_object(self.bucket_name, object_name)
            logger.info(f"文件删除成功: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"文件删除失败: {e}")
            return False
    
    def get_file_url(self, object_name: str, expires: timedelta = timedelta(hours=1)) -> str:
        """生成文件访问URL"""
        try:
            url = self.client.presigned_get_object(
                self.bucket_name,
                object_name,
                expires=expires
            )
            return url
        except S3Error as e:
            logger.error(f"生成文件URL失败: {e}")
            raise Exception(f"生成文件URL失败: {str(e)}")
    
    def get_file_info(self, object_name: str) -> dict:
        """获取文件信息"""
        try:
            stat = self.client.stat_object(self.bucket_name, object_name)
            return {
                "object_name": object_name,
                "size": stat.size,
                "content_type": stat.content_type,
                "last_modified": stat.last_modified,
                "etag": stat.etag,
                "metadata": stat.metadata
            }
        except S3Error as e:
            logger.error(f"获取文件信息失败: {e}")
            raise Exception(f"获取文件信息失败: {str(e)}")
    
    def list_user_files(self, user_id: int, prefix: str = "uploads/") -> list:
        """列出用户的文件"""
        try:
            user_prefix = f"{prefix}{user_id}/"
            objects = self.client.list_objects(
                self.bucket_name,
                prefix=user_prefix,
                recursive=True
            )
            
            files = []
            for obj in objects:
                files.append({
                    "object_name": obj.object_name,
                    "size": obj.size,
                    "last_modified": obj.last_modified,
                    "etag": obj.etag
                })
            
            return files
        except S3Error as e:
            logger.error(f"列出用户文件失败: {e}")
            return []

# 全局MinIO客户端实例
minio_client = MinIOClient()

def get_minio() -> MinIOClient:
    """获取MinIO客户端"""
    return minio_client