"""
密码策略应用服务
处理密码策略相关的业务逻辑，包括策略管理、继承、验证等
"""

import uuid
import re
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime

from app.domain.repositories.password_policy_repository import (
    IPasswordPolicyRepository, IPasswordPolicyRuleRepository,
    IPasswordPolicyApplicationRepository, IPasswordPolicyTemplateRepository
)
from app.models.password_policy_models import (
    PasswordPolicy, PasswordPolicyRule, PasswordPolicyApplication, 
    PasswordPolicyTemplate, PolicyScopeType, PolicyStatus
)
from app.models.user_models import User
from app.core.exceptions import BusinessLogicError


class PasswordPolicyService:
    """密码策略应用服务"""

    def __init__(
        self,
        policy_repo: IPasswordPolicyRepository,
        rule_repo: IPasswordPolicyRuleRepository,
        application_repo: IPasswordPolicyApplicationRepository,
        template_repo: IPasswordPolicyTemplateRepository
    ):
        self.policy_repo = policy_repo
        self.rule_repo = rule_repo
        self.application_repo = application_repo
        self.template_repo = template_repo

    async def create_password_policy(
        self,
        name: str,
        description: str,
        scope_type: PolicyScopeType,
        scope_id: str,
        scope_name: str,
        rules: Dict[str, Any],
        tenant_id: str,
        current_user: User,
        parent_policy_id: Optional[str] = None,
        override_parent: bool = False
    ) -> PasswordPolicy:
        """创建密码策略"""
        
        # 1. 权限检查
        if not await self._check_create_permission(current_user, scope_type, scope_id, tenant_id):
            raise BusinessLogicError("权限不足，无法创建该作用域的密码策略")
        
        # 2. 检查策略冲突
        has_conflict = await self.policy_repo.check_policy_conflicts(
            scope_type, scope_id, tenant_id
        )
        if has_conflict:
            raise BusinessLogicError("该作用域已存在密码策略，请修改现有策略或删除后重新创建")
        
        # 3. 验证规则格式
        self._validate_policy_rules(rules)
        
        # 4. 创建策略对象
        policy = PasswordPolicy(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            name=name,
            description=description,
            scope_type=scope_type,
            scope_id=scope_id,
            scope_name=scope_name,
            parent_policy_id=parent_policy_id,
            override_parent=override_parent,
            rules=rules,
            status=PolicyStatus.ACTIVE,
            created_by=current_user.id,
            created_by_name=current_user.username
        )
        
        # 5. 保存策略
        policy = await self.policy_repo.create_policy(policy)
        
        # 6. 创建规则详情
        await self._create_policy_rules(policy.id, rules, tenant_id)
        
        return policy

    async def update_password_policy(
        self,
        policy_id: str,
        tenant_id: str,
        current_user: User,
        name: Optional[str] = None,
        description: Optional[str] = None,
        rules: Optional[Dict[str, Any]] = None,
        status: Optional[PolicyStatus] = None
    ) -> PasswordPolicy:
        """更新密码策略"""
        
        # 1. 获取现有策略
        policy = await self.policy_repo.get_policy_by_id(policy_id, tenant_id)
        if not policy:
            raise BusinessLogicError("密码策略不存在")
        
        # 2. 权限检查
        if not await self._check_update_permission(current_user, policy):
            raise BusinessLogicError("权限不足，无法修改该密码策略")
        
        # 3. 更新字段
        if name is not None:
            policy.name = name
        if description is not None:
            policy.description = description
        if status is not None:
            policy.status = status
        if rules is not None:
            self._validate_policy_rules(rules)
            policy.rules = rules
            # 更新规则详情
            await self.rule_repo.delete_rules_by_policy(policy_id)
            await self._create_policy_rules(policy_id, rules, tenant_id)
        
        policy.updated_by = current_user.id
        policy.updated_by_name = current_user.username
        
        # 4. 保存更新
        return await self.policy_repo.update_policy(policy)

    async def delete_password_policy(
        self,
        policy_id: str,
        tenant_id: str,
        current_user: User
    ) -> bool:
        """删除密码策略"""
        
        # 1. 获取策略
        policy = await self.policy_repo.get_policy_by_id(policy_id, tenant_id)
        if not policy:
            raise BusinessLogicError("密码策略不存在")
        
        # 2. 权限检查
        if not await self._check_delete_permission(current_user, policy):
            raise BusinessLogicError("权限不足，无法删除该密码策略")
        
        # 3. 检查是否有子策略
        child_policies = await self.policy_repo.get_child_policies(policy_id, tenant_id)
        if child_policies:
            raise BusinessLogicError("存在子策略，请先删除子策略后再删除父策略")
        
        # 4. 删除策略
        return await self.policy_repo.delete_policy(policy_id, tenant_id, current_user.id)

    async def get_effective_password_policy(
        self,
        scope_type: PolicyScopeType,
        scope_id: str,
        tenant_id: str
    ) -> Optional[PasswordPolicy]:
        """获取有效的密码策略（考虑继承）"""
        return await self.policy_repo.get_effective_policy(scope_type, scope_id, tenant_id)

    async def get_policy_inheritance_chain(
        self,
        scope_type: PolicyScopeType,
        scope_id: str,
        tenant_id: str
    ) -> List[PasswordPolicy]:
        """获取策略继承链，从当前层级到最顶层"""
        chain = []
        
        # 1. 首先查找当前层级的直接策略
        direct_policy = await self.policy_repo.get_policies_by_scope(
            scope_type, scope_id, tenant_id, include_inherited=False
        )
        if direct_policy:
            chain.extend(direct_policy)
        
        # 2. 获取继承的策略链
        inherited_policies = await self.policy_repo.get_policies_by_scope(
            scope_type, scope_id, tenant_id, include_inherited=True
        )
        # 移除直接策略，只保留继承的策略
        inherited_only = [p for p in inherited_policies if p.id not in seen_ids]
        
        # 3. 构建完整的继承链
        chain.extend(inherited_only)
        
        return chain

    async def validate_password(
        self,
        password: str,
        scope_type: PolicyScopeType,
        scope_id: str,
        tenant_id: str,
        user_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, List[str]]:
        """验证密码是否符合策略要求"""
        
        # 1. 获取有效策略
        policy = await self.get_effective_password_policy(scope_type, scope_id, tenant_id)
        if not policy:
            # 如果没有策略，使用默认策略
            return self._validate_with_default_policy(password)
        
        # 2. 应用策略规则进行验证
        return self._validate_with_policy(password, policy.rules, user_info)

    def _validate_with_default_policy(self, password: str) -> Tuple[bool, List[str]]:
        """使用默认策略验证密码"""
        errors = []
        
        if len(password) < 8:
            errors.append("密码长度不能少于8位")
        
        if not re.search(r'[A-Z]', password):
            errors.append("密码必须包含大写字母")
        
        if not re.search(r'[a-z]', password):
            errors.append("密码必须包含小写字母")
        
        if not re.search(r'\d', password):
            errors.append("密码必须包含数字")
        
        return len(errors) == 0, errors

    def _validate_with_policy(
        self,
        password: str,
        rules: Dict[str, Any],
        user_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, List[str]]:
        """使用指定策略验证密码"""
        errors = []
        
        # 长度检查
        min_length = rules.get('min_length', 8)
        max_length = rules.get('max_length', 128)
        if len(password) < min_length:
            errors.append(f"密码长度不能少于{min_length}位")
        if len(password) > max_length:
            errors.append(f"密码长度不能超过{max_length}位")
        
        # 字符类型检查
        if rules.get('require_uppercase', False) and not re.search(r'[A-Z]', password):
            errors.append("密码必须包含大写字母")
        
        if rules.get('require_lowercase', False) and not re.search(r'[a-z]', password):
            errors.append("密码必须包含小写字母")
        
        if rules.get('require_digits', False) and not re.search(r'\d', password):
            errors.append("密码必须包含数字")
        
        if rules.get('require_special', False) and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("密码必须包含特殊字符")
        
        # 复杂度检查
        if rules.get('min_character_types', 0) > 0:
            char_types = 0
            if re.search(r'[A-Z]', password):
                char_types += 1
            if re.search(r'[a-z]', password):
                char_types += 1
            if re.search(r'\d', password):
                char_types += 1
            if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
                char_types += 1
            
            if char_types < rules.get('min_character_types'):
                errors.append(f"密码必须包含至少{rules.get('min_character_types')}种类型的字符")
        
        # 禁止包含用户信息
        if rules.get('forbid_user_info', False) and user_info:
            username = user_info.get('username', '').lower()
            email = user_info.get('email', '').split('@')[0].lower()
            
            if username and username in password.lower():
                errors.append("密码不能包含用户名")
            if email and email in password.lower():
                errors.append("密码不能包含邮箱前缀")
        
        # 禁止常见密码
        if rules.get('forbid_common', False):
            common_passwords = [
                '123456', 'password', '123456789', '12345678', '12345',
                '1234567', '1234567890', 'qwerty', 'abc123', 'password123'
            ]
            if password.lower() in common_passwords:
                errors.append("不能使用常见密码")
        
        return len(errors) == 0, errors

    async def list_password_policies(
        self,
        tenant_id: str,
        current_user: User,
        scope_type: Optional[PolicyScopeType] = None,
        status: Optional[PolicyStatus] = None,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> Tuple[List[PasswordPolicy], int]:
        """分页查询密码策略列表"""
        
        # 权限检查 - 只有管理员可以查看策略列表
        if not (current_user.is_superuser or self._is_tenant_admin(current_user, tenant_id)):
            raise BusinessLogicError("权限不足，无法查看密码策略列表")
        
        policies = await self.policy_repo.list_policies(
            tenant_id, scope_type, status, skip, limit, search
        )
        
        total = await self.policy_repo.count_policies(
            tenant_id, scope_type, status, search
        )
        
        return policies, total

    async def create_from_template(
        self,
        template_id: str,
        name: str,
        scope_type: PolicyScopeType,
        scope_id: str,
        scope_name: str,
        tenant_id: str,
        current_user: User,
        description: Optional[str] = None
    ) -> PasswordPolicy:
        """从模板创建密码策略"""
        
        # 1. 获取模板
        template = await self.template_repo.get_template_by_id(template_id)
        if not template:
            raise BusinessLogicError("策略模板不存在")
        
        # 2. 增加模板使用次数
        await self.template_repo.increment_usage_count(template_id)
        
        # 3. 创建策略
        return await self.create_password_policy(
            name=name,
            description=description or template.description,
            scope_type=scope_type,
            scope_id=scope_id,
            scope_name=scope_name,
            rules=template.template_rules,
            tenant_id=tenant_id,
            current_user=current_user
        )

    async def _create_policy_rules(
        self,
        policy_id: str,
        rules: Dict[str, Any],
        tenant_id: str
    ) -> None:
        """创建策略规则详情"""
        rule_objects = []
        sort_order = 0
        
        for rule_type, rule_value in rules.items():
            if rule_value is not None:
                rule = PasswordPolicyRule(
                    id=str(uuid.uuid4()),
                    policy_id=policy_id,
                    tenant_id=tenant_id,
                    rule_type=rule_type,
                    rule_name=self._get_rule_name(rule_type),
                    rule_value=str(rule_value) if rule_value is not True else None,
                    is_required=True,
                    sort_order=sort_order
                )
                rule_objects.append(rule)
                sort_order += 10
        
        if rule_objects:
            await self.rule_repo.batch_create_rules(rule_objects)

    def _validate_policy_rules(self, rules: Dict[str, Any]) -> None:
        """验证策略规则格式"""
        required_keys = ['min_length']
        for key in required_keys:
            if key not in rules:
                raise BusinessLogicError(f"缺少必需的规则: {key}")
        
        if rules.get('min_length', 0) < 1:
            raise BusinessLogicError("最小长度必须大于0")
        
        if rules.get('max_length', 0) > 0 and rules.get('max_length') < rules.get('min_length'):
            raise BusinessLogicError("最大长度不能小于最小长度")

    def _get_rule_name(self, rule_type: str) -> str:
        """获取规则显示名称"""
        rule_names = {
            'min_length': '最小长度',
            'max_length': '最大长度',
            'require_uppercase': '必须包含大写字母',
            'require_lowercase': '必须包含小写字母',
            'require_digits': '必须包含数字',
            'require_special': '必须包含特殊字符',
            'min_character_types': '最少字符类型数',
            'forbid_user_info': '禁止包含用户信息',
            'forbid_common': '禁止常见密码'
        }
        return rule_names.get(rule_type, rule_type)

    async def _check_create_permission(
        self,
        current_user: User,
        scope_type: PolicyScopeType,
        scope_id: str,
        tenant_id: str
    ) -> bool:
        """检查创建权限 - 实现层级权限控制"""
        # 系统管理员有全部权限
        if current_user.is_superuser:
            return True
        
        # 租户管理员可以在自己的租户内创建所有层级的策略
        if self._is_tenant_admin(current_user, tenant_id):
            return True
        
        # 根据策略作用域类型检查层级权限
        if scope_type == PolicyScopeType.TENANT:
            # 只有租户管理员和系统管理员可以创建租户级策略
            return False
        
        elif scope_type == PolicyScopeType.ORGANIZATION:
            # 检查是否是该组织或其上级组织的管理员
            return await self._check_organization_admin_permission(current_user, scope_id, tenant_id)
        
        elif scope_type == PolicyScopeType.DEPARTMENT:
            # 检查是否是该部门所属组织或其上级的管理员
            return await self._check_department_admin_permission(current_user, scope_id, tenant_id)
        
        elif scope_type == PolicyScopeType.TEAM:
            # 检查是否是该团队所属组织或其上级的管理员
            return await self._check_team_admin_permission(current_user, scope_id, tenant_id)
        
        return False

    async def _check_organization_admin_permission(
        self, 
        current_user: User, 
        org_id: str, 
        tenant_id: str
    ) -> bool:
        """检查是否有组织管理权限"""
        from app.models.org_models import Organization
        from app.models.user_models import UserOrganization
        
        # 查找组织信息
        org = await self._get_organization_by_id(org_id, tenant_id)
        if not org:
            return False
        
        # 检查用户是否是该组织的管理员
        user_org_relation = self.policy_repo.db.query(UserOrganization).filter(
            and_(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == org_id,
                UserOrganization.role.in_(['admin', 'owner'])
            )
        ).first()
        
        if user_org_relation:
            return True
        
        # 检查是否是上级组织的管理员（递归向上查找）
        if org.parent_id:
            return await self._check_organization_admin_permission(current_user, org.parent_id, tenant_id)
        
        return False

    async def _check_department_admin_permission(
        self, 
        current_user: User, 
        dept_id: str, 
        tenant_id: str
    ) -> bool:
        """检查是否有部门管理权限"""
        # 在当前架构中，部门被简化为组织层级
        # 检查是否是该"部门"(组织)或其上级组织的管理员
        return await self._check_organization_admin_permission(current_user, dept_id, tenant_id)

    async def _check_team_admin_permission(
        self, 
        current_user: User, 
        team_id: str, 
        tenant_id: str
    ) -> bool:
        """检查是否有团队管理权限"""
        from app.models.org_models import Team
        from app.models.user_models import UserTeam
        
        # 查找团队信息
        team = self.policy_repo.db.query(Team).filter(
            and_(Team.id == team_id, Team.tenant_id == tenant_id)
        ).first()
        
        if not team:
            return False
        
        # 检查用户是否是该团队的管理员
        user_team_relation = self.policy_repo.db.query(UserTeam).filter(
            and_(
                UserTeam.user_id == current_user.id,
                UserTeam.team_id == team_id,
                UserTeam.role.in_(['admin', 'owner'])
            )
        ).first()
        
        if user_team_relation:
            return True
        
        # 检查是否是所属组织或其上级组织的管理员
        if team.organization_id:
            return await self._check_organization_admin_permission(current_user, team.organization_id, tenant_id)
        
        return False

    async def _get_organization_by_id(self, org_id: str, tenant_id: str):
        """获取组织信息"""
        from app.models.org_models import Organization
        
        return self.policy_repo.db.query(Organization).filter(
            and_(
                Organization.id == org_id,
                Organization.tenant_id == tenant_id,
                Organization.deleted_at.is_(None)
            )
        ).first()

    async def _check_update_permission(self, current_user: User, policy: PasswordPolicy) -> bool:
        """检查更新权限 - 遵循层级权限控制"""
        # 系统管理员有全部权限
        if current_user.is_superuser:
            return True
        
        # 租户管理员可以修改自己租户的所有策略
        if self._is_tenant_admin(current_user, policy.tenant_id):
            return True
        
        # 检查是否有对应层级的管理权限（使用与创建相同的权限检查逻辑）
        return await self._check_create_permission(
            current_user, 
            policy.scope_type, 
            policy.scope_id, 
            policy.tenant_id
        )

    async def _check_delete_permission(self, current_user: User, policy: PasswordPolicy) -> bool:
        """检查删除权限"""
        # 删除权限比修改权限更严格
        return await self._check_update_permission(current_user, policy)

    def _is_tenant_admin(self, user: User, tenant_id: str) -> bool:
        """检查是否是租户管理员"""
        # 这里需要根据实际的权限系统来实现
        # 暂时简化处理
        return user.current_tenant_id == tenant_id and (
            user.is_superuser or 
            'tenant_admin' in getattr(user, 'roles', []) or
            'admin' in getattr(user, 'roles', [])
        )