"""
租户备份相关的数据库模型
"""

from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, Index
from sqlalchemy.sql import func
from app.infrastructure.persistence.database import Base

class TenantBackup(Base):
    """租户备份记录模型
    
    记录租户备份的版本信息和元数据
    """
    __tablename__ = "sys_tenant_backups"

    # 备份记录唯一标识ID
    id = Column(String(50), primary_key=True, index=True, comment="备份记录唯一标识ID")
    
    # 备份基本信息
    source_tenant_id = Column(String(50), nullable=False, index=True, comment="源租户ID")
    backup_tenant_id = Column(String(50), nullable=False, index=True, comment="备份租户ID")
    backup_name = Column(String(255), nullable=False, comment="备份名称")
    version = Column(Integer, nullable=False, comment="备份版本号")
    
    # 备份内容信息
    description = Column(Text, nullable=True, comment="备份描述")
    backup_type = Column(String(50), default="full", nullable=False, comment="备份类型（full/incremental）")
    
    # 备份统计信息
    users_count = Column(Integer, default=0, nullable=False, comment="备份的用户数量")
    orgs_count = Column(Integer, default=0, nullable=False, comment="备份的组织数量")
    files_count = Column(Integer, default=0, nullable=False, comment="备份的文件数量")
    
    # 备份状态
    status = Column(String(20), default="pending", nullable=False, comment="备份状态（pending/in_progress/completed/failed）")
    is_active = Column(Boolean, default=True, nullable=False, comment="备份是否有效")
    
    # 操作信息
    created_by = Column(String(50), nullable=False, comment="备份创建者用户ID")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="备份创建时间")
    completed_at = Column(DateTime(timezone=True), nullable=True, comment="备份完成时间")
    
    # 数据库索引配置
    __table_args__ = (
        Index('idx_backup_source_tenant', 'source_tenant_id'),
        Index('idx_backup_version', 'source_tenant_id', 'version'),
        Index('idx_backup_created', 'created_at'),
        {"comment": "租户备份记录表，管理租户备份的版本和元数据"}
    )