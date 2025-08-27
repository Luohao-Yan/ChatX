/**
 * 组织管理API服务
 */

import { http } from '../http/index'

// 组织相关类型定义
export interface Organization {
  id: string
  tenant_id: string
  name: string
  display_name?: string
  description?: string
  logo_url?: string
  owner_id: string
  parent_id?: string
  path: string
  level: number
  priority: number
  is_active: boolean
  member_count: number
  settings?: Record<string, unknown>
  created_at: string
  updated_at?: string
  deleted_at?: string
}

export interface OrganizationCreate {
  name: string
  display_name?: string
  description?: string
  logo_url?: string
  parent_id?: string
  priority?: number
  settings?: Record<string, unknown>
}

export interface OrganizationUpdate {
  name?: string
  display_name?: string
  description?: string
  logo_url?: string
  parent_id?: string
  priority?: number
  settings?: Record<string, unknown>
  is_active?: boolean
}

export interface Team {
  id: string
  tenant_id: string
  organization_id: string
  name: string
  description?: string
  creator_id: string
  parent_id?: string
  path: string
  level: number
  is_active: boolean
  member_count: number
  settings?: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export interface TeamCreate {
  name: string
  description?: string
  organization_id: string
  parent_id?: string
  settings?: Record<string, unknown>
}

export interface OrganizationTreeNode {
  id: string
  name: string
  display_name?: string
  description?: string
  level: number
  member_count: number
  is_active: boolean
  children: OrganizationTreeNode[]
}

export interface OrganizationStats {
  total_organizations: number
  total_teams: number
  total_members: number
  active_organizations: number
  organization_levels: number
}

export interface ListParams {
  skip?: number
  limit?: number
  parent_id?: string
  search?: string
  [key: string]: string | number | undefined
}

export interface TeamListParams {
  organization_id?: string
  skip?: number
  limit?: number
  [key: string]: string | number | undefined
}

export interface UserOrganizationCreate {
  user_id: string
  organization_id: string
  role?: string
  permissions?: Record<string, unknown>
  is_admin?: boolean
}

/**
 * 组织管理API类
 */
export class OrganizationAPI {
  private baseURL = '/v1/org'

  // ==================== 组织管理 ====================

  /**
   * 创建组织
   */
  async createOrganization(data: OrganizationCreate): Promise<Organization> {
    const response = await http.post<Organization>(`${this.baseURL}/organizations`, data)
    return response.data
  }

  /**
   * 获取组织列表
   */
  async getOrganizations(params: ListParams = {}): Promise<Organization[]> {
    const response = await http.get<Organization[]>(`${this.baseURL}/organizations`, { params })
    return response.data
  }

  /**
   * 获取组织详情
   */
  async getOrganization(orgId: string): Promise<Organization> {
    const response = await http.get<Organization>(`${this.baseURL}/organizations/${orgId}`)
    return response.data
  }

  /**
   * 更新组织
   */
  async updateOrganization(orgId: string, data: OrganizationUpdate): Promise<Organization> {
    const response = await http.put<Organization>(`${this.baseURL}/organizations/${orgId}`, data)
    return response.data
  }

  /**
   * 删除组织
   */
  async deleteOrganization(orgId: string): Promise<{ message: string }> {
    const response = await http.delete<{ message: string }>(`${this.baseURL}/organizations/${orgId}`)
    return response.data
  }

  /**
   * 获取组织树结构
   */
  async getOrganizationTree(rootId?: string): Promise<OrganizationTreeNode[]> {
    const params = rootId ? { root_id: rootId } : {}
    const response = await http.get<OrganizationTreeNode[]>(`${this.baseURL}/organizations/tree`, { params })
    return response.data
  }

  /**
   * 获取组织统计信息
   */
  async getOrganizationStats(): Promise<OrganizationStats> {
    const response = await http.get<OrganizationStats>(`${this.baseURL}/organizations/stats`)
    return response.data
  }

  // ==================== 回收站管理 ====================

  /**
   * 获取已删除的组织列表
   */
  async getDeletedOrganizations(params: ListParams = {}): Promise<Organization[]> {
    const response = await http.get<Organization[]>(`${this.baseURL}/organizations/recycle-bin`, { params })
    return response.data
  }

  /**
   * 恢复组织
   */
  async restoreOrganization(orgId: string): Promise<{ message: string }> {
    const response = await http.post<{ message: string }>(`${this.baseURL}/organizations/${orgId}/restore`)
    return response.data
  }

  /**
   * 永久删除组织
   */
  async permanentlyDeleteOrganization(orgId: string): Promise<{ message: string }> {
    const response = await http.delete<{ message: string }>(`${this.baseURL}/organizations/${orgId}/permanent`)
    return response.data
  }

  /**
   * 移动组织
   */
  async moveOrganization(orgId: string, newParentId?: string): Promise<Organization> {
    const response = await http.put<Organization>(`${this.baseURL}/organizations/${orgId}/move`, {
      new_parent_id: newParentId
    })
    return response.data
  }

  // ==================== 团队管理 ====================

  /**
   * 创建团队
   */
  async createTeam(data: TeamCreate): Promise<Team> {
    const response = await http.post<Team>(`${this.baseURL}/teams`, data)
    return response.data
  }

  /**
   * 获取团队列表
   */
  async getTeams(params: TeamListParams = {}): Promise<Team[]> {
    const response = await http.get<Team[]>(`${this.baseURL}/teams`, { params })
    return response.data
  }

  // ==================== 成员管理 ====================

  /**
   * 添加用户到组织
   */
  async addUserToOrganization(orgId: string, data: Omit<UserOrganizationCreate, 'organization_id'>): Promise<{ message: string }> {
    const response = await http.post<{ message: string }>(`${this.baseURL}/organizations/${orgId}/members`, {
      ...data,
      organization_id: orgId
    })
    return response.data
  }
}

// 导出单例实例
export const organizationAPI = new OrganizationAPI()

// 为了向后兼容，也导出一些常用方法
export const {
  createOrganization,
  getOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationTree,
  getOrganizationStats,
  getDeletedOrganizations,
  restoreOrganization,
  permanentlyDeleteOrganization,
  moveOrganization,
  createTeam,
  getTeams,
  addUserToOrganization
} = organizationAPI