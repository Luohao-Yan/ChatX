/**
 * 认证系统配置
 * 企业级认证配置管理
 */

// 认证配置接口
export interface AuthConfig {
  // Token配置
  tokenConfig: {
    accessTokenKey: string
    refreshTokenKey: string
    tokenPrefix: string
    expirationCheckInterval: number // 检查token过期的时间间隔(ms)
    refreshThreshold: number // 提前刷新时间(分钟)
  }
  
  // 路由配置
  routeConfig: {
    loginPath: string
    defaultRedirectPath: string
    publicRoutes: string[]
    protectedRoutes: string[]
  }
  
  // 会话配置
  sessionConfig: {
    enableRememberMe: boolean
    rememberMeDuration: number // 记住我持续时间(天)
    maxLoginAttempts: number
    lockoutDuration: number // 锁定时间(分钟)
  }
  
  // 安全配置
  securityConfig: {
    enableCSRF: boolean
    enableXSS: boolean
    enableSessionTimeout: boolean
    sessionTimeoutMinutes: number
    enableMultiDeviceCheck: boolean
  }
  
  // API配置
  apiConfig: {
    loginEndpoint: string
    refreshEndpoint: string
    logoutEndpoint: string
    logoutAllEndpoint: string
    userInfoEndpoint: string
    registerEndpoint: string
    forgotPasswordEndpoint: string
    resetPasswordEndpoint: string
    sessionsEndpoint: string
  }
}

// 默认配置
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  tokenConfig: {
    accessTokenKey: 'chatx_access_token',
    refreshTokenKey: 'chatx_refresh_token',
    tokenPrefix: 'Bearer',
    expirationCheckInterval: 30000, // 30秒检查一次
    refreshThreshold: 5, // 提前5分钟刷新
  },
  
  routeConfig: {
    loginPath: '/sign-in',
    defaultRedirectPath: '/',
    publicRoutes: [
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/otp',
      '/404',
      '/500',
      '/503',
    ],
    protectedRoutes: [
      '/',
      '/dashboard',
      '/settings',
      '/users',
      '/tasks',
    ],
  },
  
  sessionConfig: {
    enableRememberMe: true,
    rememberMeDuration: 30, // 30天
    maxLoginAttempts: 5,
    lockoutDuration: 15, // 15分钟
  },
  
  securityConfig: {
    enableCSRF: true,
    enableXSS: true,
    enableSessionTimeout: true,
    sessionTimeoutMinutes: 480, // 8小时
    enableMultiDeviceCheck: false,
  },
  
  apiConfig: {
    loginEndpoint: '/v1/auth/login',
    refreshEndpoint: '/v1/auth/refresh',
    logoutEndpoint: '/v1/auth/logout',
    logoutAllEndpoint: '/v1/auth/logout-all',
    userInfoEndpoint: '/v1/auth/me',
    registerEndpoint: '/v1/auth/register',
    forgotPasswordEndpoint: '/v1/auth/forgot-password',
    resetPasswordEndpoint: '/v1/auth/reset-password',
    sessionsEndpoint: '/v1/auth/sessions',
  },
}

// 环境相关配置
const getEnvironmentConfig = (): Partial<AuthConfig> => {
  const isDevelopment = import.meta.env.DEV
  
  if (isDevelopment) {
    return {
      tokenConfig: {
        ...DEFAULT_AUTH_CONFIG.tokenConfig,
        expirationCheckInterval: 60000, // 开发环境1分钟检查一次
      },
      securityConfig: {
        ...DEFAULT_AUTH_CONFIG.securityConfig,
        enableCSRF: false, // 开发环境关闭CSRF
      },
    }
  }
  
  return {}
}

// 获取最终配置
export const getAuthConfig = (): AuthConfig => {
  const envConfig = getEnvironmentConfig()
  
  return {
    ...DEFAULT_AUTH_CONFIG,
    ...envConfig,
    tokenConfig: {
      ...DEFAULT_AUTH_CONFIG.tokenConfig,
      ...envConfig.tokenConfig,
    },
    securityConfig: {
      ...DEFAULT_AUTH_CONFIG.securityConfig,
      ...envConfig.securityConfig,
    },
  }
}

// 认证状态枚举
export enum AuthStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  ERROR = 'error',
  LOCKED = 'locked',
  EXPIRED = 'expired',
}

// 认证错误类型
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNKNOWN = 'UNKNOWN',
}

// 认证错误消息映射
export const AUTH_ERROR_MESSAGES: Record<AuthErrorType, string> = {
  [AuthErrorType.INVALID_CREDENTIALS]: '邮箱或密码错误',
  [AuthErrorType.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [AuthErrorType.TOKEN_INVALID]: '登录状态无效，请重新登录',
  [AuthErrorType.NETWORK_ERROR]: '网络连接错误，请检查网络后重试',
  [AuthErrorType.SERVER_ERROR]: '服务器错误，请稍后重试',
  [AuthErrorType.TOO_MANY_ATTEMPTS]: '登录尝试次数过多，请稍后再试',
  [AuthErrorType.ACCOUNT_LOCKED]: '账户已被锁定，请联系管理员',
  [AuthErrorType.ACCOUNT_DISABLED]: '账户已被禁用，请联系管理员',
  [AuthErrorType.PERMISSION_DENIED]: '权限不足，无法访问此资源',
  [AuthErrorType.SESSION_EXPIRED]: '会话已过期，请重新登录',
  [AuthErrorType.UNKNOWN]: '未知错误，请稍后重试',
}

// 权限类型
export type Permission = string
export type Role = string

// 用户权限接口
export interface UserPermissions {
  roles: Role[]
  permissions: Permission[]
}

// 导出配置实例
export const authConfig = getAuthConfig()