/**
 * Organization Hierarchy Management
 * 组织层级管理 - Presentation Layer
 * 
 * 遵循项目全局DDD架构：
 * - Domain Layer: @/types/organization.types.ts
 * - Application Layer: @/hooks/useOrganization*, @/stores/
 * - Infrastructure Layer: @/services/api/organization
 * - Presentation Layer: 当前组件
 */

// import { useTranslation } from 'react-i18next' // Commented out until i18n is needed
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Infrastructure Layer - API & Components
import { OrganizationForm } from '../components/organization-form'
import { OrganizationRecycleBin } from '../components/organization-recycle-bin'
import { TenantSelector } from '../../users/components/tenant-selector'

// Application Layer - Business Logic Hooks
import { useTenantManagement } from '@/hooks/useTenantManagement'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import { useOrganizationActions } from '@/hooks/useOrganizationActions'
import { useAuth } from '@/stores/auth'

// Presentation Layer - UI Components
import { OrganizationStatsCards } from './components/OrganizationStatsCards'
import { OrganizationTreeTable } from './components/OrganizationTreeTable'
import { OrganizationToolbar } from './components/OrganizationToolbar'

export default function OrganizationHierarchy() {
  // const { t } = useTranslation() // Commented out until i18n is needed
  const { userInfo: currentUser } = useAuth()

  // Application Layer - 业务逻辑Hooks
  const {
    currentTenantInfo,
    availableTenants,
    loadingTenants,
    isSuperAdmin,
    handleTenantSwitch
  } = useTenantManagement()

  const {
    organizations,
    organizationTree,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    fetchOrganizations,
    deleteOrganization
  } = useOrganizationData({ currentTenantInfo, isSuperAdmin: isSuperAdmin || false })

  const {
    isAddDialogOpen,
    editingOrg,
    deletingOrg,
    viewingOrg,
    isRecycleBinOpen,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    openViewDialog,
    closeViewDialog,
    openRecycleBin,
    closeRecycleBin
  } = useOrganizationActions()

  // 表单成功处理
  const handleFormSuccess = () => {
    closeCreateDialog()
    closeEditDialog()
    fetchOrganizations()
  }

  // 确认删除处理
  const handleConfirmDelete = async () => {
    if (deletingOrg) {
      await deleteOrganization(deletingOrg)
      closeDeleteDialog()
    }
  }

  return (
    <>
      <Header>
        <Breadcrumb
          items={[
            { label: '管理中心', href: '/management' },
            { label: '组织架构', href: '/management/organization' },
            { label: '组织层级' }
          ]}
        />
        <HeaderActions>
        </HeaderActions>
      </Header>

      <Main className="container mx-auto p-6">
        {/* 租户选择器 - 仅超级管理员可见 */}
        {isSuperAdmin && (
          <div className="mb-6">
            <TenantSelector
              currentUser={currentUser}
              currentTenantInfo={currentTenantInfo}
              availableTenants={availableTenants}
              loadingTenants={loadingTenants}
              isSuperAdmin={isSuperAdmin}
              onTenantSwitch={handleTenantSwitch}
            />
          </div>
        )}

        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">组织层级</h1>
          <p className="text-muted-foreground">
            管理组织架构的层级关系，包括公司、部门和团队的创建与编辑
          </p>
        </div>

        {/* 统计卡片 */}
        <OrganizationStatsCards stats={stats} loading={loading} />

        {/* 工具栏 */}
        <OrganizationToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={fetchOrganizations}
          onOpenRecycleBin={openRecycleBin}
          onCreateOrganization={openCreateDialog}
          loading={loading}
        />

        {/* 组织架构列表 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">组织架构列表</h2>
            <p className="text-sm text-muted-foreground">
              查看和管理所有组织的层级关系
            </p>
          </div>

          <OrganizationTreeTable
            organizationTree={organizationTree}
            loading={loading}
            onView={openViewDialog}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </div>

        {/* 查看组织详情对话框 */}
        <Dialog open={!!viewingOrg} onOpenChange={closeViewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>组织详情</DialogTitle>
              <DialogDescription>
                查看组织的详细信息
              </DialogDescription>
            </DialogHeader>
            {viewingOrg && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">组织名称</label>
                    <p className="text-sm font-semibold">{viewingOrg.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">显示名称</label>
                    <p className="text-sm">{viewingOrg.display_name || '未设置'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">层级</label>
                    <p className="text-sm">第 {viewingOrg.level} 层</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">成员数量</label>
                    <p className="text-sm">{viewingOrg.member_count} 人</p>
                  </div>
                </div>
                {viewingOrg.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">描述</label>
                    <p className="text-sm">{viewingOrg.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">状态</label>
                    <p className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        viewingOrg.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {viewingOrg.is_active ? '激活' : '停用'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">创建时间</label>
                    <p className="text-sm">{new Date(viewingOrg.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 创建组织对话框 */}
        <Dialog open={isAddDialogOpen} onOpenChange={closeCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添加新组织</DialogTitle>
              <DialogDescription>
                创建新的组织单元，可以是公司、部门或团队
              </DialogDescription>
            </DialogHeader>
            <OrganizationForm
              parentOrganizations={organizations}
              currentTenantId={currentTenantInfo?.id}
              onSuccess={handleFormSuccess}
              onCancel={closeCreateDialog}
            />
          </DialogContent>
        </Dialog>

        {/* 编辑组织对话框 */}
        <Dialog open={!!editingOrg} onOpenChange={closeEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑组织</DialogTitle>
              <DialogDescription>
                修改组织信息和设置
              </DialogDescription>
            </DialogHeader>
            {editingOrg && (
              <OrganizationForm
                organization={editingOrg}
                parentOrganizations={organizations.filter(org => org.id !== editingOrg.id)}
                currentTenantId={currentTenantInfo?.id}
                onSuccess={handleFormSuccess}
                onCancel={closeEditDialog}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <AlertDialog open={!!deletingOrg} onOpenChange={closeDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除组织</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要删除组织 "{deletingOrg?.name}" 吗？删除的组织将移至回收站，可以在回收站中恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteDialog}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 回收站对话框 */}
        <OrganizationRecycleBin
          open={isRecycleBinOpen}
          onOpenChange={closeRecycleBin}
          currentTenantId={currentTenantInfo?.id}
          onOrganizationRestored={fetchOrganizations}
        />
      </Main>
    </>
  )
}