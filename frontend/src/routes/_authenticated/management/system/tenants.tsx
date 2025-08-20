import { createFileRoute } from '@tanstack/react-router'
import TenantManagement from '@/features/management/tenant'
import { useAuth } from '@/stores/auth'

export const Route = createFileRoute('/_authenticated/management/system/tenants')({
  component: () => {
    // 临时调试组件
    const DebugPermissionGuard = () => {
      const { userInfo } = useAuth()
      
      console.log('🔐 [TenantRoute] 当前用户信息:', userInfo)
      console.log('🔐 [TenantRoute] 用户角色:', userInfo?.roles)
      console.log('🔐 [TenantRoute] 是否超级用户:', userInfo?.is_superuser)
      
      // 检查是否有super_admin角色或者是超级用户
      const hasSuperAdminRole = userInfo?.roles?.includes('super_admin')
      const isSuperUser = userInfo?.is_superuser
      const hasAccess = hasSuperAdminRole || isSuperUser
      
      console.log('🔐 [TenantRoute] 访问权限检查:', {
        hasSuperAdminRole,
        isSuperUser,
        hasAccess
      })
      
      if (!hasAccess) {
        return (
          <div className="p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold">权限不足</h2>
            <p className="text-muted-foreground">您需要超级管理员权限才能访问此页面</p>
            <div className="mt-4 p-4 bg-muted rounded-lg text-left text-sm">
              <p><strong>调试信息:</strong></p>
              <p>用户角色: {JSON.stringify(userInfo?.roles || [])}</p>
              <p>是否超级用户: {String(userInfo?.is_superuser || false)}</p>
              <p>所需权限: super_admin 角色或 is_superuser=true</p>
            </div>
          </div>
        )
      }
      
      return <TenantManagement />
    }
    
    return <DebugPermissionGuard />
  },
})