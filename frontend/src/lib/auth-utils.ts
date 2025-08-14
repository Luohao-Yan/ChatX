/**
 * 认证工具函数
 * 企业级认证相关工具函数集合
 */

import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import { authConfig, AuthErrorType, AUTH_ERROR_MESSAGES } from '@/config/auth-config'
import { authLogger } from '@/lib/logger'

// JWT Token 接口
export interface JWTPayload {
  sub: string // 用户ID
  email: string
  exp: number // 过期时间
  iat: number // 签发时间
  roles?: string[]
  permissions?: string[]
  username?: string
  full_name?: string
  is_active?: boolean
  is_verified?: boolean
  phone?: string | null
  avatar_url?: string | null
}

// 认证存储管理类
export class AuthStorage {
  private static readonly ACCESS_TOKEN_KEY = authConfig.tokenConfig.accessTokenKey
  private static readonly REFRESH_TOKEN_KEY = authConfig.tokenConfig.refreshTokenKey

  /**
   * 存储访问令牌
   */
  static setAccessToken(token: string, rememberMe = false): void {
    try {
      const isProduction = window.location.protocol === 'https:'
      console.log('🍪 [AUTH_STORAGE] 设置AccessToken', { 
        rememberMe, 
        isProduction, 
        tokenLength: token.length,
        protocol: window.location.protocol 
      })
      
      if (rememberMe) {
        // 记住我：使用Cookie持久化存储
        const days = authConfig.sessionConfig.rememberMeDuration
        Cookies.set(this.ACCESS_TOKEN_KEY, token, { 
          expires: days,
          secure: isProduction, // 只在HTTPS下设置secure
          sameSite: 'lax'       // 放宽sameSite限制
        })
      } else {
        // 会话存储：浏览器关闭后失效
        Cookies.set(this.ACCESS_TOKEN_KEY, token, {
          secure: isProduction, // 只在HTTPS下设置secure
          sameSite: 'lax'       // 放宽sameSite限制
        })
      }
      
      console.log('✅ [AUTH_STORAGE] AccessToken设置完成')
    } catch (error) {
      console.error('❌ [AUTH_STORAGE] AccessToken设置失败:', error)
      authLogger.error('Failed to store access token', error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * 获取访问令牌
   */
  static getAccessToken(): string | null {
    try {
      return Cookies.get(this.ACCESS_TOKEN_KEY) || null
    } catch (error) {
      authLogger.error('Failed to get access token', error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }

  /**
   * 存储刷新令牌
   */
  static setRefreshToken(token: string, rememberMe = false): void {
    try {
      const isProduction = window.location.protocol === 'https:'
      console.log('🍪 [AUTH_STORAGE] 设置RefreshToken', { 
        rememberMe, 
        isProduction, 
        tokenLength: token.length,
        protocol: window.location.protocol 
      })
      
      if (rememberMe) {
        const days = authConfig.sessionConfig.rememberMeDuration
        Cookies.set(this.REFRESH_TOKEN_KEY, token, { 
          expires: days,
          secure: isProduction, // 只在HTTPS下设置secure
          sameSite: 'lax',      // 放宽sameSite限制
          httpOnly: false // 注意：生产环境建议设为true
        })
      } else {
        Cookies.set(this.REFRESH_TOKEN_KEY, token, {
          secure: isProduction, // 只在HTTPS下设置secure
          sameSite: 'lax',      // 放宽sameSite限制
          httpOnly: false
        })
      }
      
      console.log('✅ [AUTH_STORAGE] RefreshToken设置完成')
    } catch (error) {
      console.error('❌ [AUTH_STORAGE] RefreshToken设置失败:', error)
      authLogger.error('Failed to store refresh token', error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * 获取刷新令牌
   */
  static getRefreshToken(): string | null {
    try {
      return Cookies.get(this.REFRESH_TOKEN_KEY) || null
    } catch (error) {
      authLogger.error('Failed to get refresh token', error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }

  /**
   * 清除所有认证令牌
   */
  static clearTokens(): void {
    try {
      Cookies.remove(this.ACCESS_TOKEN_KEY)
      Cookies.remove(this.REFRESH_TOKEN_KEY)
      
      // 清除其他相关存储
      localStorage.removeItem('user_preferences')
      sessionStorage.clear()
    } catch (error) {
      authLogger.error('Failed to clear tokens', error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * 检查是否有有效的认证信息
   */
  static hasValidAuth(): boolean {
    const accessToken = this.getAccessToken()
    return accessToken ? TokenValidator.isValidToken(accessToken) : false
  }
}

// Token验证器
export class TokenValidator {
  /**
   * 验证Token是否有效
   */
  static isValidToken(token: string | null): boolean {
    if (!token) return false

    try {
      const payload = jwtDecode<JWTPayload>(token)
      const currentTime = Date.now() / 1000
      
      // 检查是否过期
      if (payload.exp <= currentTime) {
        return false
      }

      // 检查基本字段
      if (!payload.sub || !payload.email) {
        return false
      }

      return true
    } catch (error) {
      authLogger.error('Token validation failed', error instanceof Error ? error : new Error(String(error)))
      return false
    }
  }

  /**
   * 检查Token是否即将过期
   */
  static isTokenExpiringSoon(token: string | null): boolean {
    if (!token) return true

    try {
      const payload = jwtDecode<JWTPayload>(token)
      const currentTime = Date.now() / 1000
      const thresholdMinutes = authConfig.tokenConfig.refreshThreshold
      const threshold = thresholdMinutes * 60 // 转换为秒
      
      return payload.exp - currentTime <= threshold
    } catch (error) {
      authLogger.error('Token expiration check failed', error instanceof Error ? error : new Error(String(error)))
      return true
    }
  }

  /**
   * 获取Token过期时间
   */
  static getTokenExpiration(token: string | null): Date | null {
    if (!token) return null

    try {
      const payload = jwtDecode<JWTPayload>(token)
      return new Date(payload.exp * 1000)
    } catch (error) {
      authLogger.error('Get token expiration failed', error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }

  /**
   * 从Token中提取用户信息
   */
  static extractUserFromToken(token: string | null): Partial<JWTPayload> | null {
    if (!token || !this.isValidToken(token)) return null

    try {
      return jwtDecode<JWTPayload>(token)
    } catch (error) {
      authLogger.error('Extract user from token failed', error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }
}

// 错误处理器
export class AuthErrorHandler {
  /**
   * 将HTTP状态码转换为认证错误类型
   */
  static mapHttpStatusToErrorType(status: number): AuthErrorType {
    switch (status) {
      case 401:
        return AuthErrorType.INVALID_CREDENTIALS
      case 403:
        return AuthErrorType.PERMISSION_DENIED
      case 422:
        return AuthErrorType.INVALID_CREDENTIALS
      case 429:
        return AuthErrorType.TOO_MANY_ATTEMPTS
      case 423:
        return AuthErrorType.ACCOUNT_LOCKED
      case 0:
        return AuthErrorType.NETWORK_ERROR
      default:
        if (status >= 500) {
          return AuthErrorType.SERVER_ERROR
        }
        return AuthErrorType.UNKNOWN
    }
  }

  /**
   * 获取错误消息
   */
  static getErrorMessage(errorType: AuthErrorType): string {
    return AUTH_ERROR_MESSAGES[errorType] || AUTH_ERROR_MESSAGES[AuthErrorType.UNKNOWN]
  }

  /**
   * 处理认证错误
   */
  static handleAuthError(error: unknown): { type: AuthErrorType; message: string } {
    let errorType: AuthErrorType
    
    // 类型守卫和安全检查
    const errorObj = error as any

    if (errorObj?.response?.status) {
      errorType = this.mapHttpStatusToErrorType(errorObj.response.status)
    } else if (errorObj?.status) {
      errorType = this.mapHttpStatusToErrorType(errorObj.status)
    } else if (errorObj?.message?.includes('network')) {
      errorType = AuthErrorType.NETWORK_ERROR
    } else if (errorObj?.message?.includes('timeout')) {
      errorType = AuthErrorType.NETWORK_ERROR
    } else {
      errorType = AuthErrorType.UNKNOWN
    }

    return {
      type: errorType,
      message: this.getErrorMessage(errorType)
    }
  }
}

// 路由验证器
export class RouteValidator {
  /**
   * 检查路由是否为公开路由
   */
  static isPublicRoute(pathname: string): boolean {
    return authConfig.routeConfig.publicRoutes.some(route => {
      // 支持通配符匹配
      if (route.endsWith('*')) {
        return pathname.startsWith(route.slice(0, -1))
      }
      return pathname === route || pathname.startsWith(route + '/')
    })
  }

  /**
   * 检查路由是否需要认证
   */
  static requiresAuth(pathname: string): boolean {
    return !this.isPublicRoute(pathname)
  }

  /**
   * 获取重定向URL
   */
  static getRedirectUrl(pathname?: string): string {
    if (!pathname || this.isPublicRoute(pathname)) {
      return authConfig.routeConfig.defaultRedirectPath
    }
    return pathname
  }

  /**
   * 获取登录URL（带返回地址）
   */
  static getLoginUrl(returnUrl?: string): string {
    const loginPath = authConfig.routeConfig.loginPath
    if (!returnUrl || returnUrl === loginPath) {
      return loginPath
    }
    
    const url = new URL(loginPath, window.location.origin)
    url.searchParams.set('returnUrl', returnUrl)
    return url.pathname + url.search
  }
}

// 会话管理器
export class SessionManager {
  private static sessionTimer: NodeJS.Timeout | null = null
  private static lastActivity: number = Date.now()

  /**
   * 开始会话监控
   */
  static startSessionMonitoring(): void {
    if (!authConfig.securityConfig.enableSessionTimeout) return

    this.resetSessionTimer()
    
    // 监听用户活动
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    activities.forEach(event => {
      document.addEventListener(event, this.updateLastActivity.bind(this), true)
    })
  }

  /**
   * 停止会话监控
   */
  static stopSessionMonitoring(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer)
      this.sessionTimer = null
    }
  }

  /**
   * 更新最后活动时间
   */
  private static updateLastActivity(): void {
    this.lastActivity = Date.now()
    this.resetSessionTimer()
  }

  /**
   * 重置会话计时器
   */
  private static resetSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer)
    }

    const timeoutMs = authConfig.securityConfig.sessionTimeoutMinutes * 60 * 1000
    this.sessionTimer = setTimeout(() => {
      this.handleSessionTimeout()
    }, timeoutMs)
  }

  /**
   * 处理会话超时
   */
  private static handleSessionTimeout(): void {
    // 触发会话超时事件
    window.dispatchEvent(new CustomEvent('auth:session-timeout'))
  }

  /**
   * 检查会话是否活跃
   */
  static isSessionActive(): boolean {
    if (!authConfig.securityConfig.enableSessionTimeout) return true
    
    const timeoutMs = authConfig.securityConfig.sessionTimeoutMinutes * 60 * 1000
    return Date.now() - this.lastActivity < timeoutMs
  }
}

// 设备管理器
export class DeviceManager {
  /**
   * 获取设备指纹
   */
  static getDeviceFingerprint(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx?.fillText('Device fingerprint', 10, 10)
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join('|')
    
    return btoa(fingerprint).slice(0, 32)
  }

  /**
   * 获取设备信息
   */
  static getDeviceInfo(): Record<string, unknown> {
    return {
      userAgent: navigator.userAgent,
      platform: (navigator as any).userAgentData?.platform || navigator.platform,
      language: navigator.language,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fingerprint: this.getDeviceFingerprint(),
    }
  }
}

// 导出所有工具类
export {
  AuthStorage as storage,
  TokenValidator as validator,
  AuthErrorHandler as errorHandler,
  RouteValidator as routeValidator,
  SessionManager as sessionManager,
  DeviceManager as deviceManager,
}