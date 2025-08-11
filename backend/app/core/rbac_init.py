"""
RBAC系统初始化脚本
创建默认角色和权限
"""

from sqlalchemy.orm import Session
from app.models.user_models import Role, Permission, User
from app.models.tenant_models import Tenant
from app.core.permissions import Permissions, DefaultRoles
import logging

logger = logging.getLogger(__name__)

def create_default_permissions(db: Session) -> dict:
    """创建默认权限"""
    logger.info("开始创建默认权限...")
    
    permissions_data = [
        # 用户管理权限
        {"name": Permissions.USER_CREATE, "display_name": "创建用户", "resource_type": "user", "action": "create", "category": "用户管理"},
        {"name": Permissions.USER_READ, "display_name": "查看用户", "resource_type": "user", "action": "read", "category": "用户管理"},
        {"name": Permissions.USER_UPDATE, "display_name": "更新用户", "resource_type": "user", "action": "update", "category": "用户管理"},
        {"name": Permissions.USER_DELETE, "display_name": "删除用户", "resource_type": "user", "action": "delete", "category": "用户管理"},
        {"name": Permissions.USER_MANAGE, "display_name": "管理用户", "resource_type": "user", "action": "manage", "category": "用户管理"},
        
        # 角色管理权限
        {"name": Permissions.ROLE_CREATE, "display_name": "创建角色", "resource_type": "role", "action": "create", "category": "角色管理"},
        {"name": Permissions.ROLE_READ, "display_name": "查看角色", "resource_type": "role", "action": "read", "category": "角色管理"},
        {"name": Permissions.ROLE_UPDATE, "display_name": "更新角色", "resource_type": "role", "action": "update", "category": "角色管理"},
        {"name": Permissions.ROLE_DELETE, "display_name": "删除角色", "resource_type": "role", "action": "delete", "category": "角色管理"},
        {"name": Permissions.ROLE_ASSIGN, "display_name": "分配角色", "resource_type": "role", "action": "assign", "category": "角色管理"},
        
        # 权限管理权限
        {"name": Permissions.PERMISSION_CREATE, "display_name": "创建权限", "resource_type": "permission", "action": "create", "category": "权限管理"},
        {"name": Permissions.PERMISSION_READ, "display_name": "查看权限", "resource_type": "permission", "action": "read", "category": "权限管理"},
        {"name": Permissions.PERMISSION_UPDATE, "display_name": "更新权限", "resource_type": "permission", "action": "update", "category": "权限管理"},
        {"name": Permissions.PERMISSION_DELETE, "display_name": "删除权限", "resource_type": "permission", "action": "delete", "category": "权限管理"},
        {"name": Permissions.PERMISSION_ASSIGN, "display_name": "分配权限", "resource_type": "permission", "action": "assign", "category": "权限管理"},
        
        # 文件管理权限
        {"name": Permissions.FILE_CREATE, "display_name": "创建文件", "resource_type": "file", "action": "create", "category": "文件管理"},
        {"name": Permissions.FILE_READ, "display_name": "查看文件", "resource_type": "file", "action": "read", "category": "文件管理"},
        {"name": Permissions.FILE_UPDATE, "display_name": "更新文件", "resource_type": "file", "action": "update", "category": "文件管理"},
        {"name": Permissions.FILE_DELETE, "display_name": "删除文件", "resource_type": "file", "action": "delete", "category": "文件管理"},
        {"name": Permissions.FILE_SHARE, "display_name": "分享文件", "resource_type": "file", "action": "share", "category": "文件管理"},
        {"name": Permissions.FILE_UPLOAD, "display_name": "上传文件", "resource_type": "file", "action": "upload", "category": "文件管理"},
        {"name": Permissions.FILE_DOWNLOAD, "display_name": "下载文件", "resource_type": "file", "action": "download", "category": "文件管理"},
        
        # 组织管理权限
        {"name": Permissions.ORG_CREATE, "display_name": "创建组织", "resource_type": "organization", "action": "create", "category": "组织管理"},
        {"name": Permissions.ORG_READ, "display_name": "查看组织", "resource_type": "organization", "action": "read", "category": "组织管理"},
        {"name": Permissions.ORG_UPDATE, "display_name": "更新组织", "resource_type": "organization", "action": "update", "category": "组织管理"},
        {"name": Permissions.ORG_DELETE, "display_name": "删除组织", "resource_type": "organization", "action": "delete", "category": "组织管理"},
        {"name": Permissions.ORG_MANAGE, "display_name": "管理组织", "resource_type": "organization", "action": "manage", "category": "组织管理"},
        
        # 系统管理权限
        {"name": Permissions.SYSTEM_CONFIG, "display_name": "系统配置", "resource_type": "system", "action": "config", "category": "系统管理"},
        {"name": Permissions.SYSTEM_MONITOR, "display_name": "系统监控", "resource_type": "system", "action": "monitor", "category": "系统管理"},
        {"name": Permissions.SYSTEM_BACKUP, "display_name": "系统备份", "resource_type": "system", "action": "backup", "category": "系统管理"},
    ]
    
    created_permissions = {}
    
    for perm_data in permissions_data:
        # 检查权限是否已存在
        existing_perm = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
        
        if not existing_perm:
            permission = Permission(
                name=perm_data["name"],
                display_name=perm_data["display_name"],
                resource_type=perm_data["resource_type"],
                action=perm_data["action"],
                category=perm_data["category"],
                is_system=True,
                is_active=True
            )
            db.add(permission)
            db.flush()  # 获取ID
            created_permissions[perm_data["name"]] = permission
            logger.info(f"创建权限: {perm_data['display_name']}")
        else:
            created_permissions[perm_data["name"]] = existing_perm
    
    db.commit()
    logger.info(f"权限创建完成，共创建/更新 {len(created_permissions)} 个权限")
    return created_permissions


def create_default_roles(db: Session, permissions: dict) -> dict:
    """创建默认角色"""
    logger.info("开始创建默认角色...")
    
    # 获取默认租户
    default_tenant = db.query(Tenant).filter(Tenant.id == 1).first()
    if not default_tenant:
        logger.warning("默认租户不存在，将创建一个")
        default_tenant = Tenant(
            name="默认租户",
            slug="default",
            admin_email="admin@example.com",
            admin_name="系统管理员"
        )
        db.add(default_tenant)
        db.commit()
        db.refresh(default_tenant)
    
    roles_data = [
        {
            "name": DefaultRoles.SUPER_ADMIN,
            "display_name": "超级管理员",
            "description": "拥有所有系统权限的超级管理员",
            "level": 100,
            "is_system": True,
            "permissions": list(permissions.keys())  # 所有权限
        },
        {
            "name": DefaultRoles.TENANT_ADMIN,
            "display_name": "租户管理员",
            "description": "租户级管理员，管理租户内所有资源",
            "level": 80,
            "is_system": True,
            "permissions": [
                Permissions.USER_CREATE, Permissions.USER_READ, Permissions.USER_UPDATE, Permissions.USER_DELETE,
                Permissions.ROLE_CREATE, Permissions.ROLE_READ, Permissions.ROLE_UPDATE, Permissions.ROLE_ASSIGN,
                Permissions.ORG_CREATE, Permissions.ORG_READ, Permissions.ORG_UPDATE, Permissions.ORG_MANAGE,
                Permissions.FILE_CREATE, Permissions.FILE_READ, Permissions.FILE_UPDATE, Permissions.FILE_DELETE,
                Permissions.FILE_SHARE, Permissions.FILE_UPLOAD, Permissions.FILE_DOWNLOAD,
            ]
        },
        {
            "name": DefaultRoles.ORG_ADMIN,
            "display_name": "组织管理员",
            "description": "组织级管理员，管理组织内用户和资源",
            "level": 60,
            "is_system": True,
            "permissions": [
                Permissions.USER_READ, Permissions.USER_UPDATE,
                Permissions.ORG_READ, Permissions.ORG_UPDATE,
                Permissions.FILE_CREATE, Permissions.FILE_READ, Permissions.FILE_UPDATE, 
                Permissions.FILE_SHARE, Permissions.FILE_UPLOAD, Permissions.FILE_DOWNLOAD,
            ]
        },
        {
            "name": DefaultRoles.DEPT_MANAGER,
            "display_name": "部门经理",
            "description": "部门级管理员，管理部门用户",
            "level": 40,
            "is_system": True,
            "permissions": [
                Permissions.USER_READ,
                Permissions.FILE_CREATE, Permissions.FILE_READ, Permissions.FILE_UPDATE, 
                Permissions.FILE_SHARE, Permissions.FILE_UPLOAD, Permissions.FILE_DOWNLOAD,
            ]
        },
        {
            "name": DefaultRoles.USER,
            "display_name": "普通用户",
            "description": "普通用户，具有基本的文件操作权限",
            "level": 20,
            "is_system": True,
            "is_default": True,
            "permissions": [
                Permissions.FILE_CREATE, Permissions.FILE_READ, Permissions.FILE_UPDATE, 
                Permissions.FILE_UPLOAD, Permissions.FILE_DOWNLOAD,
            ]
        },
        {
            "name": DefaultRoles.GUEST,
            "display_name": "访客",
            "description": "访客用户，只能查看公开内容",
            "level": 10,
            "is_system": True,
            "permissions": [
                Permissions.FILE_READ,
            ]
        }
    ]
    
    created_roles = {}
    
    for role_data in roles_data:
        # 检查角色是否已存在
        existing_role = db.query(Role).filter(
            Role.tenant_id == default_tenant.id,
            Role.name == role_data["name"]
        ).first()
        
        if not existing_role:
            role = Role(
                tenant_id=default_tenant.id,
                name=role_data["name"],
                display_name=role_data["display_name"],
                description=role_data["description"],
                level=role_data["level"],
                is_system=role_data["is_system"],
                is_default=role_data.get("is_default", False),
                role_type="system"
            )
            db.add(role)
            db.flush()  # 获取ID
            
            # 分配权限
            role_permissions = []
            for perm_name in role_data["permissions"]:
                if perm_name in permissions:
                    role_permissions.append(permissions[perm_name])
            
            role.permissions.extend(role_permissions)
            created_roles[role_data["name"]] = role
            logger.info(f"创建角色: {role_data['display_name']}, 权限数: {len(role_permissions)}")
        else:
            created_roles[role_data["name"]] = existing_role
    
    db.commit()
    logger.info(f"角色创建完成，共创建/更新 {len(created_roles)} 个角色")
    return created_roles


def assign_default_role_to_users(db: Session, roles: dict):
    """为现有用户分配默认角色"""
    logger.info("开始为现有用户分配默认角色...")
    
    default_role = roles.get(DefaultRoles.USER)
    if not default_role:
        logger.warning("默认用户角色不存在")
        return
    
    # 获取没有角色的用户
    users_without_roles = db.query(User).filter(
        ~User.roles.any(),
        User.is_active == True
    ).all()
    
    assigned_count = 0
    for user in users_without_roles:
        user.roles.append(default_role)
        assigned_count += 1
        logger.info(f"为用户 {user.username} 分配默认角色")
    
    db.commit()
    logger.info(f"默认角色分配完成，共为 {assigned_count} 个用户分配了默认角色")


def initialize_rbac_system(db: Session):
    """初始化RBAC系统"""
    logger.info("=== 开始初始化RBAC系统 ===")
    
    try:
        # 1. 创建默认权限
        permissions = create_default_permissions(db)
        
        # 2. 创建默认角色
        roles = create_default_roles(db, permissions)
        
        # 3. 为现有用户分配默认角色
        assign_default_role_to_users(db, roles)
        
        logger.info("=== RBAC系统初始化完成 ===")
        return True
        
    except Exception as e:
        logger.error(f"RBAC系统初始化失败: {e}")
        db.rollback()
        return False