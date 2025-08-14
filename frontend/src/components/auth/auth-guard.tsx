/**
 * 认证守卫组件
 * 提供路由级别的认证保护
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useAuth, useAuthGuard, useAutoLogin } from '@/hooks/use-auth'
import { AuthStatus } from '@/config/auth-config'
import { routeValidator } from '@/services/auth'
import { authLogger } from '@/utils/logger'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
  requireAll?: boolean // true: 需要所有权限, false: 需要任一权限
}

export function AuthGuard({
  children,
  fallback,
  requiredRoles = [],
  requiredPermissions = [],
  requireAll = false,
}: AuthGuardProps) {
  const router = useRouter()
  const { 
    isAuthenticated, 
    status, 
    hasRole, 
    hasPermission, 
    hasAnyRole, 
    hasAnyPermission 
  } = useAuth()
  
  const { checkAuth, isChecking } = useAuthGuard()
  const { isChecking: isAutoLoginChecking } = useAutoLogin()
  const [hasAccess, setHasAccess] = useState(false)

  // 检查权限
  const checkPermissions = () => {
    if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
      return true
    }

    const roleCheck = requiredRoles.length === 0 || 
      (requireAll ? 
        requiredRoles.every(role => hasRole(role)) : 
        hasAnyRole(requiredRoles)
      )

    const permissionCheck = requiredPermissions.length === 0 || 
      (requireAll ? 
        requiredPermissions.every(permission => hasPermission(permission)) : 
        hasAnyPermission(requiredPermissions)
      )

    const result = roleCheck && permissionCheck
    
    // 只在权限检查失败时输出日志
    if (!result) {
      console.warn('❌ [AUTH_GUARD] 权限检查失败', {
        requiredRoles,
        requiredPermissions,
        requireAll,
        roleCheck,
        permissionCheck
      })
    }

    return result
  }

  useEffect(() => {
    const performAuthCheck = async () => {
      const currentPath = window.location.pathname
      
      authLogger.debug('AuthGuard: Starting auth check', {
        currentPath,
        isAuthenticated,
        status,
        isAutoLoginChecking,
      })
      
      // 如果是公开路由，直接允许访问
      if (routeValidator.isPublicRoute(currentPath)) {
        authLogger.debug('AuthGuard: Public route accessed', { currentPath })
        setHasAccess(true)
        return
      }

      // 如果已经认证，直接检查权限
      if (isAuthenticated && status === AuthStatus.AUTHENTICATED) {
        const permissionResult = checkPermissions()
        
        if (!permissionResult) {
          authLogger.warn('AuthGuard: Access denied due to insufficient permissions', {
            path: currentPath,
            requiredRoles,
            requiredPermissions,
            requireAll,
          })
          
          router.navigate({ to: '/403' })
          setHasAccess(false)
          return
        }
        
        authLogger.debug('AuthGuard: Permission check passed')
        setHasAccess(true)
      } else if (status === AuthStatus.UNAUTHENTICATED) {
        // 明确的未认证状态，重定向到登录页
        authLogger.info('AuthGuard: User unauthenticated, redirecting to login')
        router.navigate({ 
          to: '/sign-in',
          search: { returnUrl: currentPath }
        })
        setHasAccess(false)
      } else if (status === AuthStatus.LOADING || isAutoLoginChecking) {
        // 认证状态正在检查中，保持等待
        authLogger.debug('AuthGuard: Authentication check in progress')
        setHasAccess(false)
      } else {
        // 其他状态，尝试通过checkAuth检查
        authLogger.debug('AuthGuard: Attempting manual auth check')
        const authResult = await checkAuth(currentPath)
        if (authResult && isAuthenticated) {
          const permissionResult = checkPermissions()
          setHasAccess(permissionResult)
        } else {
          setHasAccess(false)
        }
      }
    }

    performAuthCheck()
  }, [
    isAuthenticated,
    status,
    isAutoLoginChecking,
    isChecking,
    requiredRoles,
    requiredPermissions,
    requireAll,
    checkAuth,
    router,
  ])

  // 企业级渲染逻辑 - 清晰的优先级顺序
  
  // 1. 如果有访问权限，显示内容
  if (hasAccess) {
    return <>{children}</>
  }

  // 2. 如果正在加载认证状态，显示加载状态  
  if (isAutoLoginChecking || status === AuthStatus.LOADING) {
    return fallback || <AuthLoadingFallback />
  }

  // 3. 如果认证失败，显示错误状态
  if (status === AuthStatus.ERROR) {
    return fallback || <AuthErrorFallback />
  }

  // 4. 其他情况（包括重定向进行中）不显示任何内容
  return null
}

// 认证加载状态组件
function AuthLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[400px]">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 认证错误状态组件
function AuthErrorFallback() {
  const router = useRouter()
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[400px]">
        <CardContent className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">认证失败</h2>
          <p className="text-sm text-muted-foreground mb-4">
            无法验证您的身份，请重新登录
          </p>
          <button
            onClick={() => router.navigate({ to: '/sign-in' })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            前往登录
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

// 权限检查Hook组件
interface RequireAuthProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  return (
    <AuthGuard fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

// 角色检查组件
interface RequireRoleProps {
  role: string | string[]
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAll?: boolean
}

export function RequireRole({ 
  role, 
  children, 
  fallback, 
  requireAll = false 
}: RequireRoleProps) {
  const roles = Array.isArray(role) ? role : [role]
  
  return (
    <AuthGuard 
      requiredRoles={roles} 
      requireAll={requireAll}
      fallback={fallback}
    >
      {children}
    </AuthGuard>
  )
}

// 权限检查组件
interface RequirePermissionProps {
  permission: string | string[]
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAll?: boolean
}

export function RequirePermission({ 
  permission, 
  children, 
  fallback, 
  requireAll = false 
}: RequirePermissionProps) {
  const permissions = Array.isArray(permission) ? permission : [permission]
  
  return (
    <AuthGuard 
      requiredPermissions={permissions} 
      requireAll={requireAll}
      fallback={fallback}
    >
      {children}
    </AuthGuard>
  )
}

// 条件渲染组件
interface ConditionalRenderProps {
  condition: 'authenticated' | 'unauthenticated' | 'loading' | 'error'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ConditionalRender({ 
  condition, 
  children, 
  fallback 
}: ConditionalRenderProps) {
  const { status, isAuthenticated } = useAuth()
  
  const shouldRender = () => {
    switch (condition) {
      case 'authenticated':
        return isAuthenticated
      case 'unauthenticated':
        return status === AuthStatus.UNAUTHENTICATED
      case 'loading':
        return status === AuthStatus.LOADING
      case 'error':
        return status === AuthStatus.ERROR
      default:
        return false
    }
  }
  
  return shouldRender() ? <>{children}</> : <>{fallback}</>
}