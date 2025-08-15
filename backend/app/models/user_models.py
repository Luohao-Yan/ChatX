"""用户管理相关的数据库模型

包含:
- UserStatus: 用户状态枚举
- ThirdPartyProvider: 第三方认证提供商枚举
- User: 用户主表模型
- UserSession: 用户会话管理模型
- UserVerification: 用户验证码模型
- Role: RBAC角色模型
- Permission: RBAC权限模型
- UserPermission: 用户直接权限模型
- user_roles: 用户角色关联表
- role_permissions: 角色权限关联表
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Table, UniqueConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.infrastructure.persistence.database import Base
from enum import Enum as PyEnum
from datetime import datetime, timezone
from typing import Optional
import uuid

__all__ = [
    'UserStatus', 'ThirdPartyProvider', 'User', 'UserSession', 'UserVerification', 
    'Role', 'Permission', 'UserPermission', 'user_roles', 'role_permissions'
]

class UserStatus(str, PyEnum):
    """用户状态枚举
    
    定义用户在系统中的各种状态，用于用户生命周期管理和访问控制。
    """
    ACTIVE = "active"      # 激活状态，用户正常使用系统
    INACTIVE = "inactive"  # 停用状态，暂时禁止用户访问系统
    PENDING = "pending"    # 待激活状态，用户注册后等待邮箱验证或管理员审核
    SUSPENDED = "suspended" # 暂停状态，因违规等原因被临时禁止访问
    DELETED = "deleted"    # 已删除状态，用户被软删除，数据保留在回收站

class ThirdPartyProvider(str, PyEnum):
    """第三方认证提供商枚举
    
    支持多种第三方身份认证方式，用于企业级用户身份集成。
    """
    LOCAL = "local"           # 本地认证（用户名密码）
    OAUTH2 = "oauth2"         # OAuth2.0 认证（如Google、GitHub等）
    LDAP = "ldap"             # LDAP 目录服务认证（企业常用）
    SAML = "saml"             # SAML 单点登录认证
    WECHAT = "wechat"         # 微信企业号认证
    DINGTALK = "dingtalk"     # 钉钉企业认证
    FEISHU = "feishu"         # 飞书企业认证

# RBAC 用户角色关联表（移除外键约束）
user_roles = Table(
    'sys_user_roles',
    Base.metadata,
    # 用户ID，关联到sys_users表
    Column('user_id', UUID(as_uuid=True), primary_key=True, index=True),
    # 角色ID，关联到sys_roles表
    Column('role_id', UUID(as_uuid=True), primary_key=True, index=True),
    # 分配者ID，记录是谁给用户分配了这个角色（可为空）
    Column('assigned_by', UUID(as_uuid=True), nullable=True, index=True),
    # 分配时间，自动记录角色分配的时间
    Column('assigned_at', DateTime(timezone=True), server_default=func.now()),
    # 角色过期时间，支持临时角色分配（可为空表示永不过期）
    Column('expires_at', DateTime(timezone=True), nullable=True)
)

# RBAC 角色权限关联表（移除外键约束）
role_permissions = Table(
    'sys_role_permissions',
    Base.metadata,
    # 角色ID，关联到sys_roles表
    Column('role_id', UUID(as_uuid=True), primary_key=True, index=True),
    # 权限ID，关联到sys_permissions表
    Column('permission_id', UUID(as_uuid=True), primary_key=True, index=True),
    # 创建时间，记录权限分配给角色的时间
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

class User(Base):
    """用户主表模型
    
    存储系统中所有用户的基本信息，支持多租户架构和第三方认证集成。
    包含用户的身份信息、组织关系、状态管理和软删除等功能。
    
    主要特性:
    - 多租户隔离：每个用户属于特定租户
    - 第三方认证：支持多种企业级认证方式
    - 组织结构：支持组织和部门层级关系
    - 状态管理：支持用户生命周期状态管理
    - 软删除：删除用户时保留数据到回收站
    - RBAC集成：与角色权限系统深度集成
    """
    __tablename__ = "sys_users"

    # 主键ID，使用UUID
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="用户唯一标识ID")
    
    # 多租户支持 - 用户所属租户（移除外键约束）
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True, 
                      comment="所属租户ID，用于多租户数据隔离")
    
    # 核心认证字段
    email = Column(String(255), index=True, nullable=False, comment="用户邮箱地址")
    username = Column(String(100), index=True, nullable=False, comment="用户名")
    password_hash = Column(String(255), nullable=False, comment="用户密码哈希值")
    
    # 用户账户状态控制
    is_active = Column(Boolean, default=True, comment="账户是否激活，控制登录权限")
    is_superuser = Column(Boolean, default=False, comment="是否为超级管理员")
    is_verified = Column(Boolean, default=False, comment="邮箱是否已验证")
    
    # 用户生命周期状态管理
    status = Column(String(20), default=UserStatus.ACTIVE, nullable=False, index=True, 
                   comment="用户当前状态（激活/停用/暂停/删除等）")
    
    # 扩展信息字段（JSON存储，提高灵活性）
    profile = Column(JSON, nullable=True, comment="""用户详细资料，包含：
    {
        "full_name": "用户真实姓名",
        "phone": "手机号码", 
        "avatar_url": "用户头像URL",
        "bio": "用户个人简介",
        "date_of_birth": "生日",
        "employee_id": "员工工号",
        "position": "职位名称"
    }""")
    
    preferences = Column(JSON, nullable=True, comment="""用户偏好设置，包含：
    {
        "language": "首选语言",
        "theme": "界面主题",
        "timezone": "时区设置",
        "notifications": "通知设置",
        "urls": ["个人网站链接"]
    }""")
    
    third_party_auth = Column(JSON, nullable=True, comment="""第三方认证信息，包含：
    {
        "provider": "认证提供商",
        "external_id": "外部系统ID",
        "auth_data": "认证扩展数据"
    }""")
    
    # 组织关系信息（冗余存储，提高查询性能，移除外键）
    organization_info = Column(JSON, nullable=True, comment="""当前组织信息快照，包含：
    {
        "org_id": "组织ID",
        "org_name": "组织名称",
        "dept_id": "部门ID", 
        "dept_name": "部门名称",
        "dept_path": "部门路径",
        "is_manager": "是否为部门管理员"
    }""")
    
    # 时间戳字段
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="账户创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="最后更新时间")
    last_login = Column(DateTime(timezone=True), nullable=True, comment="最后登录时间")
    last_activity = Column(DateTime(timezone=True), nullable=True, comment="最后活动时间，用于在线状态判断")
    
    # 软删除支持字段
    is_deleted = Column(Boolean, default=False, nullable=False, index=True, 
                       comment="是否已软删除")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(UUID(as_uuid=True), nullable=True, 
                       comment="执行删除操作的用户ID（移除外键约束）")
    
    # 注意：移除了复杂的关系映射，通过应用层服务管理关系
    
    # 数据库约束和索引
    __table_args__ = (
        UniqueConstraint('tenant_id', 'email', name='uq_tenant_user_email'),
        UniqueConstraint('tenant_id', 'username', name='uq_tenant_user_username'),
        Index('ix_user_status_active', 'tenant_id', 'status', 'is_active'),
        Index('ix_user_activity', 'last_activity'),
        {"comment": "用户主表 - 混合架构设计，核心字段关系型+扩展字段JSON"},
    )
    
    # 辅助方法
    @property
    def display_name(self) -> str:
        """获取用户显示名称"""
        if self.profile and self.profile.get('full_name'):
            return self.profile['full_name']
        return self.username
    
    @property
    def is_online(self) -> bool:
        """判断用户是否在线（5分钟内有活动）"""
        if not self.last_activity:
            return False
        return (datetime.now(timezone.utc) - self.last_activity.replace(tzinfo=timezone.utc)).total_seconds() < 300
    
    def get_organization_id(self) -> Optional[str]:
        """获取当前组织ID"""
        return self.organization_info.get('org_id') if self.organization_info else None
    
    def get_department_id(self) -> Optional[str]:
        """获取当前部门ID"""
        return self.organization_info.get('dept_id') if self.organization_info else None
    
    def update_organization_info(self, org_id: str = None, org_name: str = None, 
                               dept_id: str = None, dept_name: str = None, 
                               dept_path: str = None, is_manager: bool = False):
        """更新组织信息快照"""
        if not self.organization_info:
            self.organization_info = {}
        
        if org_id:
            self.organization_info['org_id'] = org_id
        if org_name:
            self.organization_info['org_name'] = org_name
        if dept_id:
            self.organization_info['dept_id'] = dept_id
        if dept_name:
            self.organization_info['dept_name'] = dept_name
        if dept_path:
            self.organization_info['dept_path'] = dept_path
        self.organization_info['is_manager'] = is_manager

class UserSession(Base):
    """用户会话管理模型
    
    用于管理用户的登录会话，支持多设备登录、会话跟踪和安全管控。
    每个用户可以有多个并发会话（不同设备），每个会话都有独立的刷新令牌。
    
    主要功能:
    - JWT刷新令牌管理
    - 设备信息记录
    - 会话过期控制
    - 异常登录检测
    - 会话活跃状态跟踪
    """
    __tablename__ = "sys_user_sessions"

    # 会话唯一标识
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="会话ID")
    
    # 关联用户（移除外键约束）
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="会话所属用户ID")
    
    # 令牌和认证信息
    refresh_token = Column(String, unique=True, index=True, nullable=False, 
                          comment="JWT刷新令牌，全局唯一")
    
    # 设备和网络信息
    device_info = Column(String, nullable=True, comment="设备信息（浏览器User-Agent等）")
    ip_address = Column(String, nullable=True, comment="登录IP地址")
    
    # 会话状态管理
    is_active = Column(Boolean, default=True, comment="会话是否活跃")
    expires_at = Column(DateTime(timezone=True), nullable=False, comment="会话过期时间")
    
    # 时间追踪
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="会话创建时间")
    last_used = Column(DateTime(timezone=True), server_default=func.now(), comment="最后使用时间")
    
    # 注意：移除了关系映射，通过应用层服务管理关系
    
    # 数据库表配置
    __table_args__ = (
        {"comment": "用户会话表，管理用户登录会话和刷新令牌"},
    )

class UserVerification(Base):
    """用户验证码管理模型
    
    存储各类验证码信息，支持邮箱验证、手机验证、密码重置等场景。
    验证码具有时效性和一次性使用特点，确保验证流程的安全性。
    
    支持的验证类型:
    - email: 邮箱验证码（注册激活、邮箱变更）
    - phone: 手机验证码（手机绑定、双因素认证）
    - password_reset: 密码重置验证码
    - two_factor: 两步验证码
    """
    __tablename__ = "sys_user_verifications"

    # 验证记录唯一标识
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="验证记录ID")
    
    # 关联用户（移除外键约束）
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="验证码所属用户ID")
    
    # 验证信息
    verification_type = Column(String, nullable=False, comment="验证类型（email/phone/password_reset/two_factor）")
    verification_code = Column(String, nullable=False, comment="验证码内容")
    
    # 验证状态
    is_used = Column(Boolean, default=False, comment="验证码是否已使用")
    expires_at = Column(DateTime(timezone=True), nullable=False, comment="验证码过期时间")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="验证码生成时间")
    
    # 注意：移除了关系映射，通过应用层服务管理关系
    
    # 数据库表配置
    __table_args__ = (
        {"comment": "用户验证码表，存储各类验证码信息（邮箱验证、手机验证、密码重置等）"},
    )


# RBAC (基于角色的访问控制) 数据模型

class Role(Base):
    """角色模型 - RBAC系统核心组件
    
    定义系统中的各种角色，每个角色包含一组权限。用户通过分配角色来获得相应权限。
    支持角色层级和继承，适用于复杂的企业级权限管理场景。
    
    角色特性:
    - 多租户隔离：角色属于特定租户
    - 层级结构：支持父子角色关系和权限继承
    - 类型区分：系统角色 vs 自定义角色
    - 用户限制：可限制角色最大用户数
    - 软删除：支持角色回收站功能
    """
    __tablename__ = "sys_roles"

    # 角色唯一标识
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="角色ID")
    
    # 多租户支持（移除外键约束）
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True,
                      comment="所属租户ID，用于多租户角色隔离")
    
    # 角色基本信息
    name = Column(String(100), nullable=False, index=True, comment="角色名称，租户内唯一")
    display_name = Column(String(255), nullable=False, comment="角色显示名称")
    description = Column(String(500), nullable=True, comment="角色描述")
    
    # 角色分类和层级
    role_type = Column(String(20), default="custom", nullable=False, 
                      comment="角色类型（system=系统角色, tenant=租户角色, custom=自定义角色）")
    level = Column(Integer, default=0, nullable=False, 
                  comment="角色级别，数字越大权限越高，用于权限继承和冲突解决")
    
    # 角色状态控制
    is_active = Column(Boolean, default=True, nullable=False, comment="角色是否激活")
    is_system = Column(Boolean, default=False, nullable=False, comment="是否为系统预定义角色（不可删除）")
    is_default = Column(Boolean, default=False, nullable=False, comment="是否为新用户默认角色")
    
    # 角色层级关系（移除外键约束）
    parent_id = Column(UUID(as_uuid=True), nullable=True, index=True,
                      comment="父角色ID，支持角色继承")
    
    # 角色使用限制
    max_users = Column(Integer, nullable=True, comment="该角色最大用户数限制（null表示无限制）")
    
    # 时间戳和审计字段
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="角色创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="最后更新时间")
    created_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="创建者用户ID")
    
    # 软删除支持字段
    is_deleted = Column(Boolean, default=False, nullable=False, index=True, comment="是否已软删除")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="执行删除的用户ID")
    
    # 注意：移除了关系映射，通过应用层服务管理关系
    
    # 数据库表配置
    __table_args__ = (
        # 同一租户内角色名必须唯一
        UniqueConstraint('tenant_id', 'name', name='uq_role_tenant_name'),
        {"extend_existing": True, "comment": "角色表，定义系统中的各种角色及其层级关系"},
    )


class Permission(Base):
    """权限模型 - RBAC系统权限定义
    
    定义系统中的所有权限点，采用资源+动作的模式进行权限细分。
    权限可以组织成层级结构，支持复杂的企业级权限管理需求。
    
    权限命名规范:
    - 格式：resource:action （如：user:create, file:read）
    - 资源类型：user, role, permission, file, org, department 等
    - 动作类型：create, read, update, delete, manage, assign 等
    
    权限特性:
    - 全局唯一：权限名称在整个系统中唯一
    - 层级结构：支持权限分组和继承
    - 条件控制：支持基于条件的动态权限
    - 系统保护：系统权限不可删除
    """
    __tablename__ = "sys_permissions"

    # 权限唯一标识
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="权限ID")
    
    # 权限基本信息
    name = Column(String(100), nullable=False, unique=True, index=True, 
                 comment="权限名称，全局唯一，格式：resource:action")
    display_name = Column(String(255), nullable=False, comment="权限显示名称")
    description = Column(String(500), nullable=True, comment="权限描述")
    
    # 权限分类和结构
    resource_type = Column(String(50), nullable=False, index=True, 
                          comment="资源类型（user/file/organization/department等）")
    action = Column(String(50), nullable=False, index=True, 
                   comment="操作类型（create/read/update/delete/manage等）")
    
    # 权限组织和分组
    category = Column(String(100), nullable=True, index=True, comment="权限分类（用户管理/文件管理等）")
    group_name = Column(String(100), nullable=True, index=True, comment="权限分组名称")
    parent_id = Column(UUID(as_uuid=True), nullable=True, index=True,
                      comment="父权限ID，支持权限层级")
    
    # 权限控制配置
    is_system = Column(Boolean, default=False, nullable=False, comment="是否为系统权限（不可删除）")
    is_active = Column(Boolean, default=True, nullable=False, comment="权限是否激活")
    require_owner = Column(Boolean, default=False, nullable=False, 
                          comment="是否需要资源所有者权限（如只能删除自己的文件）")
    
    # 权限条件规则
    conditions = Column(JSON, nullable=True, 
                       comment="权限执行条件（JSON格式），支持复杂的动态权限控制")
    
    # 时间戳字段
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="权限创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="最后更新时间")
    
    # 软删除支持字段
    is_deleted = Column(Boolean, default=False, nullable=False, index=True, comment="是否已软删除")
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="删除时间")
    deleted_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="执行删除的用户ID")
    
    # 注意：移除了关系映射，通过应用层服务管理关系
    
    # 数据库表配置
    __table_args__ = (
        {"comment": "权限表，定义系统中的所有权限点和权限层级"},
    )


class UserPermission(Base):
    """用户直接权限模型 - 补充角色权限的精细化控制
    
    除了通过角色获得权限外，还可以直接给用户分配特定权限或撤销某些权限。
    这种方式适用于需要精细化权限控制的场景，如临时权限、特殊权限等。
    
    使用场景:
    - 临时权限：给用户临时分配特定权限
    - 权限撤销：撤销用户从角色继承的某个权限
    - 特殊权限：给特定用户分配只有他才能拥有的权限
    - 资源级权限：针对特定资源的权限控制
    """
    __tablename__ = "sys_user_permissions"

    # 权限记录唯一标识
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="用户权限记录ID")
    
    # 权限关联关系（移除外键约束）
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="用户ID")
    permission_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="权限ID")
    
    # 权限授予状态
    granted = Column(Boolean, default=True, nullable=False, 
                    comment="权限授予状态（True=授予权限, False=明确拒绝权限）")
    
    # 权限作用范围
    resource_id = Column(String(100), nullable=True, comment="特定资源ID，为空表示全局权限")
    conditions = Column(JSON, nullable=True, comment="权限执行的额外条件（JSON格式）")
    
    # 权限授予审计信息（移除外键约束）
    granted_by = Column(UUID(as_uuid=True), nullable=True, index=True, comment="授权者用户ID")
    reason = Column(String(500), nullable=True, comment="授权原因说明")
    
    # 权限有效期控制
    expires_at = Column(DateTime(timezone=True), nullable=True, comment="权限过期时间（null表示永不过期）")
    is_active = Column(Boolean, default=True, nullable=False, comment="权限是否激活")
    
    # 时间戳字段
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="权限分配时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="最后更新时间")
    
    # 注意：移除了关系映射，通过应用层服务管理关系
    
    # 数据库表配置
    __table_args__ = (
        # 同一用户对同一资源的同一权限只能有一条记录
        UniqueConstraint('user_id', 'permission_id', 'resource_id', name='uq_user_permission_resource'),
        {"extend_existing": True, 
         "comment": "用户直接权限表，存储用户级别的精细化权限控制"},
    )