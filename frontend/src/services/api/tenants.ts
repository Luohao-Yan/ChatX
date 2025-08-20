/**
 * 租户管理API服务
 * 符合DDD原则的租户领域服务
 */

import { http } from '../http'

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  EXPIRED = 'expired'
}

export interface TenantSettings {
  allow_self_registration: boolean
  user_type: 'individual' | 'enterprise' | 'system'
  is_system_tenant?: boolean
  max_users: number
  features: string[]
}

export interface TenantLimits {
  max_file_size_mb: number
  max_storage_gb: number
  max_users: number
  max_organizations?: number
  max_departments?: number
}

export interface Tenant {
  id: string
  name: string
  display_name: string
  schema_name: string
  description?: string
  owner_id: string
  status: TenantStatus
  is_active: boolean
  slug: string
  settings: TenantSettings
  features: string[]
  limits: TenantLimits
  created_at: string
  updated_at: string
  deleted_at?: string
  // 统计信息（可选）
  user_count?: number
  org_count?: number
  storage_used?: string
}

export interface TenantCreate {
  name: string
  display_name: string
  description?: string
  owner_id: string
  slug: string
  settings: Partial<TenantSettings>
  features: string[]
  limits: Partial<TenantLimits>
}

export interface TenantUpdate {
  display_name?: string
  description?: string
  status?: TenantStatus
  is_active?: boolean
  settings?: Partial<TenantSettings>
  features?: string[]
  limits?: Partial<TenantLimits>
}

export interface TenantStats {
  total_users: number
  active_users: number
  total_organizations: number
  total_departments: number
  storage_used_gb: number
  storage_limit_gb: number
}

export interface TenantListParams {
  skip?: number
  limit?: number
  search?: string
  status?: TenantStatus
  is_active?: boolean
  [key: string]: string | number | boolean | undefined
}

export interface BatchOperationResult {
  message: string
  success_count: number
  failed_count: number
}

export interface TenantBackupCreate {
  backup_name?: string
  description?: string
}

export interface TenantBackup {
  id: string
  source_tenant_id: string
  backup_tenant_id: string
  backup_name: string
  version: number
  description?: string
  backup_type: string
  users_count: number
  orgs_count: number
  files_count: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  is_active: boolean
  created_by: string
  created_at: string
  completed_at?: string
}

/**
 * 租户管理API类 - 符合DDD原则的领域服务
 */
export class TenantAPI {
  private baseURL = '/v1/tenants'

  /**
   * 获取租户列表（仅超级管理员）
   */
  async getTenants(params?: TenantListParams): Promise<Tenant[]> {
    const response = await http.get(this.baseURL, { params })
    return response.data as Tenant[]
  }

  /**
   * 根据ID获取租户详情
   */
  async getTenant(tenantId: string): Promise<Tenant> {
    const response = await http.get(`${this.baseURL}/${tenantId}`)
    return response.data as Tenant
  }

  /**
   * 创建新租户
   */
  async createTenant(data: TenantCreate): Promise<Tenant> {
    const response = await http.post(this.baseURL, data)
    return response.data as Tenant
  }

  /**
   * 更新租户信息
   */
  async updateTenant(tenantId: string, data: TenantUpdate): Promise<Tenant> {
    const response = await http.put(`${this.baseURL}/${tenantId}`, data)
    return response.data as Tenant
  }

  /**
   * 删除租户（软删除）
   */
  async deleteTenant(tenantId: string): Promise<{ message: string }> {
    const response = await http.delete(`${this.baseURL}/${tenantId}`)
    return response.data as { message: string }
  }

  /**
   * 获取租户统计信息
   */
  async getTenantStats(tenantId: string): Promise<TenantStats> {
    const response = await http.get(`${this.baseURL}/${tenantId}/stats`)
    return response.data as TenantStats
  }

  /**
   * 激活租户
   */
  async activateTenant(tenantId: string): Promise<Tenant> {
    const response = await http.post(`${this.baseURL}/${tenantId}/activate`)
    return response.data as Tenant
  }

  /**
   * 停用租户
   */
  async deactivateTenant(tenantId: string): Promise<Tenant> {
    const response = await http.post(`${this.baseURL}/${tenantId}/deactivate`)
    return response.data as Tenant
  }

  /**
   * 批量更新租户
   */
  async batchUpdateTenants(
    tenantIds: string[], 
    updateData: Partial<TenantUpdate>
  ): Promise<BatchOperationResult> {
    const response = await http.patch(`${this.baseURL}/batch`, {
      tenant_ids: tenantIds,
      ...updateData
    })
    return response.data as BatchOperationResult
  }

  /**
   * 获取可用的租户功能列表
   */
  async getAvailableFeatures(): Promise<string[]> {
    const response = await http.get(`${this.baseURL}/features`)
    return response.data as string[]
  }

  /**
   * 重置租户数据（危险操作）
   */
  async resetTenantData(tenantId: string): Promise<BatchOperationResult> {
    const response = await http.post(`${this.baseURL}/${tenantId}/reset`)
    return response.data as BatchOperationResult
  }

  /**
   * 备份租户
   */
  async backupTenant(tenantId: string, data: TenantBackupCreate): Promise<TenantBackup> {
    const response = await http.post(`${this.baseURL}/${tenantId}/backup`, data)
    return response.data as TenantBackup
  }

  /**
   * 获取租户备份列表
   */
  async getTenantBackups(tenantId: string): Promise<TenantBackup[]> {
    const response = await http.get(`${this.baseURL}/${tenantId}/backups`)
    return response.data as TenantBackup[]
  }

  /**
   * 从租户中移除用户（将用户从当前租户移动到其他租户）
   */
  async removeTenantUser(tenantId: string, userId: string): Promise<{ message: string }> {
    const response = await http.delete(`${this.baseURL}/${tenantId}/users/${userId}`)
    return response.data as { message: string }
  }

  /**
   * 添加用户到租户
   */
  async addTenantUser(tenantId: string, data: { user_id: string; role?: string }): Promise<{ message: string }> {
    const response = await http.post(`${this.baseURL}/${tenantId}/users`, data)
    return response.data as { message: string }
  }

  /**
   * 获取租户用户列表
   */
  async getTenantUsers(tenantId: string): Promise<any[]> {
    const response = await http.get(`${this.baseURL}/${tenantId}/users`)
    return response.data as any[]
  }

  /**
   * 将用户移动到其他租户
   */
  async moveUserToTenant(userId: string, fromTenantId: string, toTenantId: string, role?: string): Promise<{ message: string }> {
    const response = await http.post(`${this.baseURL}/move-user`, {
      user_id: userId,
      from_tenant_id: fromTenantId,
      to_tenant_id: toTenantId,
      role: role || 'member'
    })
    return response.data as { message: string }
  }
}

// 导出单例实例
export const tenantAPI = new TenantAPI()

// 为了向后兼容，也导出一些常用方法
export const {
  createTenant,
  getTenants,
  getTenant,
  updateTenant,
  deleteTenant
} = tenantAPI