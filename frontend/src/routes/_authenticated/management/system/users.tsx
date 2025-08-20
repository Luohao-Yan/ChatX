import { createFileRoute } from '@tanstack/react-router'
import SystemUsersManagement from '@/features/management/system/users'
import { PermissionGuard } from '@/components/auth/permission-guard'

export const Route = createFileRoute('/_authenticated/management/system/users')({
  component: () => (
    <PermissionGuard 
      roles={['super_admin']} 
      fallback={<div className="p-8 text-center">您没有权限访问此页面</div>}
    >
      <SystemUsersManagement />
    </PermissionGuard>
  ),
})