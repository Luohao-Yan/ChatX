import { createFileRoute } from '@tanstack/react-router'
import ManagementOverview from '@/features/management'
import { PermissionGuard } from '@/components/auth/permission-guard'

export const Route = createFileRoute('/_authenticated/management/')({
  component: () => (
    <PermissionGuard 
      roles={['super_admin', 'tenant_admin']}
      fallback={
        <div className="p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold">权限不足</h2>
          <p className="text-muted-foreground">您需要管理员权限才能访问此页面</p>
          <div className="mt-4 p-4 bg-muted rounded-lg text-left text-sm">
            <p><strong>所需权限:</strong> super_admin 或 tenant_admin 角色</p>
          </div>
        </div>
      }
    >
      <ManagementOverview />
    </PermissionGuard>
  ),
})