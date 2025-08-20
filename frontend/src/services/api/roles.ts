/**
 * 角色管理API服务
 */

import { http } from '../http'

// 角色相关类型定义
export interface Role {
  id: string
  tenant_id: string
  name: string
  display_name?: string
  description?: string
  level: number
  is_system: boolean
  is_active: boolean
  permissions: string[]
  created_at: string
  updated_at?: string
}

export interface RoleCreate {
  name: string
  display_name?: string
  description?: string
  level?: number
  permissions?: string[]
}

export interface RoleUpdate {
  name?: string
  display_name?: string
  description?: string
  level?: number
  permissions?: string[]
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
    const response = await http.post(this.baseURL, data)
    return response.data as Role
  }

  /**
   * 获取角色列表
   */
  async getRoles(includeDeleted: boolean = false): Promise<Role[]> {
    const response = await http.get(this.baseURL, { 
      params: { include_deleted: includeDeleted } 
    })
    return response.data as Role[]
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
}

// 导出单例实例
export const roleAPI = new RoleAPI()

// 为了向后兼容，也导出一些常用方法
export const {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
  getRoleHierarchy
} = roleAPI