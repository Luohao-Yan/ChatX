/**
 * 角色管理API服务
 */

import { http } from '../http'

// 角色相关类型定义
export interface Role {
  id: string
  tenant_id: string
  name: string
  display_name: string
  description?: string
  role_type: string
  level: number
  parent_id?: string
  max_users?: number
  is_active: boolean
  is_system: boolean
  is_default: boolean
  created_at: string
  updated_at?: string
}

// 权限相关类型定义
export interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource_type?: string
  action?: string
  category?: string
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface RoleCreate {
  name: string
  display_name: string
  description?: string
  role_type?: string
  level?: number
  parent_id?: string
  max_users?: number
}

export interface RoleUpdate {
  display_name?: string
  description?: string
  level?: number
  max_users?: number
  is_active?: boolean
}

/**
 * 角色管理API类
 */
export class RoleAPI {
  private baseURL = '/v1/roles'

  /**
   * 创建角色
   */
  async createRole(data: RoleCreate): Promise<Role> {
    const response = await http.post(`${this.baseURL}/`, data)
    return response.data as Role
  }

  /**
   * 获取角色列表
   */
  async getRoles(includeDeleted: boolean = false): Promise<Role[]> {
    try {
      const response = await http.get(`${this.baseURL}/`, {
        params: { include_deleted: includeDeleted }
      })
      return response.data as Role[]
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      throw error
    }
  }

  /**
   * 获取带统计信息的角色列表
   */
  async getRolesWithStats(includeDeleted: boolean = false): Promise<any[]> {
    try {
      const response = await http.get(`${this.baseURL}/with-stats`, {
        params: { include_deleted: includeDeleted }
      })
      return response.data
    } catch (error) {
      console.error('Failed to fetch roles with stats:', error)
      throw error
    }
  }

  /**
   * 获取角色详情
   */
  async getRole(roleId: string): Promise<Role> {
    const response = await http.get(`${this.baseURL}/${roleId}`)
    return response.data as Role
  }

  /**
   * 更新角色
   */
  async updateRole(roleId: string, data: RoleUpdate): Promise<Role> {
    const response = await http.put(`${this.baseURL}/${roleId}`, data)
    return response.data as Role
  }

  /**
   * 删除角色
   */
  async deleteRole(roleId: string): Promise<{ message: string }> {
    const response = await http.delete(`${this.baseURL}/${roleId}`)
    return response.data as { message: string }
  }

  /**
   * 获取角色层级结构
   */
  async getRoleHierarchy(): Promise<any> {
    const response = await http.get(`${this.baseURL}/hierarchy`)
    return response.data
  }

  /**
   * 获取所有可用权限
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const response = await http.get('/v1/permissions')
      return response.data as Permission[]
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
      throw error
    }
  }

  /**
   * 获取角色的权限列表
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const response = await http.get(`${this.baseURL}/${roleId}/permissions`)
      return response.data as Permission[]
    } catch (error) {
      console.error('Failed to fetch role permissions:', error)
      throw error
    }
  }

  /**
   * 获取角色的用户列表
   */
  async getRoleUsers(roleId: string): Promise<any[]> {
    try {
      const response = await http.get(`${this.baseURL}/${roleId}/users`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch role users:', error)
      throw error
    }
  }

  /**
   * 分配权限给角色
   */
  async assignRolePermissions(roleId: string, permissionIds: string[]): Promise<{ message: string }> {
    const response = await http.post(`${this.baseURL}/${roleId}/permissions`, {
      permission_ids: permissionIds
    })
    return response.data
  }

  /**
   * 撤销角色权限
   */
  async revokeRolePermission(roleId: string, permissionId: string): Promise<{ message: string }> {
    const response = await http.delete(`${this.baseURL}/${roleId}/permissions/${permissionId}`)
    return response.data
  }
}

// 导出单例实例
export const roleAPI = new RoleAPI()

// 为了向后兼容，也导出一些常用方法
export const {
  createRole,
  getRoles,
  getRolesWithStats,
  getRole,
  updateRole,
  deleteRole,
  getRoleHierarchy,
  getAllPermissions,
  getRolePermissions,
  getRoleUsers,
  assignRolePermissions,
  revokeRolePermission
} = roleAPI