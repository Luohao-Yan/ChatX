"""
密码策略相关的Pydantic模型
用于API请求和响应的数据验证
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models.password_policy_models import PolicyScopeType, PolicyStatus


class PasswordPolicyRules(BaseModel):
    """密码策略规则配置"""
    min_length: int = Field(8, ge=1, le=128, description="最小长度")
    max_length: Optional[int] = Field(None, ge=1, le=128, description="最大长度")
    require_uppercase: bool = Field(False, description="必须包含大写字母")
    require_lowercase: bool = Field(False, description="必须包含小写字母")
    require_digits: bool = Field(False, description="必须包含数字")
    require_special: bool = Field(False, description="必须包含特殊字符")
    min_character_types: Optional[int] = Field(None, ge=1, le=4, description="最少字符类型数")
    forbid_user_info: bool = Field(False, description="禁止包含用户信息")
    forbid_common: bool = Field(False, description="禁止常见密码")
    
    @field_validator('max_length')
    @classmethod
    def validate_max_length(cls, v, info):
        if v is not None and info.data.get('min_length') and v < info.data['min_length']:
            raise ValueError('最大长度不能小于最小长度')
        return v


class PasswordPolicyCreate(BaseModel):
    """创建密码策略请求"""
    name: str = Field(..., min_length=1, max_length=100, description="策略名称")
    description: Optional[str] = Field(None, max_length=500, description="策略描述")
    scope_type: PolicyScopeType = Field(..., description="策略作用域类型")
    scope_id: str = Field(..., min_length=1, max_length=50, description="作用域ID")
    scope_name: str = Field(..., min_length=1, max_length=100, description="作用域名称")
    rules: Dict[str, Any] = Field(..., description="密码策略规则")
    parent_policy_id: Optional[str] = Field(None, description="父级策略ID")
    override_parent: bool = Field(False, description="是否覆盖父级策略")
    
    @field_validator('rules')
    @classmethod
    def validate_rules(cls, v):
        # 验证必需的规则字段
        if 'min_length' not in v:
            raise ValueError('缺少必需的规则: min_length')
        
        # 验证规则值的合理性
        if v.get('min_length', 0) < 1:
            raise ValueError('最小长度必须大于0')
        
        if v.get('max_length') and v.get('max_length') < v.get('min_length', 1):
            raise ValueError('最大长度不能小于最小长度')
        
        return v


class PasswordPolicyUpdate(BaseModel):
    """更新密码策略请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="策略名称")
    description: Optional[str] = Field(None, max_length=500, description="策略描述")
    rules: Optional[Dict[str, Any]] = Field(None, description="密码策略规则")
    status: Optional[PolicyStatus] = Field(None, description="策略状态")
    
    @field_validator('rules')
    @classmethod
    def validate_rules(cls, v):
        if v is not None:
            if 'min_length' in v and v['min_length'] < 1:
                raise ValueError('最小长度必须大于0')
            
            if v.get('max_length') and v.get('min_length') and v['max_length'] < v['min_length']:
                raise ValueError('最大长度不能小于最小长度')
        
        return v


class PasswordPolicyResponse(BaseModel):
    """密码策略响应"""
    id: str = Field(..., description="策略ID")
    tenant_id: str = Field(..., description="租户ID")
    name: str = Field(..., description="策略名称")
    description: Optional[str] = Field(None, description="策略描述")
    status: PolicyStatus = Field(..., description="策略状态")
    scope_type: PolicyScopeType = Field(..., description="策略作用域类型")
    scope_id: str = Field(..., description="作用域ID")
    scope_name: Optional[str] = Field(None, description="作用域名称")
    parent_policy_id: Optional[str] = Field(None, description="父级策略ID")
    is_inherited: bool = Field(..., description="是否启用继承")
    override_parent: bool = Field(..., description="是否覆盖父级策略")
    rules: Dict[str, Any] = Field(..., description="密码策略规则")
    created_by: str = Field(..., description="创建者ID")
    created_by_name: Optional[str] = Field(None, description="创建者姓名")
    updated_by: Optional[str] = Field(None, description="最后修改者ID")
    updated_by_name: Optional[str] = Field(None, description="最后修改者姓名")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: Optional[datetime] = Field(None, description="更新时间")
    
    model_config = ConfigDict(from_attributes=True)


class PasswordPolicyListResponse(BaseModel):
    """密码策略列表响应"""
    items: List[PasswordPolicyResponse] = Field(..., description="策略列表")
    total: int = Field(..., description="总数量")
    skip: int = Field(..., description="跳过条数")
    limit: int = Field(..., description="每页条数")


class PasswordValidationRequest(BaseModel):
    """密码验证请求"""
    password: str = Field(..., min_length=1, description="待验证的密码")
    scope_type: PolicyScopeType = Field(..., description="策略作用域类型")
    scope_id: str = Field(..., description="作用域ID")
    user_info: Optional[Dict[str, str]] = Field(None, description="用户信息（用于检查是否包含用户相关信息）")


class PasswordValidationResponse(BaseModel):
    """密码验证响应"""
    is_valid: bool = Field(..., description="是否有效")
    errors: List[str] = Field(..., description="验证错误信息")
    policy_applied: bool = Field(..., description="是否应用了策略")


class PasswordPolicyRuleResponse(BaseModel):
    """密码策略规则响应"""
    id: str = Field(..., description="规则ID")
    policy_id: str = Field(..., description="策略ID")
    rule_type: str = Field(..., description="规则类型")
    rule_name: str = Field(..., description="规则名称")
    rule_value: Optional[str] = Field(None, description="规则值")
    is_required: bool = Field(..., description="是否必须")
    error_message: Optional[str] = Field(None, description="错误消息")
    sort_order: int = Field(..., description="排序")
    is_active: bool = Field(..., description="是否启用")
    
    model_config = ConfigDict(from_attributes=True)


class PasswordPolicyTemplateResponse(BaseModel):
    """密码策略模板响应"""
    id: str = Field(..., description="模板ID")
    name: str = Field(..., description="模板名称")
    description: Optional[str] = Field(None, description="模板描述")
    category: Optional[str] = Field(None, description="模板分类")
    template_rules: Dict[str, Any] = Field(..., description="模板规则配置")
    is_system: bool = Field(..., description="是否系统内置模板")
    is_public: bool = Field(..., description="是否公开模板")
    usage_count: int = Field(..., description="使用次数")
    applicable_scopes: Optional[List[str]] = Field(None, description="适用的作用域类型")
    created_by: Optional[str] = Field(None, description="创建者ID")
    created_by_name: Optional[str] = Field(None, description="创建者姓名")
    created_at: datetime = Field(..., description="创建时间")
    
    model_config = ConfigDict(from_attributes=True)


class PasswordPolicyApplicationResponse(BaseModel):
    """密码策略应用记录响应"""
    id: str = Field(..., description="应用记录ID")
    tenant_id: str = Field(..., description="租户ID")
    policy_id: str = Field(..., description="策略ID")
    policy_name: str = Field(..., description="策略名称")
    target_type: str = Field(..., description="应用目标类型")
    target_id: str = Field(..., description="应用目标ID")
    target_name: Optional[str] = Field(None, description="应用目标名称")
    status: str = Field(..., description="应用状态")
    applied_at: datetime = Field(..., description="应用时间")
    applied_by: str = Field(..., description="应用者ID")
    applied_by_name: Optional[str] = Field(None, description="应用者姓名")
    effective_from: Optional[datetime] = Field(None, description="生效开始时间")
    effective_to: Optional[datetime] = Field(None, description="生效结束时间")
    application_result: Optional[Dict[str, Any]] = Field(None, description="应用结果详情")
    
    model_config = ConfigDict(from_attributes=True)


class PasswordPolicyStatsResponse(BaseModel):
    """密码策略统计响应"""
    total_policies: int = Field(..., description="策略总数")
    active_policies: int = Field(..., description="活跃策略数")
    inactive_policies: int = Field(..., description="停用策略数")
    draft_policies: int = Field(..., description="草稿策略数")
    policies_by_scope: Dict[str, int] = Field(..., description="按作用域分组的策略数量")
    recent_policies: List[PasswordPolicyResponse] = Field(..., description="最近创建的策略")


class PasswordStrengthResponse(BaseModel):
    """密码强度评估响应"""
    score: int = Field(..., ge=0, le=100, description="密码强度评分(0-100)")
    level: str = Field(..., description="强度等级(weak/medium/strong/very_strong)")
    suggestions: List[str] = Field(..., description="改进建议")
    meets_policy: bool = Field(..., description="是否满足策略要求")
    time_to_crack: Optional[str] = Field(None, description="预估破解时间")