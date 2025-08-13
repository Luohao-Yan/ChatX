"""
超级管理员初始化脚本
创建系统默认的超级管理员账户
"""

from sqlalchemy.orm import Session
from app.models.user_models import User, Role, UserStatus
from app.models.tenant_models import Tenant
from app.models.org_models import Organization, Department
from app.core.config import settings
from app.infrastructure.securities.security import get_password_hash
from app.domain.initialization.permissions import DefaultRoles
import logging

logger = logging.getLogger(__name__)


def create_default_tenant(db: Session) -> Tenant:
    """创建默认租户"""
    default_tenant = db.query(Tenant).filter(Tenant.slug == "default").first()

    if not default_tenant:
        logger.info("创建默认租户...")
        default_tenant = Tenant(
            name="默认租户",
            slug="default",
            admin_email=settings.SUPER_ADMIN_EMAIL,
            admin_name=settings.SUPER_ADMIN_FULL_NAME,
            status="active",
        )
        db.add(default_tenant)
        db.commit()
        db.refresh(default_tenant)
        logger.info(f"默认租户创建成功: {default_tenant.name}")

    return default_tenant


def create_default_organization(db: Session, tenant: Tenant) -> Organization:
    """创建默认组织"""
    default_org = (
        db.query(Organization)
        .filter(Organization.tenant_id == tenant.id, Organization.code == "default")
        .first()
    )

    if not default_org:
        logger.info("创建默认组织...")
        default_org = Organization(
            tenant_id=tenant.id,
            name="默认组织",
            code="default",
            description="系统默认组织",
            level=1,
            path="/default/",
            is_active=True,
        )
        db.add(default_org)
        db.commit()
        db.refresh(default_org)
        logger.info(f"默认组织创建成功: {default_org.name}")

    return default_org


def create_default_department(db: Session, org: Organization) -> Department:
    """创建默认部门"""
    default_dept = (
        db.query(Department)
        .filter(Department.org_id == org.id, Department.code == "admin")
        .first()
    )

    if not default_dept:
        logger.info("创建默认管理部门...")
        default_dept = Department(
            org_id=org.id,
            name="系统管理部",
            code="admin",
            description="系统管理员部门",
            level=1,
            path="/admin/",
            is_active=True,
        )
        db.add(default_dept)
        db.commit()
        db.refresh(default_dept)
        logger.info(f"默认部门创建成功: {default_dept.name}")

    return default_dept


def create_super_admin_user(
    db: Session, tenant: Tenant, org: Organization, dept: Department
) -> User:
    """创建超级管理员用户"""
    # 检查是否已存在超级管理员
    existing_admin = (
        db.query(User).filter(User.email == settings.SUPER_ADMIN_EMAIL).first()
    )

    if existing_admin:
        logger.info(f"超级管理员已存在: {existing_admin.email}")
        return existing_admin

    # 检查用户名是否存在
    existing_username = (
        db.query(User).filter(User.username == settings.SUPER_ADMIN_USERNAME).first()
    )

    if existing_username:
        logger.warning(
            f"用户名 {settings.SUPER_ADMIN_USERNAME} 已存在，使用邮箱作为用户名"
        )
        username = settings.SUPER_ADMIN_EMAIL.split("@")[0] + "_admin"
    else:
        username = settings.SUPER_ADMIN_USERNAME

    logger.info(f"创建超级管理员用户: {settings.SUPER_ADMIN_EMAIL}")

    # 创建超级管理员用户
    super_admin = User(
        tenant_id=tenant.id,
        org_id=org.id,
        department_id=dept.id,
        email=settings.SUPER_ADMIN_EMAIL,
        username=username,
        full_name=settings.SUPER_ADMIN_FULL_NAME,
        hashed_password=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
        is_active=True,
        is_verified=True,  # 超级管理员自动验证
        is_superuser=True,  # 设置为超级管理员
        status=UserStatus.ACTIVE,  # 使用枚举值
    )

    db.add(super_admin)
    db.commit()
    db.refresh(super_admin)

    logger.info(f"超级管理员用户创建成功: {super_admin.email} (ID: {super_admin.id})")
    return super_admin


def assign_super_admin_role(db: Session, user: User, tenant: Tenant):
    """为超级管理员分配角色"""
    # 获取超级管理员角色
    super_admin_role = (
        db.query(Role)
        .filter(Role.tenant_id == tenant.id, Role.name == DefaultRoles.SUPER_ADMIN)
        .first()
    )

    if not super_admin_role:
        logger.error("超级管理员角色不存在，请先初始化RBAC系统")
        return False

    # 检查是否已经分配了角色
    if super_admin_role in user.roles:
        logger.info(f"用户 {user.email} 已拥有超级管理员角色")
        return True

    # 分配超级管理员角色
    user.roles.append(super_admin_role)
    db.commit()

    logger.info(f"为用户 {user.email} 分配超级管理员角色成功")
    return True


def initialize_super_admin(db: Session) -> bool:
    """初始化超级管理员"""
    logger.info("=== 开始初始化超级管理员 ===")

    try:
        # 1. 创建默认租户
        tenant = create_default_tenant(db)

        # 2. 创建默认组织
        org = create_default_organization(db, tenant)

        # 3. 创建默认部门
        dept = create_default_department(db, org)

        # 4. 创建超级管理员用户
        super_admin = create_super_admin_user(db, tenant, org, dept)

        # 5. 分配超级管理员角色
        role_assigned = assign_super_admin_role(db, super_admin, tenant)

        if role_assigned:
            logger.info("=== 超级管理员初始化完成 ===")
            logger.info(f"邮箱: {super_admin.email}")
            logger.info(f"用户名: {super_admin.username}")
            logger.info(f"密码: {settings.SUPER_ADMIN_PASSWORD}")
            logger.info("请登录后立即修改默认密码！")
            return True
        else:
            logger.error("超级管理员角色分配失败")
            return False

    except Exception as e:
        logger.error(f"超级管理员初始化失败: {e}")
        db.rollback()
        return False


def check_super_admin_exists(db: Session) -> bool:
    """检查是否已存在超级管理员"""
    super_admin = (
        db.query(User).filter(User.email == settings.SUPER_ADMIN_EMAIL).first()
    )

    if super_admin:
        # 检查是否有超级管理员角色
        super_admin_role = (
            db.query(Role).filter(Role.name == DefaultRoles.SUPER_ADMIN).first()
        )

        if super_admin_role and super_admin_role in super_admin.roles:
            return True

    return False


def get_super_admin_info(db: Session) -> dict:
    """获取超级管理员信息"""
    super_admin = (
        db.query(User).filter(User.email == settings.SUPER_ADMIN_EMAIL).first()
    )

    if not super_admin:
        return {"exists": False}

    return {
        "exists": True,
        "id": super_admin.id,
        "email": super_admin.email,
        "username": super_admin.username,
        "full_name": super_admin.full_name,
        "is_active": super_admin.is_active,
        "is_verified": super_admin.is_verified,
        "created_at": super_admin.created_at,
        "roles": [role.name for role in super_admin.roles],
    }
