/**
 * 认证API服务
 * 与其他API服务保持一致的组织结构
 */

import { http } from '../http'

// 注册请求数据类型
export interface RegisterRequest {
  username: string
  email: string
  password: string
  full_name?: string
}

// 登录请求数据类型
export interface LoginRequest {
  identifier?: string
  email?: string
  username?: string
  password: string
  device_info?: string
  rememberMe?: boolean
}

// 用户信息响应类型
export interface UserResponse {
  id: string
  username: string
  email: string
  full_name?: string
  nickname?: string
  is_active: boolean
  is_verified: boolean
  current_tenant_id?: string
  tenant_ids?: string[]
  created_at: string
  updated_at: string
}

// Token响应类型
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

// Token刷新请求类型
export interface TokenRefreshRequest {
  refresh_token: string
}

/**
 * 认证API服务类
 * 遵循项目统一的API组织模式
 */
export class AuthAPI {
  private static readonly BASE_PATH = '/v1/auth'

  /**
   * 用户注册
   */
  static async register(data: RegisterRequest): Promise<UserResponse> {
    const response = await http.post<UserResponse>(`${this.BASE_PATH}/register`, data)
    return response.data
  }

  /**
   * 用户登录
   */
  static async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await http.post<TokenResponse>(`${this.BASE_PATH}/login`, data)
    return response.data
  }

  /**
   * 刷新Token
   */
  static async refreshToken(data: TokenRefreshRequest): Promise<TokenResponse> {
    const response = await http.post<TokenResponse>(`${this.BASE_PATH}/refresh`, data)
    return response.data
  }

  /**
   * 用户登出
   */
  static async logout(data: TokenRefreshRequest): Promise<{ message: string }> {
    const response = await http.post<{ message: string }>(`${this.BASE_PATH}/logout`, data)
    return response.data
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(): Promise<UserResponse> {
    const response = await http.get<UserResponse>(`${this.BASE_PATH}/me`)
    return response.data
  }

  /**
   * 发送密码重置邮件
   */
  static async sendPasswordResetEmail(email: string): Promise<{ message: string }> {
    const response = await http.post<{ message: string }>(`${this.BASE_PATH}/password-reset`, { email })
    return response.data
  }

  /**
   * 确认密码重置
   */
  static async confirmPasswordReset(data: {
    token: string
    new_password: string
  }): Promise<{ message: string }> {
    const response = await http.post<{ message: string }>(`${this.BASE_PATH}/password-reset-confirm`, data)
    return response.data
  }

  /**
   * 发送邮箱验证邮件
   */
  static async sendEmailVerification(): Promise<{ message: string }> {
    const response = await http.post<{ message: string }>(`${this.BASE_PATH}/verify-email`)
    return response.data
  }

  /**
   * 确认邮箱验证
   */
  static async confirmEmailVerification(token: string): Promise<{ message: string }> {
    const response = await http.post<{ message: string }>(`${this.BASE_PATH}/verify-email-confirm`, { token })
    return response.data
  }

  /**
   * 切换当前租户
   */
  static async switchTenant(tenantId: string): Promise<UserResponse> {
    const response = await http.post<UserResponse>(`${this.BASE_PATH}/switch-tenant`, { tenant_id: tenantId })
    return response.data
  }
}

export default AuthAPI