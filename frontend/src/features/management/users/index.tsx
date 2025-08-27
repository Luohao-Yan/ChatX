import { useState, useEffect, useCallback, useMemo } from 'react'
// import { useTranslation } from 'react-i18next' // Commented out until i18n is needed
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
import { OrganizationTree } from './components/organization-tree'
import { usersAPI, UserStatistics } from '@/services/api/users'
import { tenantAPI, TenantStatus } from '@/services/api/tenants'
import { organizationAPI, Organization } from '@/services/api/organization'
import { User } from '@/types/entities/user'
import { Tenant } from '@/services/api/tenants'
import { toast } from 'sonner'
import { useAuth } from '@/stores/auth'
import { 
  IconChevronLeft, 
  IconChevronRight,
  IconMenu2 
} from '@tabler/icons-react'



export default function UsersManagement() {
  // const { t } = useTranslation() // Commented out until i18n is needed
  const { userInfo: currentUser } = useAuth()
  
  // 基础状态
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [, setSelectedOrgName] = useState('全部用户')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 对话框状态
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  // const [viewingUser, setViewingUser] = useState<User | null>(null) // Commented out until needed
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false)
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // 侧边栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  
  // 租户相关状态
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([])
  const [currentTenantInfo, setCurrentTenantInfo] = useState<Tenant | null>(null)
  const [loadingTenants, setLoadingTenants] = useState(false)
  
  // 组织相关状态
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [_loadingOrgs, setLoadingOrgs] = useState(false)
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalUsers, setTotalUsers] = useState(0)
  
  // 统计数据
  const [userStats, setUserStats] = useState<UserStatistics>({
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
        skip: 0, 
        limit: 100, 
        is_active: true 
      })
      // API 直接返回 Tenant[] 数组，不是分页结构
      const tenantsList = Array.isArray(tenants) ? tenants : []
      setAvailableTenants(tenantsList)
      
      // 如果是超级管理员且还没有选择租户，优先选择当前用户的租户，否则选择第一个租户
      if (tenantsList.length > 0 && !currentTenantInfo) {
        // 优先查找当前用户的租户
        const currentUserTenant = tenantsList.find(tenant => tenant.id === currentUser?.current_tenant_id)
        if (currentUserTenant) {
          setCurrentTenantInfo(currentUserTenant)
        } else {
          // 如果找不到当前用户租户，选择第一个可用租户
          setCurrentTenantInfo(tenantsList[0])
        }
      }
    } catch (error) {
      console.warn('Failed to fetch tenants:', error)
      setAvailableTenants([])
    } finally {
      setLoadingTenants(false)
    }
  }, [isSuperAdmin, currentTenantInfo, currentUser?.current_tenant_id])

  // 初始化非超级管理员用户的租户信息
  useEffect(() => {
    if (!isSuperAdmin && currentUser?.current_tenant_id && !currentTenantInfo) {
      // 对于非超级管理员，从后端获取真实的租户信息
      const fetchCurrentTenant = async () => {
        try {
          const tenantInfo = await tenantAPI.getTenant(currentUser.current_tenant_id!)
          setCurrentTenantInfo(tenantInfo)
        } catch (error) {
          console.warn('Failed to fetch tenant info:', error)
          // 如果获取失败，创建一个简化的租户信息对象
          const userTenant = {
            id: currentUser.current_tenant_id!,
            name: '当前租户',
            display_name: '当前租户',
            schema_name: `tenant_${currentUser.current_tenant_id}`,
            description: '当前用户所属租户',
            owner_id: currentUser.id,
            status: TenantStatus.ACTIVE,
            is_active: true,
            slug: currentUser.current_tenant_id!,
            settings: {
              allow_self_registration: false,
              user_type: 'enterprise' as const,
              max_users: 1000,
              features: []
            },
            features: [],
            limits: {
              max_file_size_mb: 100,
              max_storage_gb: 10,
              max_users: 1000
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setCurrentTenantInfo(userTenant)
        }
      }
      
      fetchCurrentTenant()
    }
  }, [isSuperAdmin, currentUser, currentTenantInfo])

  // 优化的组织选择逻辑 - 使用 useMemo 缓存排序结果
  const sortedRootOrganizations = useMemo(() => {
    if (organizations.length === 0) return []
    
    // 找出所有根组织（level为0或parent_id为null）
    const rootOrgs = organizations.filter(org => org.level === 0 || !org.parent_id)
    
    // 按优先级降序排序，优先级相同则按名称升序排序
    return rootOrgs.sort((a, b) => {
      // 首先按优先级降序排序（数值越大优先级越高）
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      // 优先级相同时，按名称升序排序
      return a.name.localeCompare(b.name)
    })
  }, [organizations])

  // 获取组织列表
  const fetchOrganizations = useCallback(async () => {
    try {
      setLoadingOrgs(true)
      const params: {
        skip: number
        limit: number
        tenant_id?: string
      } = {
        skip: 0,
        limit: 100
      }
      
      // 传递租户ID
      if (isSuperAdmin && currentTenantInfo) {
        // 超级管理员：使用选中的租户
        params.tenant_id = currentTenantInfo.id
      } else if (!isSuperAdmin && currentUser?.current_tenant_id) {
        // 非超级管理员：使用自己的租户ID
        params.tenant_id = currentUser.current_tenant_id
      }
      
      const orgs = await organizationAPI.getOrganizations(params)
      // API 直接返回 Organization[] 数组
      const orgsList = Array.isArray(orgs) ? orgs : []
      setOrganizations(orgsList)
      
    } catch (error) {
      console.warn('Failed to fetch organizations:', error)
      setOrganizations([])
    } finally {
      setLoadingOrgs(false)
    }
  }, [currentTenantInfo, isSuperAdmin, currentUser?.current_tenant_id])

  // 获取用户统计数据
  const fetchUserStats = useCallback(async () => {
    try {
      const params: {
        tenant_id?: string
        organization_id?: string
      } = {}

      // 传递租户ID（动态根据当前用户和租户状态）
      if (isSuperAdmin) {
        // 超级管理员：使用选中的租户，如果没有选中则使用自己的租户ID
        params.tenant_id = currentTenantInfo?.id || currentUser?.current_tenant_id
      } else if (currentUser?.current_tenant_id) {
        // 非超级管理员：使用自己的租户ID
        params.tenant_id = currentUser.current_tenant_id
      }

      if (selectedOrgId) {
        params.organization_id = selectedOrgId
      }

      const stats = await usersAPI.getUserStatistics(params)
      setUserStats(stats)
    } catch (error) {
      console.warn('Failed to fetch user statistics:', error)
      // 失败时保持默认值，不显示错误toast
    }
  }, [selectedOrgId, currentTenantInfo, isSuperAdmin, currentUser?.current_tenant_id])

  // 获取用户列表
  const fetchUsers = useCallback(async (page = 1, size = 20) => {
    try {
      setLoading(true)
      const params: {
        skip: number
        limit: number
        tenant_id?: string
        search?: string
        organization_id?: string
      } = {
        skip: (page - 1) * size,
        limit: size
      }

      // 传递租户ID
      if (isSuperAdmin && currentTenantInfo) {
        // 超级管理员：使用选中的租户
        params.tenant_id = currentTenantInfo.id
      } else if (!isSuperAdmin && currentUser?.current_tenant_id) {
        // 非超级管理员：使用自己的租户ID
        params.tenant_id = currentUser.current_tenant_id
      }

      if (searchQuery) {
        params.search = searchQuery
      }

      if (selectedOrgId) {
        params.organization_id = selectedOrgId
      }

      const users = await usersAPI.getUsers(params)
      
      // API 直接返回 User[] 数组
      const usersList = Array.isArray(users) ? users : []
      setUsers(usersList)
      setTotalUsers(usersList.length) // 暂时使用当前页数据长度，实际应该有总数统计

    } catch (error) {
      console.warn('Failed to fetch users:', error)
      toast.error('获取用户列表失败')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedOrgId, currentTenantInfo, isSuperAdmin, currentUser?.current_tenant_id])

  // 处理租户切换
  const handleTenantSwitch = async (tenant: Tenant) => {
    try {
      toast.success(`已切换到租户: ${tenant.display_name}`)
      setCurrentTenantInfo(tenant)
      setCurrentPage(1)
      setSelectedUsers([])
      // 重置组织选择，等待fetchOrganizations自动选择根组织
      setSelectedOrgId(null)
      setSelectedOrgName('全部用户')
      
      // 重新加载数据
      await Promise.all([
        fetchUsers(1, pageSize),
        fetchOrganizations(),
        fetchUserStats()
      ])
    } catch (error) {
      console.warn('Failed to switch tenant:', error)
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
      console.warn('Failed to delete user:', error)
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
      console.warn('Failed to toggle user status:', error)
      toast.error('修改用户状态失败')
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理密码重置
  const handleUserResetPassword = async (_user: User) => {
    try {
      setIsProcessing(true)
      // TODO: 实现密码重置功能
      // await usersAPI.resetPassword(user.id)
      toast.info('密码重置功能待实现')
    } catch (error) {
      console.warn('Failed to reset password:', error)
      toast.error('重置密码失败')
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理发送验证邮件
  const handleUserSendVerification = async (_user: User) => {
    try {
      setIsProcessing(true)
      // TODO: 实现发送验证邮件功能
      // await usersAPI.sendVerificationEmail(user.id)
      toast.info('发送验证邮件功能待实现')
    } catch (error) {
      console.warn('Failed to send verification email:', error)
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
      console.warn('Failed to batch delete users:', error)
      toast.error('批量删除失败')
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理导出用户
  const handleExportUsers = async () => {
    try {
      toast.info('开始导出用户数据...')
      // TODO: 实现用户数据导出功能
      // await usersAPI.exportUsers({
      //   organization_id: selectedOrgId,
      //   search: searchQuery
      // })
      toast.info('用户数据导出功能待实现')
    } catch (error) {
      console.warn('Failed to export users:', error)
      toast.error('导出用户数据失败')
    }
  }

  // 处理刷新
  const handleRefresh = () => {
    fetchUsers(currentPage, pageSize)
    fetchUserStats()
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
  const handleUserAdded = (_user: User) => {
    fetchUsers(currentPage, pageSize)
  }

  // 处理用户更新成功
  const handleUserUpdated = (_user: User) => {
    setEditingUser(null)
    fetchUsers(currentPage, pageSize)
  }

  // 初始化数据 - 分别处理超级管理员和普通用户
  useEffect(() => {
    if (isSuperAdmin) {
      // 超级管理员先加载租户列表
      fetchAvailableTenants()
    } else {
      // 普通用户直接初始化数据
      if (currentUser?.current_tenant_id) {
        fetchUsers(currentPage, pageSize)
        fetchUserStats()
        fetchOrganizations()
      }
    }
  }, [isSuperAdmin, currentUser?.current_tenant_id, fetchAvailableTenants, fetchUsers, fetchUserStats, fetchOrganizations, currentPage, pageSize])

  // 超级管理员的数据加载 - 在租户信息确定后
  useEffect(() => {
    if (isSuperAdmin && currentTenantInfo) {
      fetchUsers(currentPage, pageSize)
      fetchUserStats()
      fetchOrganizations()
    }
  }, [isSuperAdmin, currentTenantInfo, currentPage, pageSize, fetchUsers, fetchUserStats, fetchOrganizations])

  // 当租户信息变化时重新加载组织架构
  useEffect(() => {
    if (currentTenantInfo) {
      fetchOrganizations()
    }
  }, [currentTenantInfo, fetchOrganizations])

  // 自动选择优先级最高的根组织
  useEffect(() => {
    if (!selectedOrgId && sortedRootOrganizations.length > 0) {
      const firstRootOrg = sortedRootOrganizations[0]
      setSelectedOrgId(firstRootOrg.id)
      setSelectedOrgName(firstRootOrg.display_name || firstRootOrg.name)
    }
  }, [selectedOrgId, sortedRootOrganizations])

  // 搜索和筛选变化时重新获取数据
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, pageSize)
      fetchUserStats()
      setCurrentPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedOrgId, fetchUsers, fetchUserStats, pageSize])

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

      <Main className="h-[calc(100vh-4rem)]">
        <div className="flex h-full gap-4">
          {/* 左侧组织树侧边栏 */}
          <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-background overflow-hidden flex-shrink-0 `}>
            <div className="h-full overflow-y-auto">
              <OrganizationTree
                selectedOrgId={selectedOrgId}
                onOrgSelect={handleOrgChange}
                currentTenantId={isSuperAdmin ? currentTenantInfo?.id : undefined}
                isSuperAdmin={isSuperAdmin}
                currentUserTenantId={currentUser?.current_tenant_id}
              />
            </div>
          </div>

          {/* 右侧主内容区域 */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto">
            <div className="space-y-6">
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
                selectedUsers={selectedUsers}
                onRefresh={handleRefresh}
                onBatchImport={() => setIsBatchImportOpen(true)}
                onExportUsers={handleExportUsers}
                onBatchDelete={handleBatchDelete}
                onRecycleBin={() => setIsRecycleBinOpen(true)}
                organizations={organizations}
                onUserAdded={handleUserAdded}
                userStats={userStats}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />

              {/* 用户列表 */}
              {isMobileView ? (
                <UserCardList
                  users={users}
                  loading={loading}
                  selectedUsers={selectedUsers}
                  organizations={organizations}
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
                  organizations={organizations}
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

              {/* 分页控件 */}
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
            </div>
          </div>
        </div>
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
              initialData={editingUser}
              isEditing={true}
              onSubmit={async (userData) => {
                try {
                  const updatedUser = await usersAPI.updateUser(editingUser.id, userData)
                  toast.success(`用户 ${editingUser.username} 更新成功`)
                  handleUserUpdated(updatedUser)
                } catch (error) {
                  console.warn('Failed to update user:', error)
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
        onUserRestored={() => fetchUsers(currentPage, pageSize)}
      />

      {/* 批量导入对话框 */}
      <BatchImportDialog
        open={isBatchImportOpen}
        onOpenChange={setIsBatchImportOpen}
        onImportSuccess={() => fetchUsers(currentPage, pageSize)}
      />
    </>
  )
}