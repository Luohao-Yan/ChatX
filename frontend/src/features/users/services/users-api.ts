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
  async getUser(id: number): Promise<User> {
    const response = await http.get<User>(`${this.baseUrl}/${id}`)
    return response.data
  }

  // 创建用户
  async createUser(userData: UserCreate): Promise<User> {
    const response = await http.post<User>(`${this.baseUrl}/register`, userData)
    return response.data
  }

  // 更新用户
  async updateUser(id: number, userData: UserUpdate): Promise<User> {
    const response = await http.put<User>(`${this.baseUrl}/${id}`, userData)
    return response.data
  }

  // 删除用户
  async deleteUser(id: number): Promise<{ message: string; user_id: number }> {
    const response = await http.delete<{ message: string; user_id: number }>(`${this.baseUrl}/${id}`)
    return response.data
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    const response = await http.get<User>(`${this.baseUrl}/me`)
    return response.data
  }
}

// 创建单例实例
export const usersApi = new UsersApi()

// Hook for using users API
export const useUsersApi = () => {
  return usersApi
}