import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { http } from '@/services/http'
import { authConfig, AuthStatus, AuthErrorType } from '@/config/auth-config'
import {
  storage,
  validator,
  errorHandler,
  sessionManager,
  deviceManager
} from '@/services/auth'
import { authLogger } from '@/utils/logger'

interface AuthUser {
  id: string
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  avatar_url?: string
  phone?: string
  bio?: string
  urls?: { value: string }[]
  date_of_birth?: string
  preferred_language?: string
  created_at: string
  updated_at?: string
  last_login?: string
  roles?: string[]
  permissions?: string[]
}

interface AuthSession {
  deviceId: string
  lastActivity: number
  expiresAt: number
  rememberMe: boolean
}

interface AuthError {
  type: AuthErrorType
  message: string
  code?: string
  details?: unknown
}

interface LoginAttempt {
  count: number
  lastAttempt: number
  lockedUntil?: number
}

interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
  deviceInfo?: unknown
}

interface AuthState {
  // 认证状态
  status: AuthStatus
  userInfo: AuthUser | null
  session: AuthSession | null
  error: AuthError | null

  // Token管理
  accessToken: string
  refreshToken: string
  tokenExpiresAt: number | null

  // 安全相关
  loginAttempts: LoginAttempt
  isLocked: boolean

  // 操作状态
  isLoading: boolean
  isRefreshing: boolean
  
  // Token监控
  tokenCheckInterval: number | null

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  logout: (everywhere?: boolean) => Promise<void>
  refreshAccessToken: () => Promise<void>
  getCurrentUser: () => Promise<void>
  checkAuthStatus: () => Promise<void>
  
  // Password management
  forgotPassword: (email: string) => Promise<{ message: string }>
  resetPassword: (email: string, verificationCode: string, newPassword: string) => Promise<{ message: string }>
  
  // Session management
  getUserSessions: () => Promise<AuthSession[]>
  revokeSession: (sessionId: string) => Promise<void>

  // Session管理
  extendSession: () => void
  checkSessionExpiry: () => boolean
  
  // Token监控
  startTokenMonitoring: () => void
  stopTokenMonitoring: () => void

  // 用户信息缓存管理
  saveUserToCache: (user: AuthUser) => void
  loadUserFromCache: () => AuthUser | null
  clearUserCache: () => void

  // 权限检查
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  hasAnyPermission: (permissions: string[]) => boolean

  // 状态管理
  setStatus: (status: AuthStatus) => void
  setUserInfo: (userInfo: AuthUser | null) => void
  setError: (error: AuthError | null) => void
  setLoading: (loading: boolean) => void
  setTokens: (accessToken: string, refreshToken?: string, rememberMe?: boolean) => void

  // 重置
  reset: () => void
  clearError: () => void
}

// 初始化状态
const getInitialState = () => {
  const accessToken = storage.getAccessToken() || ''
  const refreshToken = storage.getRefreshToken() || ''


  // Token管理由统一request模块自动处理，无需手动配置
  if (accessToken) {
  } else {
  }

  // 从缓存加载用户信息
  let cachedUserInfo: AuthUser | null = null
  try {
    const cached = localStorage.getItem('userinfo')
    if (cached) {
      const cacheData = JSON.parse(cached)
      const now = Date.now()
      const cacheAge = now - cacheData.timestamp
      
      // 缓存有效期：30分钟
      const CACHE_DURATION = 30 * 60 * 1000
      
      if (cacheAge <= CACHE_DURATION && cacheData.user) {
        cachedUserInfo = cacheData.user
      }
    }
  } catch (error) {
    console.warn('⚠️ [AUTH_STORE] 加载缓存用户信息失败:', error)
  }

  // 如果有access token但已过期，且有refresh token，设为IDLE让checkAuthStatus处理刷新
  // 如果没有token或没有refresh token且token过期，直接设为未认证状态
  const hasValidToken = accessToken && validator.isValidToken(accessToken)
  const shouldTryRefresh = accessToken && !hasValidToken && refreshToken
  
  return {
    status: (hasValidToken || shouldTryRefresh) ? AuthStatus.IDLE : AuthStatus.UNAUTHENTICATED,
    userInfo: cachedUserInfo,
    session: null,
    error: null,
    accessToken,
    refreshToken,
    tokenExpiresAt: accessToken ? validator.getTokenExpiration(accessToken)?.getTime() || null : null,
    loginAttempts: { count: 0, lastAttempt: 0 },
    isLocked: false,
    isLoading: false,
    isRefreshing: false,
    tokenCheckInterval: null,
  }
}

// 初始化token管理器的函数将在store创建后调用

export const useAuthStore = create<AuthState>()(devtools(
  subscribeWithSelector((set, get) => ({
    ...getInitialState(),

    // === 核心认证方法 ===
    login: async (credentials: LoginCredentials) => {
      const state = get()

      try {
        // 检查是否被锁定
        if (state.isLocked) {
          const now = Date.now()
          if (state.loginAttempts.lockedUntil && now < state.loginAttempts.lockedUntil) {
            const minutesLeft = Math.ceil((state.loginAttempts.lockedUntil - now) / 60000)
            throw new Error(`账户已被锁定，请等待 ${minutesLeft} 分钟后重试`)
          } else {
            // 锁定时间已过，重置锁定状态
            set({ isLocked: false, loginAttempts: { count: 0, lastAttempt: 0 } })
          }
        }

        set({ isLoading: true, error: null })
        get().setStatus(AuthStatus.LOADING)

        // 准备登录数据
        const loginPayload = {
          email: credentials.email,
          password: credentials.password
        }

        // 使用HTTP客户端发送登录请求
        const response = await http.post(authConfig.apiConfig.loginEndpoint, loginPayload)

        const { access_token, refresh_token } = response.data as {
          access_token: string
          refresh_token?: string
          token_type: string
        }

        // 存储令牌
        get().setTokens(access_token, refresh_token, credentials.rememberMe)

        // 创建会话
        const session: AuthSession = {
          deviceId: deviceManager.getDeviceFingerprint(),
          lastActivity: Date.now(),
          expiresAt: validator.getTokenExpiration(access_token)?.getTime() || 0,
          rememberMe: credentials.rememberMe || false,
        }

        set({
          session,
          loginAttempts: { count: 0, lastAttempt: 0 }
        })
        get().setStatus(AuthStatus.AUTHENTICATED)

        // 获取用户信息
        await get().getCurrentUser()

        // 确保状态已更新为已认证
        get().setStatus(AuthStatus.AUTHENTICATED)

        // 开始会话监控
        sessionManager.startSessionMonitoring()
        // 开始Token监控
        get().startTokenMonitoring()

      } catch (error: unknown) {
        const authError = errorHandler.handleAuthError(error)

        // 更新登录尝试次数
        const attempts = state.loginAttempts.count + 1
        const now = Date.now()

        let isLocked = false
        let lockedUntil: number | undefined

        if (attempts >= authConfig.sessionConfig.maxLoginAttempts) {
          isLocked = true
          lockedUntil = now + (authConfig.sessionConfig.lockoutDuration * 60 * 1000)
        }

        set({
          error: authError,
          loginAttempts: { count: attempts, lastAttempt: now, lockedUntil },
          isLocked
        })
        get().setStatus(AuthStatus.ERROR)

        throw authError
      } finally {
        set({ isLoading: false })
      }
    },

    logout: async (everywhere = false) => {
      try {
        set({ isLoading: true })

        // 调用后端登出接口
        if (get().accessToken) {
          try {
            if (everywhere) {
              // 调用退出所有设备接口
              await http.post(authConfig.apiConfig.logoutAllEndpoint)
            } else {
              // 调用单设备登出接口，需要传递refresh_token
              const refreshToken = get().refreshToken
              if (refreshToken) {
                await http.post(authConfig.apiConfig.logoutEndpoint, {
                  refresh_token: refreshToken
                })
              }
            }
          } catch (error) {
            authLogger.warn('Logout API call failed', error instanceof Error ? error : new Error(String(error)))
          }
        }

      } finally {
        // 清理本地状态
        get().reset()
      }
    },

    refreshAccessToken: async () => {
      const state = get()

      if (state.isRefreshing) return

      try {
        set({ isRefreshing: true })

        const refreshToken = state.refreshToken
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        const response = await http.post(authConfig.apiConfig.refreshEndpoint, {
          refresh_token: refreshToken
        })

        const { access_token, refresh_token: newRefreshToken } = response.data as {
          access_token: string
          refresh_token?: string
        }

        get().setTokens(
          access_token,
          newRefreshToken || refreshToken,
          state.session?.rememberMe
        )

        // 更新会话过期时间
        if (state.session) {
          set({
            session: {
              ...state.session,
              expiresAt: validator.getTokenExpiration(access_token)?.getTime() || 0
            }
          })
        }

      } catch (error) {
        authLogger.error('Token refresh failed', error instanceof Error ? error : new Error(String(error)))
        get().reset()
        throw error
      } finally {
        set({ isRefreshing: false })
      }
    },

    getCurrentUser: async () => {
      try {
        const response = await http.get(authConfig.apiConfig.userInfoEndpoint)
        
        const userData = response.data as AuthUser
        set({ userInfo: userData })
        
        // 缓存用户信息到本地存储
        get().saveUserToCache(userData)
        
        get().setStatus(AuthStatus.AUTHENTICATED)
      } catch (error) {
        console.error('❌ [AUTH_STORE] getCurrentUser失败:', error)
        authLogger.error('获取用户信息失败', error instanceof Error ? error : new Error(String(error)))
        // 不要立即重置，让拦截器处理token刷新
        get().setStatus(AuthStatus.ERROR)
        throw error
      }
    },

    // === 用户信息缓存管理 ===
    saveUserToCache: (user: AuthUser) => {
      try {
        const cacheData = {
          user,
          timestamp: Date.now(),
          version: '1.0'
        }
        localStorage.setItem('userinfo', JSON.stringify(cacheData))
      } catch (error) {
        console.warn('⚠️ [AUTH_STORE] 用户信息缓存失败:', error)
      }
    },

    loadUserFromCache: (): AuthUser | null => {
      try {
        const cached = localStorage.getItem('userinfo')
        if (!cached) return null

        const cacheData = JSON.parse(cached)
        const now = Date.now()
        const cacheAge = now - cacheData.timestamp
        
        // 缓存有效期：30分钟
        const CACHE_DURATION = 30 * 60 * 1000
        
        if (cacheAge > CACHE_DURATION) {
          localStorage.removeItem('userinfo')
          return null
        }

        return cacheData.user
      } catch (error) {
        console.warn('⚠️ [AUTH_STORE] 加载用户信息缓存失败:', error)
        localStorage.removeItem('userinfo')
        return null
      }
    },

    clearUserCache: () => {
      try {
        localStorage.removeItem('userinfo')
      } catch (error) {
        console.warn('⚠️ [AUTH_STORE] 清除用户信息缓存失败:', error)
      }
    },

    checkAuthStatus: async () => {
      const state = get()

      // 防止重复调用 - 如果正在检查或已经认证，直接返回
      if (state.isLoading || state.status === AuthStatus.LOADING) {
        return
      }

      if (state.status === AuthStatus.AUTHENTICATED && state.userInfo) {
        return
      }

      if (!state.accessToken) {
        get().setStatus(AuthStatus.UNAUTHENTICATED)
        return
      }

      // 🎯 主动Token管理：如果有refresh token就尝试刷新
      if (!validator.isValidToken(state.accessToken)) {
        
        if (state.refreshToken && !state.isRefreshing) {
          try {
            await get().refreshAccessToken()
            // 刷新后继续检查认证状态
          } catch (refreshError) {
            get().reset()
            return
          }
        } else {
          get().reset()
          return
        }
      }

      // 🔄 主动预刷新：如果有refresh token且token即将过期，提前刷新token（提前5分钟）
      if (validator.isTokenExpiringSoon(state.accessToken) && 
          state.refreshToken && 
          !state.isRefreshing) {
        try {
          await get().refreshAccessToken()
        } catch (refreshError) {
          // 预刷新失败不重置状态，继续使用当前token
        }
      }

      // 优化：先尝试从本地存储恢复用户信息
      const cachedUser = get().loadUserFromCache()
      if (cachedUser && validator.isValidToken(state.accessToken)) {
        set({ 
          userInfo: cachedUser,
          isLoading: false 
        })
        get().setStatus(AuthStatus.AUTHENTICATED)
        return
      }

      // 设置加载状态，防止并发调用
      set({ isLoading: true })
      get().setStatus(AuthStatus.LOADING)

      try {
        await get().getCurrentUser()
      } catch (error) {
        
        // 检查是否是401错误且有refresh token
        const isUnauthorized = error && typeof error === 'object' && 'status' in error && error.status === 401
        
        if (isUnauthorized && state.refreshToken && !state.isRefreshing) {
          try {
            await get().refreshAccessToken()
            // 刷新成功后重新获取用户信息
            await get().getCurrentUser()
          } catch (refreshError) {
            get().reset()
          }
        } else {
          get().reset()
        }
      } finally {
        set({ isLoading: false })
      }
    },

    // === 会话管理 ===
    extendSession: () => {
      const state = get()
      if (state.session) {
        set({
          session: {
            ...state.session,
            lastActivity: Date.now()
          }
        })
      }
    },

    checkSessionExpiry: () => {
      const state = get()
      if (!state.session) return false

      return Date.now() > state.session.expiresAt
    },

    // === Token监控 ===
    startTokenMonitoring: () => {
      const state = get()
      
      // 如果已经在监控，先停止
      if (state.tokenCheckInterval) {
        get().stopTokenMonitoring()
      }
      
      
      // 每30秒检查一次token状态
      const intervalId = window.setInterval(() => {
        const currentState = get()
        
        if (!currentState.accessToken || currentState.status === AuthStatus.UNAUTHENTICATED) {
          get().stopTokenMonitoring()
          return
        }
        
        // 🎯 如果有refresh token且token即将过期，主动刷新token
        if (validator.isTokenExpiringSoon(currentState.accessToken) && 
            currentState.refreshToken && 
            !currentState.isRefreshing) {
            
          get().refreshAccessToken().catch((error) => {
            console.error('❌ [AUTH_STORE] Token监控刷新失败:', error)
          })
        }
      }, authConfig.tokenConfig.expirationCheckInterval)
      
      set({ tokenCheckInterval: intervalId })
    },

    stopTokenMonitoring: () => {
      const state = get()
      
      if (state.tokenCheckInterval) {
        window.clearInterval(state.tokenCheckInterval)
        set({ tokenCheckInterval: null })
      }
    },

    // === 权限检查 ===
    hasRole: (role: string) => {
      const userInfo = get().userInfo
      return userInfo?.roles?.includes(role) || false
    },

    hasPermission: (permission: string) => {
      const userInfo = get().userInfo
      return userInfo?.permissions?.includes(permission) || false
    },

    hasAnyRole: (roles: string[]) => {
      const userInfo = get().userInfo
      if (!userInfo?.roles) return false
      return roles.some(role => userInfo.roles!.includes(role))
    },

    hasAnyPermission: (permissions: string[]) => {
      const userInfo = get().userInfo
      if (!userInfo?.permissions) return false
      return permissions.some(permission => userInfo.permissions!.includes(permission))
    },

    // === 状态管理 ===
    setStatus: (status: AuthStatus) => {
      set({ status })
    },

    setUserInfo: (userInfo: AuthUser | null) => set({ userInfo }),

    setError: (error: AuthError | null) => set({ error }),

    setLoading: (isLoading: boolean) => set({ isLoading }),

    setTokens: (accessToken: string, refreshToken?: string, rememberMe = false) => {
      storage.setAccessToken(accessToken, rememberMe)
      if (refreshToken) {
        storage.setRefreshToken(refreshToken, rememberMe)
      }

      // 不需要手动设置请求头，统一request模块会自动处理token注入

      set({
        accessToken,
        refreshToken: refreshToken || get().refreshToken,
        tokenExpiresAt: validator.getTokenExpiration(accessToken)?.getTime() || null
      })
      
    },

    reset: () => {
      storage.clearTokens()
      // token已由storage.clearTokens()清理
      sessionManager.stopSessionMonitoring()
      
      // 停止Token监控
      get().stopTokenMonitoring()
      
      // 清除用户信息缓存
      get().clearUserCache()

      set({
        userInfo: null,
        session: null,
        error: null,
        accessToken: '',
        refreshToken: '',
        tokenExpiresAt: null,
        loginAttempts: { count: 0, lastAttempt: 0 },
        isLocked: false,
        isLoading: false,
        isRefreshing: false,
        tokenCheckInterval: null,
      })
      get().setStatus(AuthStatus.UNAUTHENTICATED)
    },

    clearError: () => set({ error: null }),

    // === 密码管理 ===
    forgotPassword: async (email: string) => {
      try {
        set({ isLoading: true, error: null })
        
        const response = await http.post(authConfig.apiConfig.forgotPasswordEndpoint, {
          email
        })
        
        return response.data as { message: string }
      } catch (error) {
        const authError = errorHandler.handleAuthError(error)
        set({ error: authError })
        throw authError
      } finally {
        set({ isLoading: false })
      }
    },

    resetPassword: async (email: string, verificationCode: string, newPassword: string) => {
      try {
        set({ isLoading: true, error: null })
        
        const response = await http.post(authConfig.apiConfig.resetPasswordEndpoint, {
          email,
          verification_code: verificationCode,
          new_password: newPassword
        })
        
        return response.data as { message: string }
      } catch (error) {
        const authError = errorHandler.handleAuthError(error)
        set({ error: authError })
        throw authError
      } finally {
        set({ isLoading: false })
      }
    },

    // === 会话管理 ===
    getUserSessions: async () => {
      try {
        const response = await http.get(authConfig.apiConfig.sessionsEndpoint)
        return response.data as AuthSession[]
      } catch (error) {
        const authError = errorHandler.handleAuthError(error)
        set({ error: authError })
        throw authError
      }
    },

    revokeSession: async (sessionId: string) => {
      try {
        await http.delete(`${authConfig.apiConfig.sessionsEndpoint}/${sessionId}`)
      } catch (error) {
        const authError = errorHandler.handleAuthError(error)
        set({ error: authError })
        throw authError
      }
    },

  })),
  { name: 'auth-store' }
))

// 监听HTTP层的401错误通知，但避免重复刷新
if (typeof window !== 'undefined') {
  window.addEventListener('auth:token_invalid', (event) => {
    const detail = (event as CustomEvent).detail
    
    // 不重复处理，让现有的API调用错误处理逻辑处理
    // 这里只是记录日志，实际刷新由checkAuthStatus中的catch块处理
  })
}

// 便捷的hooks
export const useAuth = () => {
  const store = useAuthStore()
  return {
    // 状态
    status: store.status,
    userInfo: store.userInfo,
    session: store.session,
    error: store.error,
    isLoading: store.isLoading,
    isRefreshing: store.isRefreshing,
    isAuthenticated: store.status === AuthStatus.AUTHENTICATED,
    isLocked: store.isLocked,

    // 方法
    login: store.login,
    logout: store.logout,
    getCurrentUser: store.getCurrentUser,
    checkAuthStatus: store.checkAuthStatus,
    clearError: store.clearError,
    
    // 密码管理
    forgotPassword: store.forgotPassword,
    resetPassword: store.resetPassword,
    
    // 会话管理
    getUserSessions: store.getUserSessions,
    revokeSession: store.revokeSession,
    
    // Token监控
    startTokenMonitoring: store.startTokenMonitoring,
    stopTokenMonitoring: store.stopTokenMonitoring,

    // 权限检查
    hasRole: store.hasRole,
    hasPermission: store.hasPermission,
    hasAnyRole: store.hasAnyRole,
    hasAnyPermission: store.hasAnyPermission,
  }
}

// 权限相关hooks
export const usePermissions = () => {
  const { hasRole, hasPermission, hasAnyRole, hasAnyPermission } = useAuthStore()
  return { hasRole, hasPermission, hasAnyRole, hasAnyPermission }
}

// 监听认证状态变化
export const useAuthListener = (callback: (status: AuthStatus) => void) => {
  useAuthStore.subscribe(
    (state) => state.status,
    callback
  )
}
