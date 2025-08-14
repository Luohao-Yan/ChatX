export const apiConfig = {
  // API基础配置
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  
  // 重试配置
  retry: {
    maxAttempts: 3,
    delay: 1000,
    backoff: 2,
  },
  
  // 认证相关接口
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    refresh: '/auth/refresh',
    userInfo: '/auth/me',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    sessions: '/auth/sessions',
  },
  
  // 聊天相关接口
  chat: {
    conversations: '/chat/conversations',
    messages: '/chat/messages',
    aiChat: '/chat/ai',
  },
  
  // 文档相关接口
  documents: {
    list: '/documents',
    upload: '/documents/upload',
    categories: '/documents/categories',
    search: '/documents/search',
  },
  
  // 知识图谱接口
  knowledge: {
    graph: '/knowledge/graph',
    departments: '/knowledge/departments',
    organizations: '/knowledge/organizations',
  },
  
  // 用户管理接口
  users: {
    list: '/users',
    profile: '/users/profile',
    settings: '/users/settings',
  },
  
  // 任务管理接口
  tasks: {
    list: '/tasks',
    create: '/tasks',
    update: '/tasks',
    delete: '/tasks',
  },
} as const

export type ApiConfig = typeof apiConfig