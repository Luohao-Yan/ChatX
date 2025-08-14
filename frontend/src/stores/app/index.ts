import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { appConfig } from '@/config/app'
import type { ThemeMode, Language, LoadingState } from '@/types/common'

interface AppState {
  // 应用状态
  isInitialized: boolean
  loading: LoadingState
  error: string | null
  
  // 主题和外观
  theme: ThemeMode
  language: Language
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  
  // 网络状态
  isOnline: boolean
  connectionQuality: 'fast' | 'slow' | 'offline'
  
  // 性能监控
  performanceMetrics: {
    pageLoadTime: number | null
    apiResponseTime: number | null
    renderTime: number | null
  }
  
  // 功能特性状态
  features: {
    aiChatEnabled: boolean
    knowledgeGraphEnabled: boolean
    taskManagementEnabled: boolean
    userManagementEnabled: boolean
    documentManagementEnabled: boolean
  }
  
  // Actions
  initialize: () => Promise<void>
  setLoading: (loading: LoadingState) => void
  setError: (error: string | null) => void
  setTheme: (theme: ThemeMode) => void
  setLanguage: (language: Language) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  updateConnectionStatus: (isOnline: boolean, quality?: 'fast' | 'slow' | 'offline') => void
  updatePerformanceMetrics: (metrics: Partial<AppState['performanceMetrics']>) => void
  toggleFeature: (feature: keyof AppState['features'], enabled?: boolean) => void
  reset: () => void
}

const getInitialState = () => ({
  isInitialized: false,
  loading: 'idle' as LoadingState,
  error: null,
  theme: (localStorage.getItem('theme') as ThemeMode) || 'light',
  language: (localStorage.getItem('language') as Language) || 'zh',
  sidebarOpen: true,
  sidebarCollapsed: false,
  isOnline: navigator.onLine,
  connectionQuality: 'fast' as const,
  performanceMetrics: {
    pageLoadTime: null,
    apiResponseTime: null,
    renderTime: null,
  },
  features: {
    aiChatEnabled: appConfig.features.aiChat,
    knowledgeGraphEnabled: appConfig.features.knowledgeGraph,
    taskManagementEnabled: appConfig.features.taskManagement,
    userManagementEnabled: appConfig.features.userManagement,
    documentManagementEnabled: appConfig.features.documentManagement,
  },
})

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      ...getInitialState(),

      initialize: async () => {
        try {
          set({ loading: 'pending' })
          
          // 初始化应用配置
          const savedTheme = localStorage.getItem('theme') as ThemeMode
          const savedLanguage = localStorage.getItem('language') as Language
          
          if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme)
          }
          
          if (savedLanguage) {
            document.documentElement.setAttribute('lang', savedLanguage)
          }
          
          // 监听网络状态变化
          const updateOnlineStatus = () => {
            const isOnline = navigator.onLine
            get().updateConnectionStatus(isOnline, isOnline ? 'fast' : 'offline')
          }
          
          window.addEventListener('online', updateOnlineStatus)
          window.addEventListener('offline', updateOnlineStatus)
          
          // 记录页面加载时间
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigation) {
            get().updatePerformanceMetrics({
              pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart
            })
          }
          
          set({ 
            isInitialized: true,
            loading: 'success' 
          })
        } catch (error) {
          console.error('App initialization failed:', error)
          set({ 
            loading: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setTheme: (theme) => {
        localStorage.setItem('theme', theme)
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },

      setLanguage: (language) => {
        localStorage.setItem('language', language)
        document.documentElement.setAttribute('lang', language)
        set({ language })
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      updateConnectionStatus: (isOnline, quality) => {
        set({ 
          isOnline, 
          connectionQuality: quality || (isOnline ? 'fast' : 'offline')
        })
      },

      updatePerformanceMetrics: (metrics) => {
        set((state) => ({
          performanceMetrics: {
            ...state.performanceMetrics,
            ...metrics
          }
        }))
      },

      toggleFeature: (feature, enabled) => {
        set((state) => ({
          features: {
            ...state.features,
            [feature]: enabled !== undefined ? enabled : !state.features[feature]
          }
        }))
      },

      reset: () => set(getInitialState()),
    }),
    { name: 'app-store' }
  )
)

// 便捷的hooks
export const useApp = () => {
  const store = useAppStore()
  return {
    // 状态
    isInitialized: store.isInitialized,
    loading: store.loading,
    error: store.error,
    theme: store.theme,
    language: store.language,
    sidebarOpen: store.sidebarOpen,
    sidebarCollapsed: store.sidebarCollapsed,
    isOnline: store.isOnline,
    connectionQuality: store.connectionQuality,
    performanceMetrics: store.performanceMetrics,
    features: store.features,

    // 方法
    initialize: store.initialize,
    setLoading: store.setLoading,
    setError: store.setError,
    setTheme: store.setTheme,
    setLanguage: store.setLanguage,
    toggleSidebar: store.toggleSidebar,
    setSidebarCollapsed: store.setSidebarCollapsed,
    updateConnectionStatus: store.updateConnectionStatus,
    updatePerformanceMetrics: store.updatePerformanceMetrics,
    toggleFeature: store.toggleFeature,
    reset: store.reset,
  }
}

// 主题相关hooks
export const useTheme = () => {
  const { theme, setTheme } = useApp()
  return { theme, setTheme }
}

// 语言相关hooks
export const useLanguage = () => {
  const { language, setLanguage } = useApp()
  return { language, setLanguage }
}

// 侧边栏相关hooks
export const useSidebar = () => {
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useApp()
  return { 
    sidebarOpen, 
    sidebarCollapsed, 
    toggleSidebar, 
    setSidebarCollapsed 
  }
}