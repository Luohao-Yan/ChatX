/**
 * 用户管理API服务
 * 与其他API服务保持一致的组织结构
 */

import { http } from '../http'
import { User } from '@/types/entities/user'

// ==================== 类型定义 ====================

export interface UsersApiParams {
  skip?: number
  limit?: number
  search?: string
  organization_id?: string
  status?: string
  [key: string]: string | number | undefined
}

export interface BatchOperationResult {
  message: string
  success_count: number
  failed_count: number
}

export interface UserCreateRequest {
  username: string
  email: string
  full_name?: string
  nickname?: string
  password?: string
  organization_id?: string
  roles?: string[]
  is_active?: boolean
}

export interface UserUpdateRequest {
  username?: string
  email?: string
  full_name?: string
  nickname?: string
  organization_id?: string
  roles?: string[]
  is_active?: boolean
}

export interface UserStatistics {
  total: number
  active: number
  inactive: number
  new_this_month: number
  super_admin: number
  admin: number
  normal: number
}

// ==================== API服务类 ====================

/**
 * 用户管理API服务类
 * 遵循项目统一的实例模式
 */
export class UsersAPI {
  private readonly baseURL = '/v1'

  /**
   * 获取用户列表
   */
  async getUsers(params?: UsersApiParams): Promise<User[]> {
    const response = await http.get<User[]>(`${this.baseURL}/users`, { params })
    return response.data
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(id: string): Promise<User> {
    const response = await http.get<User>(`${this.baseURL}/users/${id}`)
    return response.data
  }

  /**
   * 创建用户
   */
  async createUser(userData: UserCreateRequest): Promise<User> {
    const response = await http.post<User>(`${this.baseURL}/users`, userData)
    return response.data
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, userData: UserUpdateRequest): Promise<User> {
    const response = await http.put<User>(`${this.baseURL}/users/${id}`, userData)
    return response.data
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(id: string): Promise<void> {
    await http.delete(`${this.baseURL}/users/${id}`)
  }

  /**
   * 批量删除用户
   */
  async batchDeleteUsers(userIds: string[]): Promise<BatchOperationResult> {
    const response = await http.patch<BatchOperationResult>(`${this.baseURL}/users/batch/delete`, { 
      user_ids: userIds 
    })
    return response.data
  }

  /**
   * 批量禁用用户
   */
  async batchDisableUsers(userIds: string[]): Promise<BatchOperationResult> {
    const response = await http.patch<BatchOperationResult>(`${this.baseURL}/users/batch/disable`, { 
      user_ids: userIds 
    })
    return response.data
  }

  /**
   * 恢复已删除用户
   */
  async restoreUser(id: string): Promise<BatchOperationResult> {
    const response = await http.post<BatchOperationResult>(`${this.baseURL}/users/recycle-bin/${id}/restore`)
    return response.data
  }

  /**
   * 批量恢复用户
   */
  async batchRestoreUsers(userIds: string[]): Promise<BatchOperationResult> {
    const response = await http.patch<BatchOperationResult>(`${this.baseURL}/users/recycle-bin/batch/restore`, { 
      user_ids: userIds 
    })
    return response.data
  }

  /**
   * 永久删除用户
   */
  async permanentlyDeleteUser(id: string): Promise<BatchOperationResult> {
    const response = await http.delete<BatchOperationResult>(`${this.baseURL}/users/recycle-bin/${id}/permanent`)
    return response.data
  }

  /**
   * 批量永久删除用户
   */
  async batchPermanentlyDeleteUsers(userIds: string[]): Promise<BatchOperationResult> {
    const response = await http.request<BatchOperationResult>({
      url: `${this.baseURL}/users/recycle-bin/batch/permanent`,
      method: 'DELETE',
      body: JSON.stringify({ user_ids: userIds }),
      headers: { 'Content-Type': 'application/json' }
    })
    return response.data
  }

  /**
   * 获取回收站用户列表
   */
  async getDeletedUsers(params?: UsersApiParams): Promise<User[]> {
    const response = await http.get<User[]>(`${this.baseURL}/users/recycle-bin`, { params })
    return response.data
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(params?: {
    tenant_id?: string
    organization_id?: string
  }): Promise<UserStatistics> {
    const response = await http.get<UserStatistics>(`${this.baseURL}/users/stats`, { params })
    return response.data
  }
}

// 导出单例实例
export const usersAPI = new UsersAPI()

// 为了向后兼容，也导出一些常用方法
export const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  batchDeleteUsers,
  batchDisableUsers,
  restoreUser,
  batchRestoreUsers,
  permanentlyDeleteUser,
  batchPermanentlyDeleteUsers,
  getDeletedUsers,
  getUserStatistics
} = usersAPI

export default usersAPI