/**
 * 认证提供器
 * 应用级别的认证初始化和管理
 */

import React, { useEffect, useCallback, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useAuth, useAuthListener } from '@/hooks/use-auth'
import { AuthStatus } from '@/config/auth-config'
// 统一request模块已集成token管理，提供更简洁的企业级解决方案
import { authLogger, logger } from '@/utils/logger'
import { AuthGuard } from './auth-guard'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const { status, user } = useAuth()
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  // 认证系统已通过统一request模块自动初始化

  // 设置用户上下文
  useEffect(() => {
    if (user) {
      logger.setUserContext(user.id.toString(), user.email)
    } else {
      logger.clearUserContext()
    }
  }, [user])

  // 初始认证检查 - 由AuthGuard的useAutoLogin统一处理，避免重复调用
  useEffect(() => {
    // 设置初始检查标志，但不重复执行认证检查
    if (status !== AuthStatus.IDLE || initialCheckDone) return
    
    // 只标记为已检查，实际检查由useAutoLogin处理
    const timer = setTimeout(() => {
      setInitialCheckDone(true)
    }, 100) // 短暂延迟确保useAutoLogin先执行
    
    return () => clearTimeout(timer)
  }, [status, initialCheckDone])

  // 监听认证状态变化
  const handleAuthStatusChange = useCallback((newStatus: AuthStatus) => {
    authLogger.info('Auth status changed', { from: status, to: newStatus })

    switch (newStatus) {
      case AuthStatus.UNAUTHENTICATED:
        // 如果当前不在登录页面，重定向到登录页
        const currentPath = window.location.pathname
        console.log('🚨 [AUTH_PROVIDER] UNAUTHENTICATED状态处理', { currentPath })
        
        if (!currentPath.startsWith('/sign-in') && !currentPath.startsWith('/sign-up')) {
          authLogger.info('Redirecting to login due to unauthenticated status')
          
          // 避免将错误页面作为返回地址
          const validReturnUrl = currentPath.match(/^\/(403|404|500)/) ? '/' : currentPath
          console.log('🎯 [AUTH_PROVIDER] 设置returnUrl', { original: currentPath, final: validReturnUrl })
          
          router.navigate({ 
            to: '/sign-in',
            search: { returnUrl: validReturnUrl }
          })
        }
        break

      case AuthStatus.EXPIRED:
        console.log('🚨 [AUTH_PROVIDER] EXPIRED状态处理')
        authLogger.info('Session expired, redirecting to login')
        
        // 避免将错误页面作为返回地址
        const expiredPath = window.location.pathname
        const validExpiredUrl = expiredPath.match(/^\/(403|404|500)/) ? '/' : expiredPath
        console.log('🎯 [AUTH_PROVIDER] 过期重定向', { original: expiredPath, final: validExpiredUrl })
        
        router.navigate({ 
          to: '/sign-in',
          search: { returnUrl: validExpiredUrl }
        })
        break

      case AuthStatus.ERROR:
        authLogger.error('Auth error occurred')
        break
    }
  }, [router, status])

  useAuthListener(handleAuthStatusChange)

  // 监听全局认证事件
  useEffect(() => {
    const handleUnauthorized = (event: CustomEvent) => {
      authLogger.warn('Unauthorized access detected', event.detail)
      const currentPath = window.location.pathname
      router.navigate({ 
        to: '/sign-in',
        search: { returnUrl: currentPath }
      })
    }

    const handleForbidden = (event: CustomEvent) => {
      authLogger.warn('Forbidden access detected', event.detail)
      router.navigate({ to: '/403' })
    }

    const handleSessionTimeout = () => {
      authLogger.info('Session timeout detected')
      router.navigate({ 
        to: '/sign-in',
        search: { 
          returnUrl: window.location.pathname,
          reason: 'session-timeout'
        }
      })
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized as EventListener)
    window.addEventListener('auth:forbidden', handleForbidden as EventListener)
    window.addEventListener('auth:session-timeout', handleSessionTimeout)

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized as EventListener)
      window.removeEventListener('auth:forbidden', handleForbidden as EventListener)
      window.removeEventListener('auth:session-timeout', handleSessionTimeout)
    }
  }, [router])

  // 为所有子组件提供认证保护
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  )
}

// 高阶组件：为页面添加认证保护
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthProvider>
        <Component {...props} />
      </AuthProvider>
    )
  }
}

// 高阶组件：为页面添加角色保护
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: string[],
  requireAll = false
) {
  return function RoleProtectedComponent(props: P) {
    return (
      <AuthProvider>
        <AuthGuard requiredRoles={requiredRoles} requireAll={requireAll}>
          <Component {...props} />
        </AuthGuard>
      </AuthProvider>
    )
  }
}

// 高阶组件：为页面添加权限保护
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string[],
  requireAll = false
) {
  return function PermissionProtectedComponent(props: P) {
    return (
      <AuthProvider>
        <AuthGuard requiredPermissions={requiredPermissions} requireAll={requireAll}>
          <Component {...props} />
        </AuthGuard>
      </AuthProvider>
    )
  }
}