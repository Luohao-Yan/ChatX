"""
密码策略仓储实现
实现密码策略相关数据访问的具体逻辑
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func, text

from app.domain.repositories.password_policy_repository import (
    IPasswordPolicyRepository, IPasswordPolicyRuleRepository,
    IPasswordPolicyApplicationRepository, IPasswordPolicyTemplateRepository
)
from app.models.password_policy_models import (
    PasswordPolicy, PasswordPolicyRule, 
    PasswordPolicyApplication, PasswordPolicyTemplate,
    PolicyScopeType, PolicyStatus
)


class PasswordPolicyRepositoryImpl(IPasswordPolicyRepository):
    """密码策略仓储实现"""

    def __init__(self, db: Session):
        self.db = db

    async def create_policy(self, policy: PasswordPolicy) -> PasswordPolicy:
        """创建密码策略"""
        self.db.add(policy)
        self.db.flush()
        return policy

    async def get_policy_by_id(self, policy_id: str, tenant_id: str = None) -> Optional[PasswordPolicy]:
        """根据ID获取密码策略"""
        query = self.db.query(PasswordPolicy).filter(
            and_(
                PasswordPolicy.id == policy_id,
                PasswordPolicy.deleted_at.is_(None)
            )
        )
        
        if tenant_id:
            query = query.filter(PasswordPolicy.tenant_id == tenant_id)
            
        return query.first()

    async def get_policies_by_scope(
        self, 
        scope_type: PolicyScopeType, 
        scope_id: str, 
        tenant_id: str,
        include_inherited: bool = True
    ) -> List[PasswordPolicy]:
        """根据作用域获取密码策略列表"""
        query = self.db.query(PasswordPolicy).filter(
            and_(
                PasswordPolicy.tenant_id == tenant_id,
                PasswordPolicy.scope_type == scope_type,
                PasswordPolicy.scope_id == scope_id,
                PasswordPolicy.status == PolicyStatus.ACTIVE,
                PasswordPolicy.deleted_at.is_(None)
            )
        )
        
        policies = query.all()
        
        if include_inherited and not policies:
            # 如果没有直接策略且需要继承，查找父级策略
            parent_policies = await self._get_inherited_policies(scope_type, scope_id, tenant_id)
            policies.extend(parent_policies)
        
        return policies

    async def get_effective_policy(
        self, 
        scope_type: PolicyScopeType, 
        scope_id: str, 
        tenant_id: str
    ) -> Optional[PasswordPolicy]:
        """获取特定作用域的有效密码策略（考虑继承）"""
        # 首先查找直接策略
        direct_policy = self.db.query(PasswordPolicy).filter(
            and_(
                PasswordPolicy.tenant_id == tenant_id,
                PasswordPolicy.scope_type == scope_type,
                PasswordPolicy.scope_id == scope_id,
                PasswordPolicy.status == PolicyStatus.ACTIVE,
                PasswordPolicy.deleted_at.is_(None),
                PasswordPolicy.override_parent == True
            )
        ).first()
        
        if direct_policy:
            return direct_policy
        
        # 如果没有覆盖父级的策略，查找继承策略
        inherited_policies = await self._get_inherited_policies(scope_type, scope_id, tenant_id)
        
        # 返回最近的继承策略
        if inherited_policies:
            return inherited_policies[0]
        
        return None

    async def _get_inherited_policies(
        self, 
        scope_type: PolicyScopeType, 
        scope_id: str, 
        tenant_id: str
    ) -> List[PasswordPolicy]:
        """获取继承的策略，按层级顺序查找"""
        inherited_policies = []
        
        # 根据作用域类型构建继承链路
        if scope_type == PolicyScopeType.TEAM:
            # 团队继承链：团队 -> 组织 -> 租户
            inherited_policies.extend(await self._get_team_inherited_policies(scope_id, tenant_id))
        elif scope_type == PolicyScopeType.DEPARTMENT:
            # 部门继承链：部门 -> 组织 -> 租户  
            inherited_policies.extend(await self._get_department_inherited_policies(scope_id, tenant_id))
        elif scope_type == PolicyScopeType.ORGANIZATION:
            # 组织继承链：组织 -> 租户
            inherited_policies.extend(await self._get_organization_inherited_policies(scope_id, tenant_id))
        
        return inherited_policies

    async def _get_team_inherited_policies(self, team_id: str, tenant_id: str) -> List[PasswordPolicy]:
        """获取团队的继承策略"""
        from app.models.org_models import Team, Organization
        
        policies = []
        
        # 1. 查找团队信息
        team = self.db.query(Team).filter(
            and_(Team.id == team_id, Team.tenant_id == tenant_id)
        ).first()
        
        if team and team.organization_id:
            # 2. 查找所属组织的策略
            org_policies = self.db.query(PasswordPolicy).filter(
                and_(
                    PasswordPolicy.tenant_id == tenant_id,
                    PasswordPolicy.scope_type == PolicyScopeType.ORGANIZATION,
                    PasswordPolicy.scope_id == team.organization_id,
                    PasswordPolicy.status == PolicyStatus.ACTIVE,
                    PasswordPolicy.deleted_at.is_(None)
                )
            ).all()
            policies.extend(org_policies)
            
            # 3. 如果组织没有策略，继续向上查找组织的父级策略
            if not org_policies:
                policies.extend(await self._get_organization_inherited_policies(team.organization_id, tenant_id))
        
        # 4. 最后查找租户级策略作为兜底
        if not policies:
            tenant_policies = self.db.query(PasswordPolicy).filter(
                and_(
                    PasswordPolicy.tenant_id == tenant_id,
                    PasswordPolicy.scope_type == PolicyScopeType.TENANT,
                    PasswordPolicy.scope_id == tenant_id,
                    PasswordPolicy.status == PolicyStatus.ACTIVE,
                    PasswordPolicy.deleted_at.is_(None)
                )
            ).all()
            policies.extend(tenant_policies)
        
        return policies

    async def _get_department_inherited_policies(self, dept_id: str, tenant_id: str) -> List[PasswordPolicy]:
        """获取部门的继承策略（这里简化为部门直接归属组织）"""
        # 注：在当前架构中，部门被简化为组织的一个层级
        # 实际实现中可能需要根据具体的部门模型来调整
        return await self._get_organization_inherited_policies(dept_id, tenant_id)

    async def _get_organization_inherited_policies(self, org_id: str, tenant_id: str) -> List[PasswordPolicy]:
        """获取组织的继承策略"""
        from app.models.org_models import Organization
        
        policies = []
        
        # 1. 查找组织信息
        org = self.db.query(Organization).filter(
            and_(Organization.id == org_id, Organization.tenant_id == tenant_id)
        ).first()
        
        if org and org.parent_id:
            # 2. 查找父组织的策略
            parent_policies = self.db.query(PasswordPolicy).filter(
                and_(
                    PasswordPolicy.tenant_id == tenant_id,
                    PasswordPolicy.scope_type == PolicyScopeType.ORGANIZATION,
                    PasswordPolicy.scope_id == org.parent_id,
                    PasswordPolicy.status == PolicyStatus.ACTIVE,
                    PasswordPolicy.deleted_at.is_(None)
                )
            ).all()
            policies.extend(parent_policies)
            
            # 3. 递归查找更上级的组织策略
            if not parent_policies:
                policies.extend(await self._get_organization_inherited_policies(org.parent_id, tenant_id))
        
        # 4. 查找租户级策略作为最终兜底
        if not policies:
            tenant_policies = self.db.query(PasswordPolicy).filter(
                and_(
                    PasswordPolicy.tenant_id == tenant_id,
                    PasswordPolicy.scope_type == PolicyScopeType.TENANT,
                    PasswordPolicy.scope_id == tenant_id,
                    PasswordPolicy.status == PolicyStatus.ACTIVE,
                    PasswordPolicy.deleted_at.is_(None)
                )
            ).all()
            policies.extend(tenant_policies)
        
        return policies

    async def update_policy(self, policy: PasswordPolicy) -> PasswordPolicy:
        """更新密码策略"""
        policy.updated_at = datetime.utcnow()
        self.db.flush()
        return policy

    async def delete_policy(self, policy_id: str, tenant_id: str, deleted_by: str) -> bool:
        """软删除密码策略"""
        policy = await self.get_policy_by_id(policy_id, tenant_id)
        if policy:
            policy.deleted_at = datetime.utcnow()
            policy.updated_by = deleted_by
            self.db.flush()
            return True
        return False

    async def list_policies(
        self,
        tenant_id: str,
        scope_type: Optional[PolicyScopeType] = None,
        status: Optional[PolicyStatus] = None,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[PasswordPolicy]:
        """分页查询密码策略列表"""
        query = self.db.query(PasswordPolicy).filter(
            and_(
                PasswordPolicy.tenant_id == tenant_id,
                PasswordPolicy.deleted_at.is_(None)
            )
        )
        
        if scope_type:
            query = query.filter(PasswordPolicy.scope_type == scope_type)
        
        if status:
            query = query.filter(PasswordPolicy.status == status)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    PasswordPolicy.name.ilike(search_pattern),
                    PasswordPolicy.description.ilike(search_pattern),
                    PasswordPolicy.scope_name.ilike(search_pattern)
                )
            )
        
        return query.order_by(desc(PasswordPolicy.created_at)).offset(skip).limit(limit).all()

    async def count_policies(
        self,
        tenant_id: str,
        scope_type: Optional[PolicyScopeType] = None,
        status: Optional[PolicyStatus] = None,
        search: Optional[str] = None
    ) -> int:
        """统计密码策略数量"""
        query = self.db.query(func.count(PasswordPolicy.id)).filter(
            and_(
                PasswordPolicy.tenant_id == tenant_id,
                PasswordPolicy.deleted_at.is_(None)
            )
        )
        
        if scope_type:
            query = query.filter(PasswordPolicy.scope_type == scope_type)
        
        if status:
            query = query.filter(PasswordPolicy.status == status)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    PasswordPolicy.name.ilike(search_pattern),
                    PasswordPolicy.description.ilike(search_pattern),
                    PasswordPolicy.scope_name.ilike(search_pattern)
                )
            )
        
        return query.scalar() or 0

    async def get_child_policies(self, parent_policy_id: str, tenant_id: str) -> List[PasswordPolicy]:
        """获取子策略列表"""
        return self.db.query(PasswordPolicy).filter(
            and_(
                PasswordPolicy.parent_policy_id == parent_policy_id,
                PasswordPolicy.tenant_id == tenant_id,
                PasswordPolicy.deleted_at.is_(None)
            )
        ).all()

    async def check_policy_conflicts(
        self, 
        scope_type: PolicyScopeType, 
        scope_id: str, 
        tenant_id: str,
        exclude_policy_id: Optional[str] = None
    ) -> bool:
        """检查策略冲突"""
        query = self.db.query(PasswordPolicy).filter(
            and_(
                PasswordPolicy.tenant_id == tenant_id,
                PasswordPolicy.scope_type == scope_type,
                PasswordPolicy.scope_id == scope_id,
                PasswordPolicy.status == PolicyStatus.ACTIVE,
                PasswordPolicy.deleted_at.is_(None)
            )
        )
        
        if exclude_policy_id:
            query = query.filter(PasswordPolicy.id != exclude_policy_id)
        
        existing_policy = query.first()
        return existing_policy is not None


class PasswordPolicyRuleRepositoryImpl(IPasswordPolicyRuleRepository):
    """密码策略规则仓储实现"""

    def __init__(self, db: Session):
        self.db = db

    async def create_rule(self, rule: PasswordPolicyRule) -> PasswordPolicyRule:
        """创建策略规则"""
        self.db.add(rule)
        self.db.flush()
        return rule

    async def get_rules_by_policy(self, policy_id: str) -> List[PasswordPolicyRule]:
        """获取策略的所有规则"""
        return self.db.query(PasswordPolicyRule).filter(
            and_(
                PasswordPolicyRule.policy_id == policy_id,
                PasswordPolicyRule.is_active == True
            )
        ).order_by(PasswordPolicyRule.sort_order).all()

    async def update_rule(self, rule: PasswordPolicyRule) -> PasswordPolicyRule:
        """更新策略规则"""
        rule.updated_at = datetime.utcnow()
        self.db.flush()
        return rule

    async def delete_rule(self, rule_id: str) -> bool:
        """删除策略规则"""
        rule = self.db.query(PasswordPolicyRule).filter(
            PasswordPolicyRule.id == rule_id
        ).first()
        
        if rule:
            self.db.delete(rule)
            self.db.flush()
            return True
        return False

    async def batch_create_rules(self, rules: List[PasswordPolicyRule]) -> List[PasswordPolicyRule]:
        """批量创建策略规则"""
        self.db.add_all(rules)
        self.db.flush()
        return rules

    async def delete_rules_by_policy(self, policy_id: str) -> bool:
        """删除策略的所有规则"""
        deleted_count = self.db.query(PasswordPolicyRule).filter(
            PasswordPolicyRule.policy_id == policy_id
        ).delete()
        
        self.db.flush()
        return deleted_count > 0


class PasswordPolicyApplicationRepositoryImpl(IPasswordPolicyApplicationRepository):
    """密码策略应用仓储实现"""

    def __init__(self, db: Session):
        self.db = db

    async def create_application(self, application: PasswordPolicyApplication) -> PasswordPolicyApplication:
        """创建策略应用记录"""
        self.db.add(application)
        self.db.flush()
        return application

    async def get_applications_by_policy(self, policy_id: str) -> List[PasswordPolicyApplication]:
        """获取策略的应用记录"""
        return self.db.query(PasswordPolicyApplication).filter(
            PasswordPolicyApplication.policy_id == policy_id
        ).order_by(desc(PasswordPolicyApplication.applied_at)).all()

    async def get_applications_by_target(
        self, 
        target_type: str, 
        target_id: str, 
        tenant_id: str
    ) -> List[PasswordPolicyApplication]:
        """获取目标的策略应用记录"""
        return self.db.query(PasswordPolicyApplication).filter(
            and_(
                PasswordPolicyApplication.tenant_id == tenant_id,
                PasswordPolicyApplication.target_type == target_type,
                PasswordPolicyApplication.target_id == target_id
            )
        ).order_by(desc(PasswordPolicyApplication.applied_at)).all()

    async def update_application_status(
        self, 
        application_id: str, 
        status: str, 
        result: Optional[Dict[str, Any]] = None
    ) -> bool:
        """更新应用状态"""
        application = self.db.query(PasswordPolicyApplication).filter(
            PasswordPolicyApplication.id == application_id
        ).first()
        
        if application:
            application.status = status
            if result:
                application.application_result = result
            self.db.flush()
            return True
        return False

    async def get_active_applications(
        self,
        tenant_id: str,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None
    ) -> List[PasswordPolicyApplication]:
        """获取活跃的策略应用"""
        query = self.db.query(PasswordPolicyApplication).filter(
            and_(
                PasswordPolicyApplication.tenant_id == tenant_id,
                PasswordPolicyApplication.status == "active"
            )
        )
        
        if target_type:
            query = query.filter(PasswordPolicyApplication.target_type == target_type)
        
        if target_id:
            query = query.filter(PasswordPolicyApplication.target_id == target_id)
        
        return query.all()


class PasswordPolicyTemplateRepositoryImpl(IPasswordPolicyTemplateRepository):
    """密码策略模板仓储实现"""

    def __init__(self, db: Session):
        self.db = db

    async def create_template(self, template: PasswordPolicyTemplate) -> PasswordPolicyTemplate:
        """创建策略模板"""
        self.db.add(template)
        self.db.flush()
        return template

    async def get_template_by_id(self, template_id: str) -> Optional[PasswordPolicyTemplate]:
        """根据ID获取模板"""
        return self.db.query(PasswordPolicyTemplate).filter(
            PasswordPolicyTemplate.id == template_id
        ).first()

    async def list_templates(
        self,
        category: Optional[str] = None,
        is_public: bool = True,
        is_system: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[PasswordPolicyTemplate]:
        """分页查询模板列表"""
        query = self.db.query(PasswordPolicyTemplate)
        
        if category:
            query = query.filter(PasswordPolicyTemplate.category == category)
        
        if is_public is not None:
            query = query.filter(PasswordPolicyTemplate.is_public == is_public)
        
        if is_system is not None:
            query = query.filter(PasswordPolicyTemplate.is_system == is_system)
        
        return query.order_by(desc(PasswordPolicyTemplate.usage_count)).offset(skip).limit(limit).all()

    async def update_template(self, template: PasswordPolicyTemplate) -> PasswordPolicyTemplate:
        """更新模板"""
        template.updated_at = datetime.utcnow()
        self.db.flush()
        return template

    async def delete_template(self, template_id: str) -> bool:
        """删除模板"""
        template = self.db.query(PasswordPolicyTemplate).filter(
            PasswordPolicyTemplate.id == template_id
        ).first()
        
        if template:
            self.db.delete(template)
            self.db.flush()
            return True
        return False

    async def increment_usage_count(self, template_id: str) -> bool:
        """增加模板使用次数"""
        template = self.db.query(PasswordPolicyTemplate).filter(
            PasswordPolicyTemplate.id == template_id
        ).first()
        
        if template:
            template.usage_count = (template.usage_count or 0) + 1
            template.updated_at = datetime.utcnow()
            self.db.flush()
            return True
        return False

    async def get_popular_templates(self, limit: int = 10) -> List[PasswordPolicyTemplate]:
        """获取热门模板"""
        return self.db.query(PasswordPolicyTemplate).filter(
            PasswordPolicyTemplate.is_public == True
        ).order_by(desc(PasswordPolicyTemplate.usage_count)).limit(limit).all()