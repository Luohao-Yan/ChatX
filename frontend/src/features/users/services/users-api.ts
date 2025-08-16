import { http } from '@/services/http'
import { User, UserCreate, UserUpdate } from '../data/schema'

export interface UsersListResponse {
  data: User[]
  total?: number
  message?: string
}

export interface UserResponse {
  data: User
  message?: string
}

class UsersApi {
  private baseUrl = '/v1/users'

  // 获取用户列表
  async getUsers(params?: {
    skip?: number
    limit?: number
    include_deleted?: boolean
  }): Promise<User[]> {
    const response = await http.get<User[]>(this.baseUrl, { params })
    return response.data
  }

  // 获取单个用户
  async getUser(id: string): Promise<User> {
    const response = await http.get<User>(`${this.baseUrl}/${id}`)
    return response.data
  }

  // 创建用户
  async createUser(userData: UserCreate): Promise<User> {
    const response = await http.post<User>(`${this.baseUrl}/register`, userData)
    return response.data
  }

  // 更新用户
  async updateUser(id: string, userData: UserUpdate): Promise<User> {
    const response = await http.put<User>(`${this.baseUrl}/${id}`, userData)
    return response.data
  }

  // 软删除用户
  async deleteUser(id: string): Promise<{ message: string; user_id: string }> {
    const response = await http.delete<{ message: string; user_id: string }>(`${this.baseUrl}/${id}`)
    return response.data
  }

  // 批量停用用户
  async batchDisableUsers(userIds: string[]): Promise<{ message: string; affected_count: number }> {
    const response = await http.patch<{ message: string; affected_count: number }>(`${this.baseUrl}/batch/disable`, {
      user_ids: userIds
    })
    return response.data
  }

  // 批量软删除用户
  async batchDeleteUsers(userIds: string[]): Promise<{ message: string; affected_count: number }> {
    const response = await http.patch<{ message: string; affected_count: number }>(`${this.baseUrl}/batch/delete`, {
      user_ids: userIds
    })
    return response.data
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    const response = await http.get<User>(`${this.baseUrl}/me`)
    return response.data
  }

  // === 回收站相关方法 ===
  
  // 获取回收站中的已删除用户
  async getDeletedUsers(params?: {
    skip?: number
    limit?: number
  }): Promise<User[]> {
    const response = await http.get<User[]>(`${this.baseUrl}/recycle-bin`, { params })
    return response.data
  }

  // 恢复单个用户
  async restoreUser(id: string): Promise<{ message: string; user_id: string }> {
    const response = await http.post<{ message: string; user_id: string }>(`${this.baseUrl}/recycle-bin/${id}/restore`)
    return response.data
  }

  // 彻底删除单个用户
  async permanentlyDeleteUser(id: string): Promise<{ message: string; user_id: string }> {
    const response = await http.delete<{ message: string; user_id: string }>(`${this.baseUrl}/recycle-bin/${id}/permanent`)
    return response.data
  }

  // 批量恢复用户
  async batchRestoreUsers(userIds: string[]): Promise<{ message: string; affected_count: number }> {
    const response = await http.patch<{ message: string; affected_count: number }>(`${this.baseUrl}/recycle-bin/batch/restore`, {
      user_ids: userIds
    })
    return response.data
  }

  // 批量彻底删除用户
  async batchPermanentlyDeleteUsers(userIds: string[]): Promise<{ message: string; affected_count: number }> {
    const response = await http.request<{ message: string; affected_count: number }>({
      url: `${this.baseUrl}/recycle-bin/batch/permanent`,
      method: 'DELETE',
      body: JSON.stringify({ user_ids: userIds }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.data
  }
}

// 创建单例实例
export const usersApi = new UsersApi()

// Hook for using users API
export const useUsersApi = () => {
  return usersApi
}