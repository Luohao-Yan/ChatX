/**
 * API配置文件
 * 管理API基础配置、环境变量和常量
 */

// API配置接口
interface ApiConfig {
  baseURL: string
  timeout: number
  retryCount: number
  retryDelay: number
}

// 环境配置
const isDevelopment = import.meta.env.DEV
const isProduction = import.meta.env.PROD

// 默认API配置
export const DEFAULT_API_CONFIG: ApiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || (isDevelopment ? 'http://localhost:3000/api' : '/api'),
  timeout: 10000,
  retryCount: 2,
  retryDelay: 1000,
}

// HTTP状态码常量
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

// API端点常量
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  // 用户相关
  USERS: {
    LIST: '/users',
    DETAIL: (id: number | string) => `/users/${id}`,
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
  },
  // 文件上传
  UPLOAD: {
    SINGLE: '/upload',
    MULTIPLE: '/upload/multiple',
    AVATAR: '/upload/avatar',
  },
} as const

// 内容类型常量
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
} as const

// 请求头常量
export const REQUEST_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
  X_REQUESTED_WITH: 'X-Requested-With',
} as const

// 存储键名常量
export const STORAGE_KEYS = {
  TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_INFO: 'userInfo',
} as const

// 错误消息常量
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  TIMEOUT: '请求超时，请重试',
  UNAUTHORIZED: '未授权访问，请登录',
  FORBIDDEN: '没有权限访问此资源',
  NOT_FOUND: '请求的资源不存在',
  SERVER_ERROR: '服务器内部错误，请稍后重试',
  UNKNOWN: '未知错误，请稍后重试',
} as const

// 根据环境获取配置
export const getApiConfig = (): ApiConfig => {
  return {
    ...DEFAULT_API_CONFIG,
    // 生产环境可能需要不同的配置
    timeout: isProduction ? 15000 : DEFAULT_API_CONFIG.timeout,
    retryCount: isProduction ? 3 : DEFAULT_API_CONFIG.retryCount,
  }
}

// 错误类型定义
interface RetryableError {
  name?: string
  message?: string
  status?: number
}

// 是否应该重试请求的判断函数
export const shouldRetryRequest = (error: unknown): boolean => {
  // 类型保护：确保error是一个对象
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const err = error as RetryableError
  
  // 网络错误或超时应该重试
  if (err.name === 'TypeError' || (err.message && err.message.includes('timeout'))) {
    return true
  }

  // 5xx服务器错误应该重试
  if (err.status && err.status >= 500) {
    return true
  }

  // 4xx客户端错误通常不应该重试（除了429 - 请求过多）
  if (err.status === 429) {
    return true
  }

  return false
}

// 导出类型
export type { ApiConfig }