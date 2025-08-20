import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface PermissionGuardProps {
  children: ReactNode
  roles?: string[]
  permissions?: string[]
  requireAll?: boolean // 是否需要满足所有条件，默认为满足任一条件
  fallback?: ReactNode
}

export function PermissionGuard({
  children,
  roles = [],
  permissions = [],
  requireAll = false,
  fallback = null,
}: PermissionGuardProps) {
  const { hasAnyRole, hasRole, hasAnyPermission, hasPermission } = usePermissions()

  const hasRequiredRoles = (): boolean => {
    if (roles.length === 0) return true
    
    if (requireAll) {
      return roles.every(role => hasRole(role))
    } else {
      return hasAnyRole(roles)
    }
  }

  const hasRequiredPermissions = (): boolean => {
    if (permissions.length === 0) return true
    
    if (requireAll) {
      return permissions.every(permission => hasPermission(permission))
    } else {
      return hasAnyPermission(permissions)
    }
  }

  const hasAccess = hasRequiredRoles() && hasRequiredPermissions()

  return hasAccess ? <>{children}</> : <>{fallback}</>
}