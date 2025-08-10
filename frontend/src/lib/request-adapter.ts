/**
 * Axios兼容适配器
 * 提供与axios相似的接口和错误类型，方便迁移
 */

import { http } from './request'
import { getApiConfig, STORAGE_KEYS } from './api-config'

// 兼容axios的错误类型
export class RequestError extends Error {
  public status?: number
  public response?: {
    status: number
    statusText: string
    data: unknown
    headers: Headers
  }
  public data?: unknown

  constructor(message: string, status?: number, response?: Response, data?: unknown) {
    super(message)
    this.name = 'RequestError'
    this.status = status
    this.data = data
    
    if (response) {
      this.response = {
        status: response.status,
        statusText: response.statusText,
        data: data,
        headers: response.headers,
      }
    }
  }
}

// 为了向后兼容，导出AxiosError别名
export { RequestError as AxiosError }

// 配置HTTP客户端拦截器
// 配置HTTP客户端
const apiConfig = getApiConfig()
http.setBaseURL(apiConfig.baseURL)

// Token管理器
export class TokenManager {
  private static instance: TokenManager
  private tokenProvider: (() => string | null) | null = null
  private refreshTokenProvider: (() => Promise<string | null>) | null = null

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  // 设置token获取函数（支持同步和异步）
  setTokenProvider(provider: () => string | null): void {
    this.tokenProvider = provider
  }

  // 设置刷新token的函数
  setRefreshTokenProvider(provider: () => Promise<string | null>): void {
    this.refreshTokenProvider = provider
  }

  // 获取token
  getToken(): string | null {
    if (this.tokenProvider) {
      return this.tokenProvider()
    }
    // 默认从localStorage获取
    return localStorage.getItem(STORAGE_KEYS.TOKEN)
  }

  // 刷新token
  async refreshToken(): Promise<string | null> {
    if (this.refreshTokenProvider) {
      const newToken = await this.refreshTokenProvider()
      if (newToken) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, newToken)
      }
      return newToken
    }
    return null
  }

  // 清除token
  clearToken(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  }
}

// 创建全局token管理器实例
export const tokenManager = TokenManager.getInstance()

http.addRequestInterceptor({
  onRequest: async (config) => {
    // 添加认证token
    const token = tokenManager.getToken()
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
    return config
  },
})

http.addResponseInterceptor({
  onResponseError: async (error) => {
    // 自动token刷新
    if (error.status === 401 && tokenManager.refreshToken) {
      try {
        const newToken = await tokenManager.refreshToken()
        if (newToken) {
          // Token刷新成功，不需要进一步处理，让重试机制处理
          // eslint-disable-next-line no-console
          console.log('Token refreshed successfully')
        }
      } catch (refreshError) {
        // eslint-disable-next-line no-console
        console.error('Token refresh failed:', refreshError)
        tokenManager.clearToken()
      }
    }

    // 转换为兼容axios的错误格式
    const requestError = new RequestError(
      error.message,
      error.status,
      error.response,
      error.data
    )
    
    throw requestError
  },
})

// 导出配置好的http实例
export { http }
export default http