import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { http } from '@/lib/request'
import { authConfig, AuthStatus, AuthErrorType } from '@/config/auth-config'
import {
  storage,
  validator,
  errorHandler,
  sessionManager,
  deviceManager
} from '@/lib/auth-utils'
import { authLogger } from '@/lib/logger'

interface AuthUser {
  id: number
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  avatar_url?: string
  phone?: string
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
  user: AuthUser | null
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
  revokeSession: (sessionId: number) => Promise<void>

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
  setUser: (user: AuthUser | null) => void
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

  console.log('🔄 [AUTH_STORE] 初始化状态', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    accessToken: accessToken ? accessToken.substring(0, 20) + '...' : 'none',
    tokenLength: accessToken.length
  })

  // Token管理由统一request模块自动处理，无需手动配置
  if (accessToken) {
    console.log('✅ [AUTH_STORE] Token已存在，统一request模块会自动注入到请求中')
  } else {
    console.log('❌ [AUTH_STORE] 无Token')
  }

  return {
    status: accessToken ? AuthStatus.IDLE : AuthStatus.UNAUTHENTICATED,
    user: null,
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
      console.log('🔑 [AUTH_STORE] 开始login方法', { email: credentials.email })

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

        console.log('📝 [AUTH_STORE] 设置加载状态')
        set({ isLoading: true, error: null })
        get().setStatus(AuthStatus.LOADING)

        // 准备登录数据
        const loginPayload = {
          email: credentials.email,
          password: credentials.password
        }

        console.log('🌐 [AUTH_STORE] 发送登录请求到:', authConfig.apiConfig.loginEndpoint)
        // 使用HTTP客户端发送登录请求
        const response = await http.post(authConfig.apiConfig.loginEndpoint, loginPayload)

        console.log('📨 [AUTH_STORE] 登录响应状态:', response.status)
        const { access_token, refresh_token } = response.data as {
          access_token: string
          refresh_token?: string
          token_type: string
        }

        console.log('🎫 [AUTH_STORE] 获得访问令牌，长度:', access_token?.length)
        // 存储令牌
        get().setTokens(access_token, refresh_token, credentials.rememberMe)

        // 创建会话
        const session: AuthSession = {
          deviceId: deviceManager.getDeviceFingerprint(),
          lastActivity: Date.now(),
          expiresAt: validator.getTokenExpiration(access_token)?.getTime() || 0,
          rememberMe: credentials.rememberMe || false,
        }

        console.log('📊 [AUTH_STORE] 设置会话和认证状态')
        set({
          session,
          loginAttempts: { count: 0, lastAttempt: 0 }
        })
        get().setStatus(AuthStatus.AUTHENTICATED)

        console.log('👤 [AUTH_STORE] 开始获取用户信息')
        // 获取用户信息
        await get().getCurrentUser()

        console.log('✅ [AUTH_STORE] 用户信息获取完成，再次确认认证状态')
        // 确保状态已更新为已认证
        get().setStatus(AuthStatus.AUTHENTICATED)

        console.log('⏰ [AUTH_STORE] 开始会话监控和Token监控')
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
        console.log('👤 [AUTH_STORE] 调用getCurrentUser API:', authConfig.apiConfig.userInfoEndpoint)
        const response = await http.get(authConfig.apiConfig.userInfoEndpoint)
        console.log('📋 [AUTH_STORE] 用户信息响应状态:', response.status)
        console.log('👥 [AUTH_STORE] 用户数据:', response.data)
        
        const userData = response.data as AuthUser
        set({ user: userData })
        
        // 缓存用户信息到本地存储
        get().saveUserToCache(userData)
        
        get().setStatus(AuthStatus.AUTHENTICATED)
        console.log('✅ [AUTH_STORE] getCurrentUser完成，状态设为AUTHENTICATED')
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
        localStorage.setItem('chatx_user_cache', JSON.stringify(cacheData))
        console.log('💾 [AUTH_STORE] 用户信息已缓存')
      } catch (error) {
        console.warn('⚠️ [AUTH_STORE] 用户信息缓存失败:', error)
      }
    },

    loadUserFromCache: (): AuthUser | null => {
      try {
        const cached = localStorage.getItem('chatx_user_cache')
        if (!cached) return null

        const cacheData = JSON.parse(cached)
        const now = Date.now()
        const cacheAge = now - cacheData.timestamp
        
        // 缓存有效期：30分钟
        const CACHE_DURATION = 30 * 60 * 1000
        
        if (cacheAge > CACHE_DURATION) {
          console.log('⏰ [AUTH_STORE] 用户信息缓存已过期')
          localStorage.removeItem('chatx_user_cache')
          return null
        }

        console.log('💾 [AUTH_STORE] 加载缓存的用户信息')
        return cacheData.user
      } catch (error) {
        console.warn('⚠️ [AUTH_STORE] 加载用户信息缓存失败:', error)
        localStorage.removeItem('chatx_user_cache')
        return null
      }
    },

    clearUserCache: () => {
      try {
        localStorage.removeItem('chatx_user_cache')
        console.log('🗑️ [AUTH_STORE] 用户信息缓存已清除')
      } catch (error) {
        console.warn('⚠️ [AUTH_STORE] 清除用户信息缓存失败:', error)
      }
    },

    checkAuthStatus: async () => {
      const state = get()

      // 防止重复调用 - 如果正在检查或已经认证，直接返回
      if (state.isLoading || state.status === AuthStatus.LOADING) {
        console.log('⏳ [AUTH_STORE] 认证检查已在进行中，跳过重复调用')
        return
      }

      if (state.status === AuthStatus.AUTHENTICATED && state.user) {
        console.log('✅ [AUTH_STORE] 用户已认证，跳过重复检查')
        return
      }

      if (!state.accessToken) {
        get().setStatus(AuthStatus.UNAUTHENTICATED)
        return
      }

      // 🎯 主动Token管理：仅在用户选择"记住我"时才主动管理token
      const rememberMe = state.session?.rememberMe || false
      
      if (!validator.isValidToken(state.accessToken)) {
        console.log('❌ [AUTH_STORE] Token已过期')
        
        if (rememberMe && state.refreshToken && !state.isRefreshing) {
          console.log('🔄 [AUTH_STORE] 用户选择记住我，尝试自动刷新token')
          try {
            await get().refreshAccessToken()
            console.log('✅ [AUTH_STORE] Token主动刷新成功')
            // 刷新后继续检查认证状态
          } catch (refreshError) {
            console.log('❌ [AUTH_STORE] Token主动刷新失败，重置认证状态')
            get().reset()
            return
          }
        } else {
          console.log('❌ [AUTH_STORE] 用户未选择记住我或无refresh token，重置认证状态')
          get().reset()
          return
        }
      }

      // 🔄 主动预刷新：仅在"记住我"模式下提前刷新token（提前5分钟）
      if (rememberMe && 
          validator.isTokenExpiringSoon(state.accessToken) && 
          state.refreshToken && 
          !state.isRefreshing) {
        console.log('⏰ [AUTH_STORE] 记住我模式下Token即将过期，主动预刷新')
        try {
          await get().refreshAccessToken()
          console.log('✅ [AUTH_STORE] Token预刷新成功')
        } catch (refreshError) {
          console.log('⚠️ [AUTH_STORE] Token预刷新失败，继续使用当前token:', refreshError)
          // 预刷新失败不重置状态，继续使用当前token
        }
      }

      // 优化：先尝试从本地存储恢复用户信息
      const cachedUser = get().loadUserFromCache()
      if (cachedUser && validator.isValidToken(state.accessToken)) {
        console.log('💾 [AUTH_STORE] 从缓存恢复用户信息，跳过API请求')
        set({ 
          user: cachedUser,
          isLoading: false 
        })
        get().setStatus(AuthStatus.AUTHENTICATED)
        return
      }

      // 设置加载状态，防止并发调用
      set({ isLoading: true })
      get().setStatus(AuthStatus.LOADING)

      try {
        console.log('🔍 [AUTH_STORE] 开始认证状态检查（需要API请求）')
        await get().getCurrentUser()
      } catch (error) {
        console.log('❌ [AUTH_STORE] getCurrentUser失败:', error)
        
        // 检查是否是401错误且有refresh token
        const isUnauthorized = error && typeof error === 'object' && 'status' in error && error.status === 401
        
        if (isUnauthorized && state.refreshToken && !state.isRefreshing) {
          try {
            console.log('🔄 [AUTH_STORE] 检测到401错误，被动刷新token')
            await get().refreshAccessToken()
            // 刷新成功后重新获取用户信息
            await get().getCurrentUser()
            console.log('✅ [AUTH_STORE] Token被动刷新后重新获取用户信息成功')
          } catch (refreshError) {
            console.log('❌ [AUTH_STORE] Token被动刷新失败，重置认证状态:', refreshError)
            get().reset()
          }
        } else {
          console.log('❌ [AUTH_STORE] 无法恢复认证状态，重置')
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
      
      console.log('🔍 [AUTH_STORE] 启动Token监控')
      
      // 每30秒检查一次token状态
      const intervalId = window.setInterval(() => {
        const currentState = get()
        
        if (!currentState.accessToken || currentState.status === AuthStatus.UNAUTHENTICATED) {
          console.log('⏹️ [AUTH_STORE] 无token，停止监控')
          get().stopTokenMonitoring()
          return
        }
        
        // 🎯 仅在"记住我"模式下主动刷新token
        const rememberMe = currentState.session?.rememberMe || false
        
        if (validator.isTokenExpiringSoon(currentState.accessToken) && 
            currentState.refreshToken && 
            !currentState.isRefreshing) {
            
          if (rememberMe) {
            console.log('⏰ [AUTH_STORE] 记住我模式下Token监控检测到即将过期，主动刷新')
            get().refreshAccessToken().catch((error) => {
              console.error('❌ [AUTH_STORE] Token监控刷新失败:', error)
            })
          } else {
            console.log('⏰ [AUTH_STORE] 用户未选择记住我，Token监控不主动刷新token')
          }
        }
      }, authConfig.tokenConfig.expirationCheckInterval)
      
      set({ tokenCheckInterval: intervalId })
    },

    stopTokenMonitoring: () => {
      const state = get()
      
      if (state.tokenCheckInterval) {
        console.log('⏹️ [AUTH_STORE] 停止Token监控')
        window.clearInterval(state.tokenCheckInterval)
        set({ tokenCheckInterval: null })
      }
    },

    // === 权限检查 ===
    hasRole: (role: string) => {
      const user = get().user
      return user?.roles?.includes(role) || false
    },

    hasPermission: (permission: string) => {
      const user = get().user
      return user?.permissions?.includes(permission) || false
    },

    hasAnyRole: (roles: string[]) => {
      const user = get().user
      if (!user?.roles) return false
      return roles.some(role => user.roles!.includes(role))
    },

    hasAnyPermission: (permissions: string[]) => {
      const user = get().user
      if (!user?.permissions) return false
      return permissions.some(permission => user.permissions!.includes(permission))
    },

    // === 状态管理 ===
    setStatus: (status: AuthStatus) => {
      const currentStatus = get().status
      if (currentStatus !== status) {
        console.log('🔍 [AUTH_STORE] 认证状态变化', {
          from: currentStatus,
          to: status,
          isAuthenticated: status === AuthStatus.AUTHENTICATED,
          hasUser: !!get().user,
          userRoles: get().user?.roles,
          userPermissions: get().user?.permissions
        })
      }
      set({ status })
    },

    setUser: (user: AuthUser | null) => set({ user }),

    setError: (error: AuthError | null) => set({ error }),

    setLoading: (isLoading: boolean) => set({ isLoading }),

    setTokens: (accessToken: string, refreshToken?: string, rememberMe = false) => {
      console.log('💾 [AUTH_STORE] 保存Token', {
        accessTokenLength: accessToken.length,
        hasRefreshToken: !!refreshToken,
        rememberMe: rememberMe,
        tokenPreview: accessToken.substring(0, 20) + '...'
      })
      
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
      
      console.log('✅ [AUTH_STORE] Token保存完成')
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
        user: null,
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

    revokeSession: async (sessionId: number) => {
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
    console.log('🚨 [AUTH_STORE] 收到HTTP层401通知，时间戳:', detail.timestamp)
    
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
    user: store.user,
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
