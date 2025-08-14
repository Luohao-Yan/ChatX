export const appConfig = {
  // 应用基础信息
  name: 'ChatX',
  version: '1.4.2',
  description: 'AI聊天应用',
  
  // 开发环境配置
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  
  // 功能特性开关
  features: {
    devTools: import.meta.env.MODE === 'development',
    aiChat: true,
    knowledgeGraph: true,
    taskManagement: true,
    userManagement: true,
    documentManagement: true,
  },
  
  // 性能配置
  performance: {
    queryStaleTime: 10 * 1000, // 10秒
    queryRetryCount: 3,
    enableCodeSplitting: true,
  },
  
  // UI配置
  ui: {
    toastDuration: 10000,
    toastPosition: 'bottom-right' as const,
    defaultTheme: 'light' as const,
    storageKey: 'vite-ui-theme',
  },
} as const

export type AppConfig = typeof appConfig