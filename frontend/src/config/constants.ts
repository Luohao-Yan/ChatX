// 应用常量
export const APP_CONSTANTS = {
  // 存储键名
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'chatx_access_token',
    REFRESH_TOKEN: 'chatx_refresh_token',
    USER_CACHE: 'chatx_user_cache',
    THEME: 'vite-ui-theme',
    LANGUAGE: 'chatx_language',
  },
  
  // 时间常量（毫秒）
  TIME: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
  },
  
  // 分页配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    MAX_PAGE_SIZE: 100,
  },
  
  // 文件上传
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/msword'],
  },
  
  // 路由路径
  ROUTES: {
    HOME: '/',
    SIGN_IN: '/sign-in',
    SIGN_UP: '/sign-up',
    DASHBOARD: '/dashboard',
    AI_CHAT: '/ai-chats',
    DOCUMENTS: '/documents',
    KNOWLEDGE: '/knowledge',
    SETTINGS: '/settings',
    USERS: '/users',
    TASKS: '/tasks',
  },
  
  // 权限角色
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    MODERATOR: 'moderator',
    VIEWER: 'viewer',
  },
  
  // 权限操作
  PERMISSIONS: {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin',
  },
  
  // 状态码
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
  
  // 正则表达式
  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    PHONE: /^1[3-9]\d{9}$/,
    USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  },
} as const

// 导出类型
export type AppConstants = typeof APP_CONSTANTS
export type StorageKeys = keyof typeof APP_CONSTANTS.STORAGE_KEYS
export type Routes = keyof typeof APP_CONSTANTS.ROUTES
export type Roles = keyof typeof APP_CONSTANTS.ROLES
export type Permissions = keyof typeof APP_CONSTANTS.PERMISSIONS