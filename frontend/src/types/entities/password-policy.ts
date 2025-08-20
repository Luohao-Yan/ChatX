/**
 * 密码策略相关类型定义
 */

export enum PolicyScopeType {
  TENANT = 'tenant',
  ORGANIZATION = 'organization', 
  DEPARTMENT = 'department',
  TEAM = 'team'
}

export enum PolicyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export interface PasswordPolicyRules {
  min_length: number
  max_length?: number
  require_uppercase?: boolean
  require_lowercase?: boolean
  require_digits?: boolean
  require_special?: boolean
  min_character_types?: number
  forbid_user_info?: boolean
  forbid_common?: boolean
}

export interface PasswordPolicy {
  id: string
  tenant_id: string
  name: string
  description?: string
  status: PolicyStatus
  scope_type: PolicyScopeType
  scope_id: string
  scope_name?: string
  parent_policy_id?: string
  is_inherited: boolean
  override_parent: boolean
  rules: PasswordPolicyRules
  created_by: string
  created_by_name?: string
  updated_by?: string
  updated_by_name?: string
  created_at: string
  updated_at?: string
}

export interface PasswordPolicyCreate {
  name: string
  description?: string
  scope_type: PolicyScopeType
  scope_id: string
  scope_name: string
  rules: PasswordPolicyRules
  parent_policy_id?: string
  override_parent?: boolean
}

export interface PasswordPolicyUpdate {
  name?: string
  description?: string
  rules?: Partial<PasswordPolicyRules>
  status?: PolicyStatus
}

export interface PasswordPolicyTemplate {
  id: string
  name: string
  description?: string
  category?: string
  template_rules: PasswordPolicyRules
  is_system: boolean
  is_public: boolean
  usage_count: number
  applicable_scopes?: PolicyScopeType[]
  created_by?: string
  created_by_name?: string
  created_at: string
}

export interface PasswordValidationRequest {
  password: string
  scope_type: PolicyScopeType
  scope_id: string
  user_info?: Record<string, string>
}

export interface PasswordValidationResponse {
  is_valid: boolean
  errors: string[]
  policy_applied: boolean
}

export interface PasswordPolicyListResponse {
  items: PasswordPolicy[]
  total: number
  skip: number
  limit: number
}