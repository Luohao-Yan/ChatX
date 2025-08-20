"""
密码策略仓储接口定义
遵循DDD原则，定义密码策略相关的数据访问接口
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.models.password_policy_models import (
    PasswordPolicy, PasswordPolicyRule, 
    PasswordPolicyApplication, PasswordPolicyTemplate,
    PolicyScopeType, PolicyStatus
)


class IPasswordPolicyRepository(ABC):
    """密码策略仓储接口"""

    @abstractmethod
    async def create_policy(self, policy: PasswordPolicy) -> PasswordPolicy:
        """创建密码策略"""
        pass

    @abstractmethod
    async def get_policy_by_id(self, policy_id: str, tenant_id: str = None) -> Optional[PasswordPolicy]:
        """根据ID获取密码策略"""
        pass

    @abstractmethod
    async def get_policies_by_scope(
        self, 
        scope_type: PolicyScopeType, 
        scope_id: str, 
        tenant_id: str,
        include_inherited: bool = True
    ) -> List[PasswordPolicy]:
        """根据作用域获取密码策略列表"""
        pass

    @abstractmethod
    async def get_effective_policy(
        self, 
        scope_type: PolicyScopeType, 
        scope_id: str, 
        tenant_id: str
    ) -> Optional[PasswordPolicy]:
        """获取特定作用域的有效密码策略（考虑继承）"""
        pass

    @abstractmethod
    async def update_policy(self, policy: PasswordPolicy) -> PasswordPolicy:
        """更新密码策略"""
        pass

    @abstractmethod
    async def delete_policy(self, policy_id: str, tenant_id: str, deleted_by: str) -> bool:
        """软删除密码策略"""
        pass

    @abstractmethod
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
        pass

    @abstractmethod
    async def count_policies(
        self,
        tenant_id: str,
        scope_type: Optional[PolicyScopeType] = None,
        status: Optional[PolicyStatus] = None,
        search: Optional[str] = None
    ) -> int:
        """统计密码策略数量"""
        pass

    @abstractmethod
    async def get_child_policies(self, parent_policy_id: str, tenant_id: str) -> List[PasswordPolicy]:
        """获取子策略列表"""
        pass

    @abstractmethod
    async def check_policy_conflicts(
        self, 
        scope_type: PolicyScopeType, 
        scope_id: str, 
        tenant_id: str,
        exclude_policy_id: Optional[str] = None
    ) -> bool:
        """检查策略冲突"""
        pass


class IPasswordPolicyRuleRepository(ABC):
    """密码策略规则仓储接口"""

    @abstractmethod
    async def create_rule(self, rule: PasswordPolicyRule) -> PasswordPolicyRule:
        """创建策略规则"""
        pass

    @abstractmethod
    async def get_rules_by_policy(self, policy_id: str) -> List[PasswordPolicyRule]:
        """获取策略的所有规则"""
        pass

    @abstractmethod
    async def update_rule(self, rule: PasswordPolicyRule) -> PasswordPolicyRule:
        """更新策略规则"""
        pass

    @abstractmethod
    async def delete_rule(self, rule_id: str) -> bool:
        """删除策略规则"""
        pass

    @abstractmethod
    async def batch_create_rules(self, rules: List[PasswordPolicyRule]) -> List[PasswordPolicyRule]:
        """批量创建策略规则"""
        pass

    @abstractmethod
    async def delete_rules_by_policy(self, policy_id: str) -> bool:
        """删除策略的所有规则"""
        pass


class IPasswordPolicyApplicationRepository(ABC):
    """密码策略应用仓储接口"""

    @abstractmethod
    async def create_application(self, application: PasswordPolicyApplication) -> PasswordPolicyApplication:
        """创建策略应用记录"""
        pass

    @abstractmethod
    async def get_applications_by_policy(self, policy_id: str) -> List[PasswordPolicyApplication]:
        """获取策略的应用记录"""
        pass

    @abstractmethod
    async def get_applications_by_target(
        self, 
        target_type: str, 
        target_id: str, 
        tenant_id: str
    ) -> List[PasswordPolicyApplication]:
        """获取目标的策略应用记录"""
        pass

    @abstractmethod
    async def update_application_status(
        self, 
        application_id: str, 
        status: str, 
        result: Optional[Dict[str, Any]] = None
    ) -> bool:
        """更新应用状态"""
        pass

    @abstractmethod
    async def get_active_applications(
        self,
        tenant_id: str,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None
    ) -> List[PasswordPolicyApplication]:
        """获取活跃的策略应用"""
        pass


class IPasswordPolicyTemplateRepository(ABC):
    """密码策略模板仓储接口"""

    @abstractmethod
    async def create_template(self, template: PasswordPolicyTemplate) -> PasswordPolicyTemplate:
        """创建策略模板"""
        pass

    @abstractmethod
    async def get_template_by_id(self, template_id: str) -> Optional[PasswordPolicyTemplate]:
        """根据ID获取模板"""
        pass

    @abstractmethod
    async def list_templates(
        self,
        category: Optional[str] = None,
        is_public: bool = True,
        is_system: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[PasswordPolicyTemplate]:
        """分页查询模板列表"""
        pass

    @abstractmethod
    async def update_template(self, template: PasswordPolicyTemplate) -> PasswordPolicyTemplate:
        """更新模板"""
        pass

    @abstractmethod
    async def delete_template(self, template_id: str) -> bool:
        """删除模板"""
        pass

    @abstractmethod
    async def increment_usage_count(self, template_id: str) -> bool:
        """增加模板使用次数"""
        pass

    @abstractmethod
    async def get_popular_templates(self, limit: int = 10) -> List[PasswordPolicyTemplate]:
        """获取热门模板"""
        pass