import { createFileRoute } from '@tanstack/react-router'
import TenantUsersManagement from '@/features/management/users'
import { PermissionGuard } from '@/components/auth/permission-guard'

export const Route = createFileRoute('/_authenticated/management/users')({
  component: () => (
    <PermissionGuard 
      roles={['super_admin', 'tenant_admin']} 
      fallback={<div className="p-8 text-center">您没有权限访问此页面</div>}
    >
      <TenantUsersManagement />
    </PermissionGuard>
  ),
})