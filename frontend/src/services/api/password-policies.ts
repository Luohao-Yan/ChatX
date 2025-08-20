/**
 * 密码策略管理API服务
 */

import { http } from '../http'

// 密码策略相关类型定义
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
  rules: Record<string, any>
  created_by: string
  created_by_name?: string
  updated_by?: string
  updated_by_name?: string
  created_at: string
  updated_at?: string
}

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

export interface PasswordPolicyCreate {
  name: string
  description?: string
  scope_type: PolicyScopeType
  scope_id: string
  scope_name: string
  rules: Record<string, any>
  parent_policy_id?: string
  override_parent?: boolean
}

export interface PasswordPolicyUpdate {
  name?: string
  description?: string
  rules?: Record<string, any>
  status?: PolicyStatus
}

export interface PasswordPolicyListResponse {
  items: PasswordPolicy[]
  total: number
  skip: number
  limit: number
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

export interface PasswordPolicyTemplate {
  id: string
  name: string
  description?: string
  category?: string
  template_rules: Record<string, any>
  is_system: boolean
  is_public: boolean
  usage_count: number
  applicable_scopes?: string[]
  created_by?: string
  created_by_name?: string
  created_at: string
}

/**
 * 密码策略管理API类
 */
export class PasswordPolicyAPI {
  private baseURL = '/v1/password-policies'

  /**
   * 创建密码策略
   */
  async createPolicy(data: PasswordPolicyCreate): Promise<PasswordPolicy> {
    const response = await http.post(this.baseURL, data)
    return response.data as PasswordPolicy
  }

  /**
   * 获取密码策略列表
   */
  async getPolicies(params?: {
    scope_type?: PolicyScopeType
    status?: PolicyStatus
    search?: string
    skip?: number
    limit?: number
  }): Promise<PasswordPolicyListResponse> {
    const response = await http.get(this.baseURL, { params })
    return response.data as PasswordPolicyListResponse
  }

  /**
   * 获取密码策略详情
   */
  async getPolicy(policyId: string): Promise<PasswordPolicy> {
    const response = await http.get(`${this.baseURL}/${policyId}`)
    return response.data as PasswordPolicy
  }

  /**
   * 更新密码策略
   */
  async updatePolicy(policyId: string, data: PasswordPolicyUpdate): Promise<PasswordPolicy> {
    const response = await http.put(`${this.baseURL}/${policyId}`, data)
    return response.data as PasswordPolicy
  }

  /**
   * 删除密码策略
   */
  async deletePolicy(policyId: string): Promise<{ message: string }> {
    const response = await http.delete(`${this.baseURL}/${policyId}`)
    return response.data as { message: string }
  }

  /**
   * 验证密码
   */
  async validatePassword(data: PasswordValidationRequest): Promise<PasswordValidationResponse> {
    const response = await http.post(`${this.baseURL}/validate`, data)
    return response.data as PasswordValidationResponse
  }

  /**
   * 获取有效策略
   */
  async getEffectivePolicy(scopeType: PolicyScopeType, scopeId: string): Promise<PasswordPolicy | null> {
    const response = await http.get(`${this.baseURL}/scope/${scopeType}/${scopeId}/effective`)
    return response.data as PasswordPolicy | null
  }

  /**
   * 从模板创建策略
   */
  async createFromTemplate(templateId: string, data: PasswordPolicyCreate): Promise<PasswordPolicy> {
    const response = await http.post(`${this.baseURL}/from-template/${templateId}`, data)
    return response.data as PasswordPolicy
  }

  /**
   * 获取策略模板列表
   */
  async getTemplates(params?: {
    category?: string
    is_system?: boolean
    limit?: number
  }): Promise<PasswordPolicyTemplate[]> {
    const response = await http.get(`${this.baseURL}/templates`, { params })
    return response.data as PasswordPolicyTemplate[]
  }

  /**
   * 获取热门模板
   */
  async getPopularTemplates(limit: number = 10): Promise<PasswordPolicyTemplate[]> {
    const response = await http.get(`${this.baseURL}/templates/popular`, { 
      params: { limit } 
    })
    return response.data as PasswordPolicyTemplate[]
  }

  /**
   * 获取模板详情
   */
  async getTemplate(templateId: string): Promise<PasswordPolicyTemplate> {
    const response = await http.get(`${this.baseURL}/templates/${templateId}`)
    return response.data as PasswordPolicyTemplate
  }
}

// 导出单例实例
export const passwordPolicyAPI = new PasswordPolicyAPI()

// 为了向后兼容，也导出一些常用方法
export const {
  createPolicy,
  getPolicies,
  getPolicy,
  updatePolicy,
  deletePolicy,
  validatePassword,
  getEffectivePolicy,
  createFromTemplate,
  getTemplates,
  getPopularTemplates,
  getTemplate
} = passwordPolicyAPI