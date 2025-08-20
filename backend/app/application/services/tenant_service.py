"""
租户管理应用服务
属于应用层，负责租户相关的业务逻辑处理
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.tenant_models import Tenant, TenantUser, TenantStatus
from app.models.file_models import File
from app.models.org_models import Organization
from app.models.tenant_backup_models import TenantBackup
from app.models.user_models import User
from app.schemas.tenant_schemas import (
    TenantCreate,
    TenantUpdate,
    TenantResponse,
    TenantStatsResponse,
    TenantUserCreate,
    TenantUserResponse
)
from app.core.exceptions import ValidationError, PermissionError, NotFoundError


class TenantApplicationService:
    """租户应用服务"""

    def __init__(self, db: Session, current_user_id: str):
        self.db = db
        self.current_user_id = current_user_id

    def create_tenant(self, tenant_data: TenantCreate) -> Tenant:
        """创建租户"""
        # 检查租户名称是否已存在
        existing_tenant = self.db.query(Tenant).filter(
            Tenant.name == tenant_data.name,
            Tenant.deleted_at.is_(None)
        ).first()
        
        if existing_tenant:
            raise ValidationError(f"租户名称 '{tenant_data.name}' 已存在")

        # 生成唯一ID和schema名称
        tenant_id = str(uuid.uuid4())
        schema_name = tenant_data.schema_name or f"tenant_{tenant_id.replace('-', '_')}"

        # 检查schema名称是否已存在
        existing_schema = self.db.query(Tenant).filter(
            Tenant.schema_name == schema_name,
            Tenant.deleted_at.is_(None)
        ).first()
        
        if existing_schema:
            raise ValidationError(f"Schema名称 '{schema_name}' 已存在")

        # 创建租户
        tenant = Tenant(
            id=tenant_id,
            name=tenant_data.name,
            display_name=tenant_data.display_name or tenant_data.name,
            description=tenant_data.description,
            schema_name=schema_name,
            owner_id=self.current_user_id,
            status=TenantStatus.ACTIVE,
            is_active=True,
            slug=tenant_data.slug,
            domain=tenant_data.domain,
            subdomain=tenant_data.subdomain,
            settings=tenant_data.settings or {},
            features=tenant_data.features or [],
            limits=tenant_data.limits or {}
        )

        self.db.add(tenant)
        self.db.commit()
        self.db.refresh(tenant)

        # 自动将创建者添加为租户管理员
        tenant_user = TenantUser(
            tenant_id=tenant.id,
            user_id=self.current_user_id,
            role="admin",
            is_admin=True,
            is_active=True
        )
        
        self.db.add(tenant_user)
        self.db.commit()

        return tenant

    def get_tenants(self, include_deleted: bool = False) -> List[Tenant]:
        """获取租户列表，包含统计信息"""
        query = self.db.query(Tenant)
        
        if not include_deleted:
            query = query.filter(Tenant.deleted_at.is_(None))
        
        # 普通用户只能看到自己所属的租户
        if not self._is_system_admin():
            tenant_ids = self._get_user_tenant_ids()
            if not tenant_ids:  # 如果用户没有所属租户，返回空列表
                return []
            query = query.filter(Tenant.id.in_(tenant_ids))
        
        tenants = query.order_by(Tenant.created_at.desc()).all()
        
        # 为每个租户添加统计信息
        for tenant in tenants:
            tenant.user_count = self._get_tenant_user_count(tenant.id)
            tenant.org_count = self._get_tenant_org_count(tenant.id)
            tenant.storage_used = self._get_tenant_storage_usage(tenant.id)
        
        return tenants

    def get_tenant_by_id(self, tenant_id: str) -> Optional[Tenant]:
        """根据ID获取租户"""
        tenant = self.db.query(Tenant).filter(
            Tenant.id == tenant_id,
            Tenant.deleted_at.is_(None)
        ).first()
        
        if not tenant:
            return None
            
        # 检查权限
        if not self._can_access_tenant(tenant_id):
            raise PermissionError("无权访问该租户")
            
        return tenant

    def update_tenant(self, tenant_id: str, tenant_update: TenantUpdate) -> Optional[Tenant]:
        """更新租户"""
        tenant = self.get_tenant_by_id(tenant_id)
        if not tenant:
            raise NotFoundError("租户不存在")

        # 检查是否有管理权限
        if not self._can_manage_tenant(tenant_id):
            raise PermissionError("无权管理该租户")

        # 更新字段
        update_data = tenant_update.dict(exclude_unset=True)
        
        # 检查名称唯一性
        if 'name' in update_data and update_data['name'] != tenant.name:
            existing = self.db.query(Tenant).filter(
                Tenant.name == update_data['name'],
                Tenant.id != tenant_id,
                Tenant.deleted_at.is_(None)
            ).first()
            if existing:
                raise ValidationError(f"租户名称 '{update_data['name']}' 已存在")

        for field, value in update_data.items():
            setattr(tenant, field, value)

        tenant.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(tenant)

        return tenant

    def delete_tenant(self, tenant_id: str, force: bool = False) -> bool:
        """软删除租户"""
        tenant = self.get_tenant_by_id(tenant_id)
        if not tenant:
            raise NotFoundError("租户不存在")

        # 检查是否有管理权限
        if not self._can_manage_tenant(tenant_id):
            raise PermissionError("无权删除该租户")

        # 获取租户用户信息
        tenant_users = self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.is_active == True
        ).all()
        
        # 检查用户情况
        user_count = len(tenant_users)
        
        # 如果只有创建者自己，允许删除
        if user_count == 1:
            only_user = tenant_users[0]
            if only_user.user_id == tenant.owner_id and only_user.user_id == self.current_user_id:
                # 自动移除创建者的关联关系
                self.db.delete(only_user)
            else:
                raise ValidationError(f"无法删除租户，该租户下还有其他用户，请先移除所有用户")
        elif user_count > 1:
            if force:
                # 强制删除时，移除所有用户关联
                for tenant_user in tenant_users:
                    self.db.delete(tenant_user)
            else:
                raise ValidationError(f"无法删除租户，该租户下还有 {user_count} 个用户，请先在用户管理页面移除所有用户")
        elif user_count == 0:
            # 没有用户，可以直接删除
            pass
        
        # 检查租户下是否还有组织
        org_count = self._get_tenant_org_count(tenant_id)
        if org_count > 0:
            if force:
                # 强制删除时，软删除所有组织
                orgs = self.db.query(Organization).filter(
                    Organization.tenant_id == tenant_id,
                    Organization.deleted_at.is_(None)
                ).all()
                for org in orgs:
                    org.deleted_at = datetime.now(timezone.utc)
                    org.deleted_by = self.current_user_id
            else:
                raise ValidationError(f"无法删除租户，该租户下还有 {org_count} 个组织，请先移除所有组织")

        # 软删除
        tenant.deleted_at = datetime.now(timezone.utc)
        tenant.deleted_by = self.current_user_id
        tenant.is_active = False
        
        self.db.commit()
        return True

    def get_tenant_stats(self, tenant_id: str) -> Optional[TenantStatsResponse]:
        """获取租户统计信息"""
        tenant = self.get_tenant_by_id(tenant_id)
        if not tenant:
            return None

        # 这里应该根据实际需求计算统计数据
        # 暂时返回模拟数据
        return TenantStatsResponse(
            id=tenant.id,
            name=tenant.display_name or tenant.name,
            user_count=self._get_tenant_user_count(tenant_id),
            org_count=0,  # 需要实现组织统计
            storage_used="0 MB",  # 需要实现存储统计
            last_activity=tenant.updated_at
        )

    def add_user_to_tenant(self, tenant_id: str, user_data: TenantUserCreate) -> TenantUser:
        """将用户添加到租户"""
        if not self._can_manage_tenant(tenant_id):
            raise PermissionError("无权管理该租户")

        # 检查用户是否已在租户中
        existing = self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.user_id == user_data.user_id
        ).first()
        
        if existing:
            raise ValidationError("用户已在该租户中")

        tenant_user = TenantUser(
            tenant_id=tenant_id,
            user_id=user_data.user_id,
            role=user_data.role,
            permissions=user_data.permissions,
            is_admin=user_data.is_admin,
            is_active=True
        )

        self.db.add(tenant_user)
        self.db.commit()
        self.db.refresh(tenant_user)

        return tenant_user

    def remove_user_from_tenant(self, tenant_id: str, user_id: str) -> bool:
        """从租户中移除用户"""
        if not self._can_manage_tenant(tenant_id):
            raise PermissionError("无权管理该租户")

        tenant_user = self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.user_id == user_id
        ).first()

        if not tenant_user:
            raise NotFoundError("用户不在该租户中")

        self.db.delete(tenant_user)
        self.db.commit()
        return True

    def get_tenant_users(self, tenant_id: str) -> List[TenantUser]:
        """获取租户用户列表"""
        if not self._can_access_tenant(tenant_id):
            raise PermissionError("无权访问该租户")

        return self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.is_active == True
        ).all()

    def _is_system_admin(self) -> bool:
        """检查是否为系统管理员"""
        # 获取当前用户信息
        user = self.db.query(User).filter(User.id == self.current_user_id).first()
        if not user:
            return False
        
        # 检查用户是否是超级用户
        if user.is_superuser:
            return True
        
        # 检查用户是否有super_admin角色（存储在JSON字段中）
        user_roles = user.roles or []
        if 'super_admin' in user_roles:
            return True
        
        return False

    def _get_user_tenant_ids(self) -> List[str]:
        """获取用户所属的租户ID列表"""
        tenant_users = self.db.query(TenantUser).filter(
            TenantUser.user_id == self.current_user_id,
            TenantUser.is_active == True
        ).all()
        
        return [tu.tenant_id for tu in tenant_users]

    def _can_access_tenant(self, tenant_id: str) -> bool:
        """检查是否可以访问租户"""
        if self._is_system_admin():
            return True
            
        return tenant_id in self._get_user_tenant_ids()

    def _can_manage_tenant(self, tenant_id: str) -> bool:
        """检查是否可以管理租户"""
        if self._is_system_admin():
            return True

        tenant_user = self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.user_id == self.current_user_id,
            TenantUser.is_active == True,
            TenantUser.is_admin == True
        ).first()

        return tenant_user is not None

    def _get_tenant_user_count(self, tenant_id: str) -> int:
        """获取租户用户数量"""
        # 统计TenantUser表中的用户（企业用户）
        tenant_user_count = self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.is_active == True
        ).count()
        
        # 统计User表中当前租户为该租户的用户（个人注册用户）
        individual_user_count = self.db.query(User).filter(
            User.current_tenant_id == tenant_id,
            User.is_active == True,
            User.deleted_at.is_(None)
        ).count()
        
        return tenant_user_count + individual_user_count

    def _get_tenant_org_count(self, tenant_id: str) -> int:
        """获取租户组织数量"""
        return self.db.query(Organization).filter(
            Organization.tenant_id == tenant_id,
            Organization.deleted_at.is_(None),
            Organization.is_active == True
        ).count()

    def _get_tenant_storage_usage(self, tenant_id: str) -> str:
        """获取租户存储使用量"""
        try:
            # 检查File模型的字段，找到正确的大小字段
            file_table = File.__table__
            size_column = None
            
            # 查找可能的文件大小字段名
            for column in file_table.columns:
                if column.name in ['size', 'file_size', 'content_size']:
                    size_column = column
                    break
            
            if size_column is None:
                # 如果没有找到大小字段，返回默认值
                return "0 B"
                
            # 计算该租户下所有文件的总大小
            total_size = self.db.query(
                func.sum(size_column)
            ).filter(
                File.tenant_id == tenant_id,
                File.deleted_at.is_(None)
            ).scalar() or 0
            
            # 转换为易读格式
            if total_size < 1024:
                return f"{total_size} B"
            elif total_size < 1024 * 1024:
                return f"{total_size / 1024:.1f} KB"
            elif total_size < 1024 * 1024 * 1024:
                return f"{total_size / (1024 * 1024):.1f} MB"
            else:
                return f"{total_size / (1024 * 1024 * 1024):.1f} GB"
        except Exception:
            # 如果出错（比如File表不存在或没有相关字段），返回默认值
            return "0 B"

    def backup_tenant(self, tenant_id: str, backup_name: Optional[str] = None, description: Optional[str] = None) -> TenantBackup:
        """备份租户
        
        创建租户的完整备份，包括所有用户、组织和文件
        备份会创建一个新的租户，所有数据ID保持不变，只改变tenant_id
        """
        # 检查源租户是否存在
        source_tenant = self.get_tenant_by_id(tenant_id)
        if not source_tenant:
            raise NotFoundError("源租户不存在")

        # 检查是否有管理权限
        if not self._can_manage_tenant(tenant_id):
            raise PermissionError("无权备份该租户")

        try:
            # 生成备份版本号
            latest_backup = self.db.query(TenantBackup).filter(
                TenantBackup.source_tenant_id == tenant_id
            ).order_by(TenantBackup.version.desc()).first()
            
            next_version = (latest_backup.version + 1) if latest_backup else 1
            
            # 创建备份租户ID（生成短ID避免超过50字符限制）
            backup_tenant_id = f"backup_{next_version}_{int(datetime.now().timestamp())}"
            
            # 创建备份租户
            backup_tenant = Tenant(
                id=backup_tenant_id,
                name=f"backup_v{next_version}",  # 简化名称
                display_name=f"{source_tenant.display_name} (备份 v{next_version})",
                description=f"备份自租户 {source_tenant.display_name}",
                schema_name=f"backup_v{next_version}_{int(datetime.now().timestamp())}",  # 简化schema名称  
                owner_id=source_tenant.owner_id,
                status=source_tenant.status,
                is_active=False,  # 备份租户默认不激活
                slug=f"backup_v{next_version}",  # 简化slug
                domain=source_tenant.domain,
                subdomain=source_tenant.subdomain,
                settings=source_tenant.settings,
                features=source_tenant.features,
                limits=source_tenant.limits
            )
            
            self.db.add(backup_tenant)
            self.db.flush()  # 确保租户ID可用
            
            # 创建备份记录
            backup_record = TenantBackup(
                id=str(uuid.uuid4()),
                source_tenant_id=tenant_id,
                backup_tenant_id=backup_tenant_id,
                backup_name=backup_name or f"{source_tenant.display_name}_backup_v{next_version}",
                version=next_version,
                description=description,
                backup_type="full",
                status="in_progress",
                created_by=self.current_user_id
            )
            
            self.db.add(backup_record)
            self.db.flush()
            
            # 备份用户数据
            users_count = self._backup_tenant_users(tenant_id, backup_tenant_id)
            
            # 备份组织数据
            orgs_count = self._backup_tenant_organizations(tenant_id, backup_tenant_id)
            
            # 备份文件数据 (暂不实现文件复制，只复制元数据)
            files_count = self._backup_tenant_files(tenant_id, backup_tenant_id)
            
            # 更新备份记录
            backup_record.users_count = users_count
            backup_record.orgs_count = orgs_count
            backup_record.files_count = files_count
            backup_record.status = "completed"
            backup_record.completed_at = datetime.now(timezone.utc)
            
            self.db.commit()
            return backup_record
            
        except Exception as e:
            self.db.rollback()
            # 更新备份记录为失败状态
            if 'backup_record' in locals():
                backup_record.status = "failed"
                backup_record.completed_at = datetime.now(timezone.utc)
                self.db.commit()
            raise ValidationError(f"备份租户失败: {str(e)}")

    def _backup_tenant_users(self, source_tenant_id: str, backup_tenant_id: str) -> int:
        """备份租户用户数据"""
        tenant_users = self.db.query(TenantUser).filter(
            TenantUser.tenant_id == source_tenant_id,
            TenantUser.is_active == True
        ).all()
        
        for tenant_user in tenant_users:
            backup_tenant_user = TenantUser(
                tenant_id=backup_tenant_id,
                user_id=tenant_user.user_id,  # 保持用户ID不变
                role=tenant_user.role,
                permissions=tenant_user.permissions,
                is_admin=tenant_user.is_admin,
                is_active=tenant_user.is_active
            )
            self.db.add(backup_tenant_user)
        
        return len(tenant_users)

    def _backup_tenant_organizations(self, source_tenant_id: str, backup_tenant_id: str) -> int:
        """备份租户组织数据"""
        organizations = self.db.query(Organization).filter(
            Organization.tenant_id == source_tenant_id,
            Organization.deleted_at.is_(None),
            Organization.is_active == True
        ).all()
        
        for org in organizations:
            backup_org = Organization(
                id=org.id,  # 保持组织ID不变
                tenant_id=backup_tenant_id,  # 只改变租户ID
                name=org.name,
                description=org.description,
                parent_id=org.parent_id,
                path=org.path,
                level=org.level,
                owner_id=org.owner_id,
                is_active=org.is_active,
                settings=org.settings
            )
            self.db.add(backup_org)
        
        return len(organizations)

    def _backup_tenant_files(self, source_tenant_id: str, backup_tenant_id: str) -> int:
        """备份租户文件元数据（不复制实际文件）"""
        files = self.db.query(File).filter(
            File.tenant_id == source_tenant_id,
            File.deleted_at.is_(None)
        ).all()
        
        for file in files:
            backup_file = File(
                id=file.id,  # 保持文件ID不变
                tenant_id=backup_tenant_id,  # 只改变租户ID
                original_name=file.original_name,
                file_name=file.file_name,
                file_path=file.file_path,
                file_size=file.file_size,
                file_type=file.file_type,
                mime_type=file.mime_type,
                file_extension=file.file_extension,
                title=file.title,
                description=file.description,
                tags=file.tags,
                category=file.category,
                keywords=file.keywords,
                file_hash=file.file_hash,
                version=file.version,
                status=file.status,
                visibility=file.visibility,
                owner_id=file.owner_id,
                parent_folder_id=file.parent_folder_id,
                download_count=file.download_count,
                view_count=file.view_count,
                last_accessed=file.last_accessed
            )
            self.db.add(backup_file)
        
        return len(files)

    def get_tenant_backups(self, tenant_id: str) -> List[TenantBackup]:
        """获取租户的备份列表"""
        if not self._can_access_tenant(tenant_id):
            raise PermissionError("无权访问该租户的备份")
        
        return self.db.query(TenantBackup).filter(
            TenantBackup.source_tenant_id == tenant_id
        ).order_by(TenantBackup.created_at.desc()).all()