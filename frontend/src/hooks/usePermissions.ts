import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth'

interface UsePermissionsReturn {
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  isSuperAdmin: boolean
  isTenantAdmin: boolean
  isOrgAdmin: boolean
}

export function usePermissions(): UsePermissionsReturn {
  const { userInfo } = useAuthStore()

  return useMemo(() => {
    const userRoles = userInfo?.roles || []
    const userPermissions = userInfo?.permissions || []

    const hasRole = (role: string): boolean => {
      return userRoles.includes(role)
    }

    const hasAnyRole = (roles: string[]): boolean => {
      return roles.some(role => userRoles.includes(role))
    }

    const hasPermission = (permission: string): boolean => {
      return userPermissions.includes(permission)
    }

    const hasAnyPermission = (permissions: string[]): boolean => {
      return permissions.some(permission => userPermissions.includes(permission))
    }

    const isSuperAdmin = hasRole('super_admin')
    const isTenantAdmin = hasRole('tenant_admin')
    const isOrgAdmin = hasRole('org_admin')

    return {
      hasRole,
      hasAnyRole,
      hasPermission,
      hasAnyPermission,
      isSuperAdmin,
      isTenantAdmin,
      isOrgAdmin,
    }
  }, [userInfo])
}