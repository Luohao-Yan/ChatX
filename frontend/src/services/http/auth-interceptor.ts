/**
 * 认证拦截器
 * 自动处理Token刷新、错误处理等
 */

import { http } from './request'
import { useAuthStore } from '@/stores/auth'
import { validator, errorHandler } from '@/services/auth/auth-utils'
import { authConfig, AuthErrorType } from '@/config/auth-config'
import { authLogger } from '@/utils/logger'

// 正在刷新的Promise，防止并发刷新
let refreshPromise: Promise<void> | null = null

// 等待刷新的请求队列
interface PendingRequest {
  resolve: (value: any) => void
  reject: (reason: any) => void
  config: any
}

let pendingRequests: PendingRequest[] = []

// 存储原始请求配置的Map
const requestConfigMap = new Map<string, any>()

/**
 * 处理Token刷新
 */
async function handleTokenRefresh(): Promise<void> {
  const store = useAuthStore.getState()
  
  // 如果已经在刷新中，等待结果
  if (refreshPromise) {
    return refreshPromise
  }

  // 如果没有刷新令牌，直接登出
  if (!store.refreshToken) {
    store.reset()
    throw new Error('No refresh token available')
  }

  refreshPromise = store.refreshAccessToken()
  
  try {
    await refreshPromise
    authLogger.info('Token refreshed successfully')
    
    // 重试所有等待的请求
    const requests = [...pendingRequests]
    pendingRequests = []
    
    requests.forEach(({ resolve, config }) => {
      resolve(http.request(config))
    })
    
  } catch (error) {
    authLogger.error('Token refresh failed', error instanceof Error ? error : new Error(String(error)))
    
    // 刷新失败，拒绝所有等待的请求
    const requests = [...pendingRequests]
    pendingRequests = []
    
    requests.forEach(({ reject }) => {
      reject(error)
    })
    
    // 重置认证状态
    store.reset()
    throw error
    
  } finally {
    refreshPromise = null
  }
}

/**
 * 将请求加入等待队列
 */
function addPendingRequest(config: any): Promise<any> {
  return new Promise((resolve, reject) => {
    pendingRequests.push({ resolve, reject, config })
  })
}

/**
 * 设置请求拦截器
 */
export function setupAuthInterceptors(): void {
  // 请求拦截器
  http.addRequestInterceptor({
    onRequest: async (config) => {
      const store = useAuthStore.getState()
      const token = store.accessToken

      // 如果有Token，添加到请求头
      if (token && validator.isValidToken(token)) {
        config.headers = {
          ...config.headers,
          'Authorization': `${authConfig.tokenConfig.tokenPrefix} ${token}`,
        }
      }

      // 添加请求ID用于跟踪
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      config.headers = {
        ...config.headers,
        'X-Request-ID': requestId,
      }

      // 存储原始配置用于重试
      requestConfigMap.set(requestId, { ...config })

      // 记录请求日志
      authLogger.debug('API request started', {
        method: config.method?.toUpperCase(),
        url: config.url,
        requestId,
      })

      return config
    },
    
    onRequestError: async (error) => {
      authLogger.error('Request preparation failed', error)
      throw error
    },
  })

  // 响应拦截器
  http.addResponseInterceptor({
    onResponse: async (response) => {
      const requestId = response.headers.get('X-Request-ID')
      
      authLogger.debug('API request completed', {
        status: response.status,
        requestId,
      })
      
      return response
    },
    
    onResponseError: async (error) => {
      const status = error.status
      const requestId = error.response?.headers?.get?.('X-Request-ID')
      
      authLogger.warn('API request failed', error instanceof Error ? error : new Error(String(error)))

      // 处理401未授权错误
      if (status === 401) {
        const store = useAuthStore.getState()
        const token = store.accessToken
        
        // 如果Token无效或即将过期，尝试刷新
        if (token && (!validator.isValidToken(token) || validator.isTokenExpiringSoon(token))) {
          try {
            // 获取原始请求配置
            const originalConfig = requestId ? requestConfigMap.get(requestId) : null
            
            // 如果正在刷新，将请求加入队列
            if (refreshPromise && originalConfig) {
              return addPendingRequest(originalConfig)
            }
            
            // 尝试刷新Token
            await handleTokenRefresh()
            
            // 重试原始请求
            if (originalConfig) {
              // 清理请求配置映射
              if (requestId) {
                requestConfigMap.delete(requestId)
              }
              return http.request(originalConfig)
            }
            
          } catch (refreshError) {
            // 刷新失败，重定向到登录页
            const authError = errorHandler.handleAuthError(refreshError)
            store.setError(authError)
            
            // 触发全局认证失败事件
            window.dispatchEvent(new CustomEvent('auth:unauthorized', {
              detail: { error: authError }
            }))
            
            throw refreshError
          }
        } else {
          // Token完全无效，直接登出
          store.reset()
          
          window.dispatchEvent(new CustomEvent('auth:unauthorized', {
            detail: { error: { type: AuthErrorType.TOKEN_INVALID, message: 'Invalid token' } }
          }))
        }
      }
      
      // 处理403权限不足错误
      if (status === 403) {
        console.error('🚫 [AUTH_INTERCEPTOR] 收到403错误 - 权限被拒绝')
        const authError = {
          type: AuthErrorType.PERMISSION_DENIED,
          message: 'Permission denied'
        }
        
        console.log('📢 [AUTH_INTERCEPTOR] 触发auth:forbidden事件')
        window.dispatchEvent(new CustomEvent('auth:forbidden', {
          detail: { error: authError }
        }))
      }
      
      // 清理请求配置映射
      if (requestId) {
        requestConfigMap.delete(requestId)
      }
      
      // 处理其他认证相关错误
      if (status === 423) {
        const authError = {
          type: AuthErrorType.ACCOUNT_LOCKED,
          message: 'Account locked'
        }
        
        useAuthStore.getState().setError(authError)
      }
      
      throw error
    },
  })
}

/**
 * 清理拦截器
 */
export function clearAuthInterceptors(): void {
  // 清理等待队列
  const requests = [...pendingRequests]
  pendingRequests = []
  
  requests.forEach(({ reject }) => {
    reject(new Error('Auth interceptor cleared'))
  })
  
  // 重置刷新状态
  refreshPromise = null
  
  authLogger.info('Auth interceptors cleared')
}

/**
 * 主动检查并刷新Token
 */
export async function proactiveTokenRefresh(): Promise<void> {
  const store = useAuthStore.getState()
  const token = store.accessToken
  
  if (!token || !store.refreshToken) {
    return
  }
  
  // 如果Token即将过期，主动刷新
  if (validator.isTokenExpiringSoon(token)) {
    try {
      await handleTokenRefresh()
      authLogger.info('Proactive token refresh completed')
    } catch (error) {
      authLogger.warn('Proactive token refresh failed', error instanceof Error ? error : new Error(String(error)))
    }
  }
}

/**
 * 设置定时Token检查
 */
export function setupTokenRefreshTimer(): NodeJS.Timeout {
  const interval = authConfig.tokenConfig.expirationCheckInterval
  
  return setInterval(() => {
    proactiveTokenRefresh()
  }, interval)
}

/**
 * 监听网络状态变化
 */
export function setupNetworkListener(): (() => void) | undefined {
  if (typeof window === 'undefined') return undefined
  
  const handleOnline = () => {
    authLogger.info('Network connection restored')
    // 网络恢复后检查认证状态
    const store = useAuthStore.getState()
    if (store.accessToken) {
      store.checkAuthStatus()
    }
  }
  
  const handleOffline = () => {
    authLogger.info('Network connection lost')
  }
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  // 返回清理函数
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * 初始化所有认证相关的拦截器和监听器
 */
export function initializeAuthSystem(): () => void {
  // 设置拦截器
  setupAuthInterceptors()
  
  // 设置定时刷新
  const refreshTimer = setupTokenRefreshTimer()
  
  // 设置网络监听
  const networkCleanup = setupNetworkListener()
  
  authLogger.info('Auth system initialized')
  
  // 返回清理函数
  return () => {
    clearAuthInterceptors()
    clearInterval(refreshTimer)
    if (networkCleanup) {
      networkCleanup()
    }
    authLogger.info('Auth system cleaned up')
  }
}