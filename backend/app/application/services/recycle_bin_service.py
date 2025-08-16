from typing import List, Tuple, Dict, Any
from datetime import datetime, timezone
from fastapi import HTTPException

from app.domain.repositories.user_repository import IUserRepository
from app.domain.services.user_domain_service import UserDomainService
from app.schemas.batch_schemas import BatchOperationResponse
from app.models.user_models import User


class RecycleBinService:
    """回收站服务 - 管理软删除的用户"""
    
    def __init__(self, user_repo: IUserRepository):
        self.user_repo = user_repo
        self.domain_service = UserDomainService()
    
    async def get_deleted_users(self, skip: int, limit: int, current_user: User) -> Tuple[List[Dict[str, Any]], int]:
        """获取回收站中的用户列表"""
        # 获取所有已删除的用户
        users = await self.user_repo.get_all_users_including_deleted()
        
        # 过滤出已删除的用户
        deleted_users = [user for user in users if user.deleted_at is not None]
        
        # 分页
        total = len(deleted_users)
        paginated_users = deleted_users[skip:skip + limit]
        
        # 转换为字典格式
        result = []
        for user in paginated_users:
            result.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "deleted_at": user.deleted_at,
                "deleted_by": user.deleted_by,
                "roles": []  # TODO: 获取用户角色
            })
        
        return result, total
    
    async def restore_users(self, user_ids: List[str], current_user: User) -> BatchOperationResponse:
        """恢复用户"""
        success_ids = []
        failed_ids = []
        
        for user_id in user_ids:
            try:
                # 检查用户是否存在且已删除
                user = await self.user_repo.get_by_id_including_deleted(user_id)
                if not user:
                    failed_ids.append(user_id)
                    continue
                
                if user.deleted_at is None:
                    failed_ids.append(user_id)  # 用户未被删除
                    continue
                
                # 恢复用户
                restore_data = {
                    "deleted_at": None,
                    "deleted_by": None,
                    "is_active": True
                }
                await self.user_repo.update(user_id, restore_data)
                success_ids.append(user_id)
                
            except Exception:
                failed_ids.append(user_id)
        
        return BatchOperationResponse(
            message=f"恢复完成，成功 {len(success_ids)} 个，失败 {len(failed_ids)} 个",
            affected_count=len(success_ids),
            success_ids=success_ids,
            failed_ids=failed_ids
        )
    
    async def permanently_delete_users(self, user_ids: List[str], current_user: User) -> BatchOperationResponse:
        """彻底删除用户"""
        success_ids = []
        failed_ids = []
        
        for user_id in user_ids:
            try:
                # 检查用户是否存在且已删除
                user = await self.user_repo.get_by_id_including_deleted(user_id)
                if not user:
                    failed_ids.append(user_id)
                    continue
                
                if user.deleted_at is None:
                    failed_ids.append(user_id)  # 用户未被删除，不能彻底删除
                    continue
                
                # 不能删除自己
                if user.id == current_user.id:
                    failed_ids.append(user_id)
                    continue
                
                # 彻底删除用户
                await self.user_repo.hard_delete(user_id)
                success_ids.append(user_id)
                
            except Exception:
                failed_ids.append(user_id)
        
        return BatchOperationResponse(
            message=f"彻底删除完成，成功 {len(success_ids)} 个，失败 {len(failed_ids)} 个",
            affected_count=len(success_ids),
            success_ids=success_ids,
            failed_ids=failed_ids
        )
    
    async def clear_recycle_bin(self, current_user: User) -> int:
        """清空回收站"""
        # 获取所有已删除的用户
        users = await self.user_repo.get_all_users_including_deleted()
        deleted_users = [user for user in users if user.deleted_at is not None]
        
        count = 0
        for user in deleted_users:
            # 不能删除自己
            if user.id == current_user.id:
                continue
            
            try:
                await self.user_repo.hard_delete(user.id)
                count += 1
            except Exception:
                continue
        
        return count