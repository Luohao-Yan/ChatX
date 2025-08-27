"""
租户初始化模块
初始化系统默认租户：public租户用于个人用户，enterprise租户用于企业用户
"""

import logging
import uuid
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.tenant_models import Tenant, TenantStatus
from app.models.org_models import Organization

logger = logging.getLogger(__name__)


def _create_public_default_organization(db: Session, tenant: Tenant) -> bool:
    """为公共租户创建默认组织"""
    try:
        # 检查是否已存在公共组织
        existing_org = db.query(Organization).filter(
            Organization.tenant_id == tenant.id,
            Organization.name == "公共组织"
        ).first()
        
        if existing_org:
            logger.info("公共租户的默认组织已存在，跳过创建")
            return False
        
        # 创建公共组织
        public_org = Organization(
            id="public-org",
            tenant_id=tenant.id,
            name="公共组织",
            display_name="公共组织",
            description="公共租户的默认组织，所有通过注册页面注册的用户都会加入此组织",
            owner_id="system",  # 系统拥有
            level=0,
            path="/public/",
            is_active=True
        )
        
        db.add(public_org)
        db.flush()  # 确保插入成功
        
        logger.info("✅ 公共租户默认组织创建成功")
        return True
        
    except IntegrityError as e:
        logger.warning(f"公共组织可能已存在: {e}")
        db.rollback()
        return False
    except Exception as e:
        logger.error(f"创建公共组织失败: {e}")
        raise


def initialize_default_tenants(db: Session) -> bool:
    """初始化系统默认租户"""
    try:
        logger.info("开始初始化系统默认租户...")
        
        # 1. 初始化system租户 - 系统内置租户
        system_tenant_created = _create_system_tenant(db)
        
        # 2. 初始化public租户 - 用于个人用户
        public_tenant_created = _create_public_tenant(db)
        
        db.commit()
        
        if system_tenant_created or public_tenant_created:
            logger.info("✅ 默认租户初始化成功")
            return True
        else:
            logger.info("ℹ️ 默认租户已存在，跳过初始化")
            return True
            
    except Exception as e:
        logger.error(f"❌ 默认租户初始化失败: {e}")
        db.rollback()
        return False


def _create_public_tenant(db: Session) -> bool:
    """创建public租户 - 用于个人用户注册"""
    try:
        # 检查是否已存在public租户
        existing_tenant = db.query(Tenant).filter(
            Tenant.name == "public"
        ).first()
        
        if existing_tenant:
            logger.info("Public租户已存在，检查是否需要创建默认组织")
            _create_public_default_organization(db, existing_tenant)
            return False
            
        # 创建public租户
        public_tenant = Tenant(
            id="public",
            name="public",
            display_name="公共租户",
            schema_name="public_schema",
            description="个人用户公共租户，所有通过登录页面注册的个人用户都属于此租户",
            owner_id="system",  # 系统拥有
            status=TenantStatus.ACTIVE,
            is_active=True,
            slug="public",
            settings={
                "allow_self_registration": True,
                "user_type": "individual",
                "max_users": 10000,
                "features": [
                    "chat",
                    "file_management", 
                    "team_creation",
                    "basic_knowledge_graph"
                ]
            },
            features=[
                "chat", "file_management", "team_creation", "basic_knowledge_graph"
            ],
            limits={
                "max_file_size_mb": -1,  # 无限制
                "max_storage_gb": -1,    # 无限制
                "max_team_members": -1   # 无限制
            }
        )
        
        db.add(public_tenant)
        db.flush()  # 确保插入成功
        
        # 为public租户创建默认组织
        _create_public_default_organization(db, public_tenant)
        
        logger.info("✅ Public租户创建成功")
        return True
        
    except IntegrityError as e:
        logger.warning(f"Public租户可能已存在: {e}")
        db.rollback()
        return False
    except Exception as e:
        logger.error(f"创建Public租户失败: {e}")
        raise


def _create_system_tenant(db: Session) -> bool:
    """创建system租户 - 系统内置租户，用于存放系统超级管理员和租户管理员"""
    try:
        # 检查是否已存在system租户
        existing_tenant = db.query(Tenant).filter(
            Tenant.name == "system"
        ).first()
        
        if existing_tenant:
            logger.info("System租户已存在，跳过创建")
            return False
            
        # 创建system租户
        system_tenant = Tenant(
            id="system",
            name="system",
            display_name="系统租户",
            schema_name="system_schema",
            description="系统内置租户，包含系统超级管理员和租户管理员，负责全系统管理",
            owner_id="system",  # 系统拥有
            status=TenantStatus.ACTIVE,
            is_active=True,
            slug="system",
            settings={
                "allow_self_registration": False,
                "user_type": "system",
                "is_system_tenant": True,
                "features": [
                    "system_administration",
                    "tenant_management",
                    "user_management",
                    "rbac_management",
                    "system_monitoring",
                    "audit_logs",
                    "api_management"
                ]
            },
            features=[
                "system_administration", "tenant_management", "user_management", 
                "rbac_management", "system_monitoring", "audit_logs", "api_management"
            ],
            limits={
                "max_file_size_mb": -1,  # 无限制
                "max_storage_gb": -1,    # 无限制
                "max_users": -1          # 无限制
            }
        )
        
        db.add(system_tenant)
        db.flush()
        
        logger.info("✅ System租户创建成功")
        return True
        
    except IntegrityError as e:
        logger.warning(f"System租户可能已存在: {e}")
        db.rollback()
        return False
    except Exception as e:
        logger.error(f"创建System租户失败: {e}")
        raise


def get_public_tenant_info(db: Session) -> Dict[str, Any]:
    """获取public租户信息"""
    tenant = db.query(Tenant).filter(
        Tenant.name == "public"
    ).first()
    
    if tenant:
        return {
            "exists": True,
            "id": tenant.id,
            "name": tenant.name,
            "display_name": tenant.display_name,
            "status": tenant.status,
            "is_active": tenant.is_active,
            "settings": tenant.settings
        }
    
    return {"exists": False}


def get_system_tenant_info(db: Session) -> Dict[str, Any]:
    """获取system租户信息"""
    tenant = db.query(Tenant).filter(
        Tenant.name == "system"
    ).first()
    
    if tenant:
        return {
            "exists": True,
            "id": tenant.id,
            "name": tenant.name,
            "display_name": tenant.display_name,
            "status": tenant.status,
            "is_active": tenant.is_active,
            "settings": tenant.settings
        }
    
    return {"exists": False}


def ensure_public_tenant_exists(db) -> str:
    """确保public租户存在，返回租户ID"""
    tenant = db.query(Tenant).filter(
        Tenant.name == "public"
    ).first()
    
    if tenant:
        return tenant.id
    
    # 如果不存在，尝试创建
    if _create_public_tenant(db):
        try:
            db.commit()
        except:
            # 如果是异步会话，可能不需要commit
            pass
        return "public"
    
    # 创建失败，抛出异常
    raise Exception("无法创建或找到public租户")


def ensure_system_tenant_exists(db: Session) -> str:
    """确保system租户存在，返回租户ID"""
    tenant = db.query(Tenant).filter(
        Tenant.name == "system"
    ).first()
    
    if tenant:
        return tenant.id
    
    # 如果不存在，尝试创建
    if _create_system_tenant(db):
        db.commit()
        return "system"
    
    # 创建失败，抛出异常
    raise Exception("无法创建或找到system租户")


def get_public_default_organization_info(db: Session) -> Dict[str, Any]:
    """获取公共租户默认组织信息"""
    org = db.query(Organization).filter(
        Organization.tenant_id == "public",
        Organization.name == "公共组织"
    ).first()
    
    if org:
        return {
            "exists": True,
            "id": org.id,
            "name": org.name,
            "display_name": org.display_name,
            "tenant_id": org.tenant_id,
            "is_active": org.is_active
        }
    
    return {"exists": False}


def ensure_public_default_organization_exists(db: Session) -> str:
    """确保公共租户默认组织存在，返回组织ID"""
    # 首先确保公共租户存在
    public_tenant = db.query(Tenant).filter(
        Tenant.name == "public"
    ).first()
    
    if not public_tenant:
        # 如果公共租户不存在，先创建
        if _create_public_tenant(db):
            public_tenant = db.query(Tenant).filter(
                Tenant.name == "public"
            ).first()
        else:
            raise Exception("无法创建或找到公共租户")
    
    # 检查公共组织是否存在
    public_org = db.query(Organization).filter(
        Organization.tenant_id == public_tenant.id,
        Organization.name == "公共组织"
    ).first()
    
    if public_org:
        return public_org.id
    
    # 如果不存在，创建公共组织
    if _create_public_default_organization(db, public_tenant):
        db.commit()
        return "public-org"
    
    # 创建失败，抛出异常
    raise Exception("无法创建或找到公共租户默认组织")