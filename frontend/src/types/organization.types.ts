/**
 * Organization Domain Types
 * 组织管理领域类型定义 - 全局Domain Layer
 */

import { Organization } from '@/services/api/organization'
import { Tenant } from '@/services/api/tenants'

// 组织统计信息
export interface OrganizationStats {
  totalOrganizations: number
  departmentCount: number
  teamCount: number
  totalMembers: number
}

// 组织树节点（用于UI展示）
export interface OrganizationTreeNode extends Organization {
  children?: OrganizationTreeNode[]
  expanded?: boolean
}

// 组织管理上下文
export interface OrganizationManagementContext {
  currentTenantInfo: Tenant | null
  availableTenants: Tenant[]
  organizations: Organization[]
  loading: boolean
  searchQuery: string
}

// 组织操作类型
export type OrganizationAction = 
  | 'create'
  | 'edit' 
  | 'delete'
  | 'view'

// 权限配置
export interface OrganizationPermissions {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canManageAllTenants: boolean
}