import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
import { UserForm } from './user-form'
import { RecycleBinDialog } from './recycle-bin-dialog'
import { BatchImportDialog } from './batch-import-dialog'
import { TenantSelector } from './components/tenant-selector'
import { UserStatsCards } from './components/user-stats-cards'
import { UserToolbar } from './components/user-toolbar'
import { UserTable } from './components/user-table'
import { UserCardList } from './components/user-card-list'
import { usersAPI } from '@/services/api/users'
import { tenantAPI } from '@/services/api/tenants'
import { organizationAPI } from '@/services/api/organization'
import { User } from '@/types/entities/user'
import { Tenant, TenantStatus } from '@/services/api/tenants'
import { toast } from 'sonner'
import { useAuth } from '@/stores/auth'
import { 
  IconChevronLeft, 
  IconChevronRight,
  IconMenu2 
} from '@tabler/icons-react'

interface Organization {
  id: string
  name: string
  display_name: string
  user_count?: number
}

interface UserStats {
  total: number
  active: number
  inactive: number
  new_this_month: number
  super_admin: number
  admin: number
  normal: number
}

export default function UsersManagement() {
  const { t } = useTranslation()
  const { userInfo: currentUser } = useAuth()
  
  // 基础状态
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [selectedOrgName, setSelectedOrgName] = useState('全部用户')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 对话框状态
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false)
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // 租户相关状态
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([])
  const [currentTenantInfo, setCurrentTenantInfo] = useState<Tenant | null>(null)
  const [loadingTenants, setLoadingTenants] = useState(false)
  
  // 组织相关状态
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalUsers, setTotalUsers] = useState(0)
  
  // 统计数据
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    new_this_month: 0,
    super_admin: 0,
    admin: 0,
    normal: 0
  })
  
  // 视图状态
  const [isMobileView, setIsMobileView] = useState(false)

  // 检查是否是超级管理员
  const isSuperAdmin = currentUser?.is_superuser || 
    currentUser?.roles?.includes('super_admin') || 
    currentUser?.roles?.includes('system_admin') || 
    false

  // 响应式检测
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768)
    }

    checkMobileView()
    window.addEventListener('resize', checkMobileView)
    return () => window.removeEventListener('resize', checkMobileView)
  }, [])

  // 获取可用租户列表
  const fetchAvailableTenants = useCallback(async () => {
    if (!isSuperAdmin) return

    try {
      setLoadingTenants(true)
      const tenants = await tenantAPI.getTenants({ 
        page: 1, 
        size: 100, 
        is_active: true 
      })
      setAvailableTenants(tenants.items || [])
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
      setAvailableTenants([])
    } finally {
      setLoadingTenants(false)
    }
  }, [isSuperAdmin])

  // 获取组织列表
  const fetchOrganizations = useCallback(async () => {
    try {
      setLoadingOrgs(true)
      const orgs = await organizationAPI.getOrganizations({
        page: 1,
        size: 100,
        include_stats: true
      })
      setOrganizations(orgs.items || [])
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      setOrganizations([])
    } finally {
      setLoadingOrgs(false)
    }
  }, [])

  // 获取用户列表
  const fetchUsers = useCallback(async (page = 1, size = 20) => {
    try {
      setLoading(true)
      const params: any = {
        page,
        size,
        include_stats: true
      }

      if (searchQuery) {
        params.search = searchQuery
      }

      if (selectedOrgId) {
        params.organization_id = selectedOrgId
      }

      const response = await usersAPI.getUsers(params)
      
      setUsers(response.items || [])
      setTotalUsers(response.total || 0)
      
      // 更新统计数据
      if (response.stats) {
        setUserStats({
          total: response.stats.total || 0,
          active: response.stats.active || 0,
          inactive: response.stats.inactive || 0,
          new_this_month: response.stats.new_this_month || 0,
          super_admin: response.stats.super_admin || 0,
          admin: response.stats.admin || 0,
          normal: response.stats.normal || 0
        })
      }

    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('获取用户列表失败')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedOrgId])

  // 处理租户切换
  const handleTenantSwitch = async (tenant: Tenant) => {
    try {
      toast.success(`已切换到租户: ${tenant.display_name}`)
      setCurrentTenantInfo(tenant)
      setCurrentPage(1)
      setSelectedUsers([])
      setSelectedOrgId(null)
      setSelectedOrgName('全部用户')
      
      // 重新加载数据
      await Promise.all([
        fetchUsers(1, pageSize),
        fetchOrganizations()
      ])
    } catch (error) {
      console.error('Failed to switch tenant:', error)
      toast.error('租户切换失败')
    }
  }

  // 处理用户选择
  const handleUserSelect = (user: User, selected: boolean) => {
    if (selected) {
      setSelectedUsers(prev => [...prev, user])
    } else {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id))
    }
  }

  // 处理全选
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers([...users])
    } else {
      setSelectedUsers([])
    }
  }

  // 处理用户编辑
  const handleUserEdit = (user: User) => {
    setEditingUser(user)
  }

  // 处理用户删除
  const handleUserDelete = (user: User) => {
    setDeletingUser(user)
  }

  // 确认删除用户
  const confirmDeleteUser = async () => {
    if (!deletingUser) return

    try {
      setIsProcessing(true)
      await usersAPI.deleteUser(deletingUser.id)
      toast.success(`用户 ${deletingUser.username} 已删除`)
      setDeletingUser(null)
      fetchUsers(currentPage, pageSize)
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast.error('删除用户失败')
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理用户状态切换
  const handleUserToggleStatus = async (user: User) => {
    try {
      setIsProcessing(true)
      await usersAPI.updateUser(user.id, {
        is_active: !user.is_active
      })
      toast.success(`用户 ${user.username} ${user.is_active ? '已停用' : '已启用'}`)
      fetchUsers(currentPage, pageSize)
    } catch (error) {
      console.error('Failed to toggle user status:', error)
      toast.error('修改用户状态失败')
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理密码重置
  const handleUserResetPassword = async (user: User) => {
    try {
      setIsProcessing(true)
      await usersAPI.resetPassword(user.id)
      toast.success(`已为用户 ${user.username} 重置密码`)
    } catch (error) {
      console.error('Failed to reset password:', error)
      toast.error('重置密码失败')
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理发送验证邮件
  const handleUserSendVerification = async (user: User) => {
    try {
      setIsProcessing(true)
      await usersAPI.sendVerificationEmail(user.id)
      toast.success(`已向 ${user.email} 发送验证邮件`)
    } catch (error) {
      console.error('Failed to send verification email:', error)
      toast.error('发送验证邮件失败')
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedUsers.length === 0) return

    try {
      setIsProcessing(true)
      await Promise.all(
        selectedUsers.map(user => usersAPI.deleteUser(user.id))
      )
      toast.success(`已删除 ${selectedUsers.length} 个用户`)
      setSelectedUsers([])
      fetchUsers(currentPage, pageSize)
    } catch (error) {
      console.error('Failed to batch delete users:', error)
      toast.error('批量删除失败')
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理导出用户
  const handleExportUsers = async () => {
    try {
      toast.info('开始导出用户数据...')
      await usersAPI.exportUsers({
        organization_id: selectedOrgId,
        search: searchQuery
      })
      toast.success('用户数据导出成功')
    } catch (error) {
      console.error('Failed to export users:', error)
      toast.error('导出用户数据失败')
    }
  }

  // 处理刷新
  const handleRefresh = () => {
    fetchUsers(currentPage, pageSize)
    if (isSuperAdmin) {
      fetchAvailableTenants()
    }
    fetchOrganizations()
  }

  // 处理搜索
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // 处理组织切换
  const handleOrgChange = (orgId: string | null, orgName: string) => {
    setSelectedOrgId(orgId)
    setSelectedOrgName(orgName)
    setCurrentPage(1)
  }

  // 处理用户添加成功
  const handleUserAdded = (user: User) => {
    fetchUsers(currentPage, pageSize)
  }

  // 处理用户更新成功
  const handleUserUpdated = (user: User) => {
    setEditingUser(null)
    fetchUsers(currentPage, pageSize)
  }

  // 初始化数据
  useEffect(() => {
    fetchUsers(currentPage, pageSize)
    fetchOrganizations()
    if (isSuperAdmin) {
      fetchAvailableTenants()
    }
  }, [fetchUsers, fetchOrganizations, fetchAvailableTenants, currentPage, pageSize, isSuperAdmin])

  // 搜索和筛选变化时重新获取数据
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, pageSize)
      setCurrentPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedOrgId, fetchUsers, pageSize])

  return (
    <>
      <Header>
        <div className="flex items-center gap-4">
          <Breadcrumb
            items={[
              { label: '管理中心', href: '/management' },
              { label: '用户管理', href: '/management/users' }
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <IconMenu2 size={20} />
          </Button>
        </div>
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
        {/* 租户选择器 - 只有超级管理员可见 */}
        {isSuperAdmin && (
          <TenantSelector
            currentUser={currentUser}
            currentTenantInfo={currentTenantInfo}
            availableTenants={availableTenants}
            loadingTenants={loadingTenants}
            isSuperAdmin={isSuperAdmin}
            onTenantSwitch={handleTenantSwitch}
          />
        )}

        {/* 统计卡片 */}
        <UserStatsCards
          stats={userStats}
          loading={loading}
        />

        {/* 工具栏 */}
        <UserToolbar
          searchTerm={searchQuery}
          onSearchChange={handleSearchChange}
          selectedOrgId={selectedOrgId}
          onOrgChange={handleOrgChange}
          selectedUsers={selectedUsers}
          onRefresh={handleRefresh}
          onBatchImport={() => setIsBatchImportOpen(true)}
          onExportUsers={handleExportUsers}
          onBatchDelete={handleBatchDelete}
          onRecycleBin={() => setIsRecycleBinOpen(true)}
          organizations={organizations}
          loadingOrgs={loadingOrgs}
          onUserAdded={handleUserAdded}
          currentUser={currentUser}
          userStats={userStats}
        />

        {/* 用户列表 */}
        {isMobileView ? (
          <UserCardList
            users={users}
            loading={loading}
            selectedUsers={selectedUsers}
            onUserSelect={handleUserSelect}
            onUserEdit={handleUserEdit}
            onUserDelete={handleUserDelete}
            onUserToggleStatus={handleUserToggleStatus}
            onUserResetPassword={handleUserResetPassword}
            onUserSendVerification={handleUserSendVerification}
            currentUser={currentUser}
          />
        ) : (
          <UserTable
            users={users}
            loading={loading}
            selectedUsers={selectedUsers}
            onUserSelect={handleUserSelect}
            onSelectAll={handleSelectAll}
            onUserEdit={handleUserEdit}
            onUserDelete={handleUserDelete}
            onUserToggleStatus={handleUserToggleStatus}
            onUserResetPassword={handleUserResetPassword}
            onUserSendVerification={handleUserSendVerification}
            currentUser={currentUser}
          />
        )}

        {/* 分页 */}
        {totalUsers > pageSize && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>共 {totalUsers} 个用户</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>第 {currentPage} 页，共 {Math.ceil(totalUsers / pageSize)} 页</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    <IconChevronLeft size={16} />
                    上一页
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalUsers / pageSize), prev + 1))}
                    disabled={currentPage >= Math.ceil(totalUsers / pageSize) || loading}
                  >
                    下一页
                    <IconChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </Main>

      {/* 编辑用户对话框 */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? `编辑用户: ${editingUser.username}` : '编辑用户'}
            </DialogTitle>
            <DialogDescription>
              修改用户的基本信息和权限设置
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <UserForm
              user={editingUser}
              onSubmit={async (userData) => {
                try {
                  const updatedUser = await usersAPI.updateUser(editingUser.id, userData)
                  toast.success(`用户 ${editingUser.username} 更新成功`)
                  handleUserUpdated(updatedUser)
                } catch (error) {
                  console.error('Failed to update user:', error)
                  toast.error('更新用户失败')
                  throw error
                }
              }}
              onCancel={() => setEditingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除用户 <strong>{deletingUser?.username}</strong> 吗？
              此操作将永久删除用户及其相关数据，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              disabled={isProcessing}
            >
              {isProcessing ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 回收站对话框 */}
      <RecycleBinDialog
        open={isRecycleBinOpen}
        onOpenChange={setIsRecycleBinOpen}
        onRestore={() => fetchUsers(currentPage, pageSize)}
      />

      {/* 批量导入对话框 */}
      <BatchImportDialog
        open={isBatchImportOpen}
        onOpenChange={setIsBatchImportOpen}
        onSuccess={() => fetchUsers(currentPage, pageSize)}
      />
    </>
  )
}