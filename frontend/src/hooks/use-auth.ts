/**
 * 认证相关Hooks
 * 提供便捷的认证状态管理和操作
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth'
import { AuthStatus, AuthErrorType } from '@/config/auth-config'
import { routeValidator } from '@/services/auth'
import { authLogger } from '@/utils/logger'

// 认证Hook
export const useAuth = () => {
  const store = useAuthStore()
  
  // 移除hook级别的日志输出，避免重复（日志已在store中处理）
  
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
    
    // 权限检查
    hasRole: store.hasRole,
    hasPermission: store.hasPermission,
    hasAnyRole: store.hasAnyRole,
    hasAnyPermission: store.hasAnyPermission,
  }
}

// 权限Hook
export const usePermissions = () => {
  const { hasRole, hasPermission, hasAnyRole, hasAnyPermission, user } = useAuth()
  
  return {
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAnyPermission,
    roles: user?.roles || [],
    permissions: user?.permissions || [],
  }
}

// 路由保护Hook
export const useAuthGuard = () => {
  const router = useRouter()
  const { isAuthenticated, status, checkAuthStatus } = useAuth()
  const [isChecking, setIsChecking] = useState(false) // 修复：初始状态应为false

  const redirectToLogin = useCallback((returnUrl?: string) => {
    // 避免将错误页面作为返回地址
    const validReturnUrl = returnUrl?.match(/^\/(403|404|500)/) ? undefined : returnUrl
    const loginUrl = routeValidator.getLoginUrl(validReturnUrl)
    
    authLogger.info('Redirecting to login', { loginUrl, returnUrl: validReturnUrl })
    router.navigate({ to: loginUrl })
  }, [router])

  const checkAuth = useCallback(async (pathname?: string) => {
    setIsChecking(true)
    
    try {
      // 检查当前路径是否需要认证
      const currentPath = pathname || window.location.pathname
      
      authLogger.debug('AuthGuard: checkAuth started', { 
        currentPath, 
        isAuthenticated, 
        status 
      })
      
      if (routeValidator.isPublicRoute(currentPath)) {
        authLogger.debug('Public route accessed', { path: currentPath })
        return true
      }

      // 需要认证的路由
      if (!isAuthenticated && status !== AuthStatus.LOADING) {
        authLogger.info('Unauthenticated access to protected route', { path: currentPath })
        redirectToLogin(currentPath)
        return false
      }

      // 检查认证状态
      if (isAuthenticated) {
        // 已认证用户直接返回true，不需要额外检查
        authLogger.debug('User authenticated, access granted')
        return true
      }

      authLogger.debug('Auth state uncertain, denying access')
      return false
      
    } catch (error) {
      authLogger.error('Auth guard check failed', error instanceof Error ? error : new Error(String(error)))
      redirectToLogin()
      return false
    } finally {
      authLogger.debug('AuthGuard: checkAuth completed')
      setIsChecking(false)
    }
  }, [isAuthenticated, status, checkAuthStatus, redirectToLogin])

  return {
    checkAuth,
    isChecking,
    redirectToLogin,
    isAuthenticated,
  }
}

// 会话监控Hook
export const useSessionMonitor = () => {
  const { session, logout, status } = useAuth()
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!session || status !== AuthStatus.AUTHENTICATED) {
      setTimeRemaining(null)
      return
    }

    const updateTimeRemaining = () => {
      const now = Date.now()
      const remaining = Math.max(0, session.expiresAt - now)
      setTimeRemaining(remaining)

      // 如果会话已过期，自动登出
      if (remaining === 0) {
        authLogger.info('Session expired, logging out')
        logout()
      }
    }

    // 立即更新一次
    updateTimeRemaining()

    // 每分钟更新一次
    const interval = setInterval(updateTimeRemaining, 60000)

    return () => clearInterval(interval)
  }, [session, status, logout])

  // 格式化剩余时间
  const formatTimeRemaining = useCallback(() => {
    if (!timeRemaining) return null

    const minutes = Math.floor(timeRemaining / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}天`
    if (hours > 0) return `${hours}小时${minutes % 60}分钟`
    return `${minutes}分钟`
  }, [timeRemaining])

  // 检查是否即将过期（15分钟内）
  const isExpiringSoon = useCallback(() => {
    return timeRemaining !== null && timeRemaining < 15 * 60 * 1000
  }, [timeRemaining])

  return {
    timeRemaining,
    formatTimeRemaining,
    isExpiringSoon,
    sessionActive: timeRemaining !== null && timeRemaining > 0,
  }
}

// 用户活动监控Hook
export const useUserActivity = () => {
  const { isAuthenticated } = useAuth()
  const store = useAuthStore()
  const [lastActivity, setLastActivity] = useState(Date.now())

  useEffect(() => {
    if (!isAuthenticated) return

    const updateActivity = () => {
      const now = Date.now()
      setLastActivity(now)
      store.extendSession()
    }

    // 监听的用户活动事件
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
    }
  }, [isAuthenticated, store])

  // 获取非活动时间
  const getInactiveTime = useCallback(() => {
    return Date.now() - lastActivity
  }, [lastActivity])

  // 检查是否长时间非活动（超过30分钟）
  const isInactive = useCallback(() => {
    const inactiveTime = getInactiveTime()
    return inactiveTime > 30 * 60 * 1000 // 30分钟
  }, [getInactiveTime])

  return {
    lastActivity,
    getInactiveTime,
    isInactive,
  }
}

// 登录状态监听Hook
export const useAuthListener = (callback: (status: AuthStatus) => void) => {
  const { status } = useAuth()

  useEffect(() => {
    callback(status)
  }, [status, callback])

  useEffect(() => {
    const handleAuthEvents = (event: CustomEvent) => {
      authLogger.info('Auth event received', { type: event.type, detail: event.detail })
      
      switch (event.type) {
        case 'auth:unauthorized':
          callback(AuthStatus.UNAUTHENTICATED)
          break
        case 'auth:session-timeout':
          callback(AuthStatus.EXPIRED)
          break
        case 'auth:forbidden':
          callback(AuthStatus.ERROR)
          break
      }
    }

    // 监听全局认证事件
    window.addEventListener('auth:unauthorized', handleAuthEvents as EventListener)
    window.addEventListener('auth:session-timeout', handleAuthEvents as EventListener)
    window.addEventListener('auth:forbidden', handleAuthEvents as EventListener)

    return () => {
      window.removeEventListener('auth:unauthorized', handleAuthEvents as EventListener)
      window.removeEventListener('auth:session-timeout', handleAuthEvents as EventListener)
      window.removeEventListener('auth:forbidden', handleAuthEvents as EventListener)
    }
  }, [callback])
}

// 错误处理Hook
export const useAuthError = () => {
  const { error, clearError } = useAuth()
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set())

  // 检查错误是否已被忽略
  const isErrorDismissed = useCallback((errorType: AuthErrorType) => {
    return dismissedErrors.has(errorType)
  }, [dismissedErrors])

  // 忽略错误
  const dismissError = useCallback((errorType: AuthErrorType) => {
    setDismissedErrors(prev => new Set(prev).add(errorType))
  }, [])

  // 清除所有忽略的错误
  const clearDismissedErrors = useCallback(() => {
    setDismissedErrors(new Set())
  }, [])

  // 是否显示错误
  const shouldShowError = useCallback(() => {
    return error && !isErrorDismissed(error.type)
  }, [error, isErrorDismissed])

  return {
    error,
    clearError,
    dismissError,
    isErrorDismissed,
    clearDismissedErrors,
    shouldShowError,
  }
}

// 自动登录Hook（记住我功能）
export const useAutoLogin = () => {
  const { checkAuthStatus, isAuthenticated, status, isLoading } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false)

  useEffect(() => {
    const attemptAutoLogin = async () => {
      if (autoLoginAttempted || isAuthenticated || isLoading) {
        setIsChecking(false)
        return
      }

      setAutoLoginAttempted(true)
      
      try {
        authLogger.info('Attempting auto login')
        await checkAuthStatus()
      } catch (error) {
        authLogger.warn('Auto login failed', error instanceof Error ? error : new Error(String(error)))
      } finally {
        setIsChecking(false)
      }
    }

    if (status === AuthStatus.IDLE && !autoLoginAttempted && !isLoading) {
      attemptAutoLogin()
    } else if (status !== AuthStatus.IDLE || autoLoginAttempted) {
      setIsChecking(false)
    }
  }, [checkAuthStatus, isAuthenticated, status, autoLoginAttempted, isLoading])

  return {
    isChecking,
    autoLoginAttempted,
  }
}