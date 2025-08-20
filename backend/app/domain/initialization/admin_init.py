"""
超级管理员初始化脚本
创建系统默认的超级管理员账户
"""

from sqlalchemy.orm import Session
from app.models.user_models import User, UserProfile, UserStatus, UserType
from app.models.tenant_models import Tenant, TenantStatus, TenantUser
from app.models.org_models import Organization, UserOrganization
from app.models.rbac_models import Role, Permission
from app.models.relationship_models import user_role_association
from app.core.config import settings
from app.infrastructure.securities.security import get_password_hash
from app.domain.initialization.permissions import DefaultRoles
from app.domain.initialization.tenant_init import ensure_system_tenant_exists
import logging
import uuid

logger = logging.getLogger(__name__)


def create_default_tenant(db: Session) -> Tenant:
    """创建默认租户"""
    # 使用name字段查找默认租户
    default_tenant = db.query(Tenant).filter(Tenant.name == "默认租户").first()

    if not default_tenant:
        logger.info("创建默认租户...")
        tenant_id = str(uuid.uuid4())[:8]  # 生成简短ID
        default_tenant = Tenant(
            id=tenant_id,
            name="默认租户",
            display_name="默认租户",
            schema_name="default_tenant",
            description="系统默认租户",
            owner_id="",  # 稍后更新为super_admin的ID
            status=TenantStatus.ACTIVE,
            is_active=True,
        )
        db.add(default_tenant)
        db.flush()  # 获取ID但不提交
        logger.info(f"默认租户创建成功: {default_tenant.name}")

    return default_tenant


def create_default_organization(db: Session, tenant: Tenant, owner_id: str) -> Organization:
    """创建默认组织"""
    default_org = (
        db.query(Organization)
        .filter(Organization.tenant_id == tenant.id, Organization.name == "默认组织")
        .first()
    )

    if not default_org:
        logger.info("创建默认组织...")
        org_id = str(uuid.uuid4())[:8]  # 生成简短ID
        default_org = Organization(
            id=org_id,
            tenant_id=tenant.id,
            name="默认组织",
            display_name="默认组织",
            description="系统默认组织",
            owner_id=owner_id,
            level=0,
            path="/default/",
            is_active=True,
        )
        db.add(default_org)
        db.flush()  # 不立即提交，等待所有操作完成
        logger.info(f"默认组织创建成功: {default_org.name}")

    return default_org


def create_admin_organization_relation(db: Session, user: User, organization: Organization) -> bool:
    """为超级管理员创建组织关联关系"""
    try:
        # 检查是否已存在关联
        existing_relation = db.query(UserOrganization).filter(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id == organization.id
        ).first()
        
        if existing_relation:
            logger.info(f"超级管理员已关联到组织 {organization.name}")
            return True
        
        # 创建用户-组织关联
        user_org_relation = UserOrganization(
            id=uuid.uuid4(),
            tenant_id=organization.tenant_id,
            user_id=user.id,
            organization_id=organization.id,
            role="owner",  # 超级管理员作为组织所有者
            is_admin=True,
            is_active=True
        )
        
        db.add(user_org_relation)
        db.flush()  # 获取ID但不立即提交
        
        logger.info(f"✅ 成功创建超级管理员与组织 {organization.name} 的关联关系")
        return True
        
    except Exception as e:
        logger.error(f"❌ 创建超级管理员组织关联失败: {e}")
        return False


# Department model doesn't exist in the updated structure
# Removing department creation function


def create_super_admin_user(
    db: Session, tenant_id: str = None
) -> User:
    """创建超级管理员用户"""
    # 如果没有提供tenant_id，则使用system租户
    if not tenant_id:
        tenant_id = ensure_system_tenant_exists(db)
    
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

    # 生成用户ID
    user_id = str(uuid.uuid4())

    # 创建超级管理员用户
    super_admin = User(
        id=user_id,
        email=settings.SUPER_ADMIN_EMAIL,
        username=username,
        hashed_password=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
        status=UserStatus.ACTIVE,
        user_type=UserType.SYSTEM,  # 系统用户类型
        is_superuser=True,
        is_staff=True,
        is_active=True,
        is_verified=True,  # 超级管理员默认邮箱已验证
        current_tenant_id=tenant_id,
        tenant_ids=[tenant_id],
        # 注意：roles和permissions将由RBAC系统初始化时设置，这里不预设
    )

    db.add(super_admin)
    db.flush()  # 获取ID但不提交
    
    # 创建对应的用户信息记录
    admin_profile = UserProfile(
        id=str(uuid.uuid4()),
        user_id=super_admin.id,
        nickname="超级管理员",
        full_name="System Administrator",
        preferred_language="zh-CN",
        timezone="Asia/Shanghai",
    )
    
    db.add(admin_profile)
    
    # 创建租户用户关联记录
    tenant_user = TenantUser(
        tenant_id=tenant_id,
        user_id=super_admin.id,
        role="super_admin",
        is_admin=True,
        is_active=True
    )
    db.add(tenant_user)
    
    db.commit()
    db.refresh(super_admin)

    logger.info(f"超级管理员用户创建成功: {super_admin.email} (ID: {super_admin.id})")
    logger.info("超级管理员用户信息记录创建成功")
    logger.info(f"超级管理员已关联到租户: {tenant_id}")
    return super_admin


def assign_super_admin_role(db: Session, user: User, tenant: Tenant):
    """为超级管理员分配完整的角色和权限"""
    logger.info(f"开始为超级管理员 {user.email} 分配角色和权限...")
    
    try:
        # 1. 获取超级管理员角色（尝试从system租户获取）
        super_admin_role = (
            db.query(Role)
            .filter(Role.tenant_id == tenant.id, Role.name == DefaultRoles.SUPER_ADMIN)
            .first()
        )
        
        # 如果system租户没有，尝试从默认租户获取
        if not super_admin_role:
            default_tenant = db.query(Tenant).filter(Tenant.name == "默认租户").first()
            if default_tenant:
                super_admin_role = (
                    db.query(Role)
                    .filter(Role.tenant_id == default_tenant.id, Role.name == DefaultRoles.SUPER_ADMIN)
                    .first()
                )
        
        if super_admin_role:
            # 2. 检查关联表中是否已有角色分配
            existing_assignment = db.execute(
                user_role_association.select().where(
                    user_role_association.c.user_id == str(user.id),
                    user_role_association.c.role_id == super_admin_role.id
                )
            ).fetchone()
            
            if not existing_assignment:
                # 通过关联表分配角色
                db.execute(
                    user_role_association.insert().values(
                        id=uuid.uuid4(),
                        tenant_id=tenant.id,
                        user_id=str(user.id),
                        role_id=super_admin_role.id,
                        granted_by="system"
                    )
                )
                logger.info(f"✅ 为超级管理员分配角色: {super_admin_role.name}")
            else:
                logger.info(f"超级管理员已有角色: {super_admin_role.name}")
            
            # 3. 更新用户模型的角色JSON字段
            user.roles = ["super_admin", "tenant_admin", "system_admin"]
            
            # 4. 获取所有权限名称并更新用户模型
            all_permissions = db.query(Permission).filter(Permission.is_active == True).all()
            user.permissions = [perm.name for perm in all_permissions]
            
            # 5. 确保用户状态正确
            user.status = UserStatus.ACTIVE
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.is_verified = True
            
            db.flush()  # 不立即提交，等待调用方统一提交
            logger.info(f"✅ 为超级管理员 {user.email} 分配了 {len(all_permissions)} 个权限")
            logger.info(f"✅ 角色列表: {user.roles}")
            return True
        else:
            logger.warning("⚠️ 超级管理员角色不存在，将使用默认权限设置")
            # 即使没有角色，也要确保超级管理员有基本权限
            user.roles = ["super_admin"]
            user.permissions = ["*"]  # 超级管理员拥有所有权限
            user.status = UserStatus.ACTIVE
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.is_verified = True
            db.flush()
            logger.info("✅ 使用默认设置完成超级管理员权限配置")
            return True
            
    except Exception as e:
        logger.error(f"❌ 为超级管理员 {user.email} 分配权限失败: {e}")
        return False


def initialize_super_admin(db: Session) -> bool:
    """初始化超级管理员"""
    logger.info("=== 开始初始化超级管理员 ===")

    try:
        # 1. 确保system租户存在
        system_tenant_id = ensure_system_tenant_exists(db)

        # 2. 创建超级管理员用户
        super_admin = create_super_admin_user(db, system_tenant_id)
        
        # 3. 获取system租户对象并更新owner_id
        system_tenant = db.query(Tenant).filter(Tenant.id == system_tenant_id).first()
        if system_tenant and not system_tenant.owner_id:
            system_tenant.owner_id = str(super_admin.id)

        # 4. 为system租户创建默认组织（使用super_admin的ID作为owner_id）
        org = create_default_organization(db, system_tenant, str(super_admin.id))
        
        # 5. 将超级管理员加入到默认组织
        create_admin_organization_relation(db, super_admin, org)
        
        # 提交所有更改
        db.commit()
        db.refresh(super_admin)
        db.refresh(system_tenant)
        db.refresh(org)

        # 6. 分配超级管理员角色和权限
        role_assigned = assign_super_admin_role(db, super_admin, system_tenant)

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
        # Check if user is superuser
        if super_admin.is_superuser:
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
        "is_active": super_admin.is_active,
        "created_at": super_admin.created_at,
        "is_superuser": super_admin.is_superuser,
        "current_tenant_id": super_admin.current_tenant_id,
    }
