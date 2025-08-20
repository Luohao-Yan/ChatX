/**
 * 租户实体类型定义
 * 符合DDD原则的租户领域模型
 */

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
}

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
}