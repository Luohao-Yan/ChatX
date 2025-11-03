import { useState, useEffect, useCallback } from 'react'
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
import { UserToolbar, StatusFilter } from './components/user-toolbar'
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  
  // 对话框状态
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  // const [viewingUser, setViewingUser] = useState<User | null>(null) // Commented out until needed
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false)
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // 侧边栏状态 - 移动端默认关闭，桌面端默认打开
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
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
  
  // 监听侧边栏状态变化
  useEffect(() => {
    // 侧边栏状态已更新
  }, [isSidebarOpen])

  // 检查是否是超级管理员
  const isSuperAdmin = currentUser?.is_superuser ||
    currentUser?.roles?.includes('super_admin') ||
    currentUser?.roles?.includes('system_admin') ||
    false

  // 筛选用户列表
  const filteredUsers = users.filter(user => {
    // 首先按状态筛选
    switch (statusFilter) {
      case 'active': {
        if (!user.is_active) return false
        break
      }
      case 'inactive': {
        if (user.is_active) return false
        break
      }
      case 'all':
      default: {
        // 显示所有用户
        break
      }
    }

    // 然后按搜索查询筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.full_name && user.full_name.toLowerCase().includes(query))
      )
    }

    return true
  })

  // 响应式检测和侧边栏状态管理
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth < 768
      const wasDesktop = !isMobileView && isMobileView !== isMobile
      
      setIsMobileView(isMobile)
      
      // 当从移动端切换到桌面端时，自动打开侧边栏
      if (wasDesktop && !isMobile && !isSidebarOpen) {
        setIsSidebarOpen(true)
      }
      
      // 当从桌面端切换到移动端时，自动关闭侧边栏
      if (!wasDesktop && isMobile && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('resize', checkMobileView)
    return () => window.removeEventListener('resize', checkMobileView)
  }, [isMobileView, isSidebarOpen])

  // 初始化侧边栏状态（只在组件挂载时运行一次）
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    setIsMobileView(isMobile)
    setIsSidebarOpen(!isMobile) // 桌面端默认打开，移动端默认关闭
  }, []) // 空依赖数组，只在挂载时运行一次

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
      
      // Debug logs removed for production
      
      // 🎯 只在还没有租户信息时才自动设置
      if (tenantsList.length > 0 && !currentTenantInfo) {
        // 优先查找当前用户的租户
        const currentUserTenant = tenantsList.find(tenant => tenant.id === currentUser?.current_tenant_id)
        if (currentUserTenant) {
          // User tenant found and set
          setCurrentTenantInfo(currentUserTenant)
        } else {
          // 如果找不到当前用户租户，选择第一个可用租户
          // Using first available tenant
          setCurrentTenantInfo(tenantsList[0])
        }
      }
    } catch (_error) {
      // Failed to fetch tenants
      setAvailableTenants([])
    } finally {
      setLoadingTenants(false)
    }
  }, [isSuperAdmin, currentUser?.current_tenant_id, currentTenantInfo]) // 添加正确的依赖

  // 初始化非超级管理员用户的租户信息
  useEffect(() => {
    if (!isSuperAdmin && currentUser?.current_tenant_id && !currentTenantInfo) {
      // 对于非超级管理员，从后端获取真实的租户信息
      const fetchCurrentTenant = async () => {
        try {
          const tenantInfo = await tenantAPI.getTenant(currentUser.current_tenant_id!)
          setCurrentTenantInfo(tenantInfo)
        } catch (_error) {
          // Failed to fetch tenant info
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

  // 移除自动选择组织的逻辑，让用户主动选择

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
      
      // 🎯 正确的租户逻辑：
      // 超级管理员：使用用户选择的租户ID（必须有选择才加载数据）
      // 租户管理员：使用自己的current_tenant_id
      const tenantId = isSuperAdmin 
        ? currentTenantInfo?.id  // 超级管理员必须选择租户
        : currentUser?.current_tenant_id  // 租户管理员使用固定租户

      if (!tenantId) {
        // No valid tenant ID, skipping organization loading
        setOrganizations([])
        return
      }

      params.tenant_id = tenantId
      
      // Loading organizations with params
      const orgs = await organizationAPI.getOrganizations(params)
      const orgsList = Array.isArray(orgs) ? orgs : []
      setOrganizations(orgsList)

      // 移除自动选择组织的逻辑，让用户自主选择
      // 用户可以通过组织树或"全部用户"按钮进行选择
      
    } catch (_error) {
      // Failed to fetch organizations
      setOrganizations([])
    } finally {
      setLoadingOrgs(false)
    }
  }, [isSuperAdmin, currentTenantInfo?.id, currentUser?.current_tenant_id])
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

      // 🎯 正确的租户逻辑：
      // 超级管理员：使用用户选择的租户ID（必须有选择才加载数据）
      // 租户管理员：使用自己的current_tenant_id
      const tenantId = isSuperAdmin 
        ? currentTenantInfo?.id  // 超级管理员必须选择租户
        : currentUser?.current_tenant_id  // 租户管理员使用固定租户

      if (!tenantId) {
        // No valid tenant ID, skipping user list loading
        setUsers([])
        setTotalUsers(0)
        return
      }

      params.tenant_id = tenantId

      if (searchQuery) {
        params.search = searchQuery
      }

      if (selectedOrgId) {
        params.organization_id = selectedOrgId
      }

      // Loading users with params
      const users = await usersAPI.getUsers(params)
      const usersList = Array.isArray(users) ? users : []
      setUsers(usersList)
      setTotalUsers(usersList.length)

    } catch (_error) {
      // Failed to fetch users
      toast.error('获取用户列表失败')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedOrgId, currentTenantInfo?.id, currentUser?.current_tenant_id, isSuperAdmin]) // 只保留真正需要的依赖

  // 处理租户切换
  const handleTenantSwitch = async (tenant: Tenant) => {
    try {
      // Switching to tenant
      
      // 🎯 1. 首先更新当前租户信息，确保UI立即更新
      setCurrentTenantInfo(tenant)
      
      toast.success(`已切换到租户: ${tenant.display_name}`)
      
      // 🎯 2. 使用新的租户ID加载数据
      const newTenantId = tenant.id
      
      // 3. 重置状态
      setCurrentPage(1)
      setSelectedUsers([])
      setSelectedOrgId(null)
      setSelectedOrgName('全部用户')
      setOrganizations([])
      setUsers([])
      
      // Starting to load new tenant data
      
      // 4. 加载新租户的组织列表
      const orgs = await loadOrganizationsForTenant(newTenantId)
      
      // 5. 选择第一个组织（如果有的话）
      let selectedOrgForStats = null
      if (orgs && orgs.length > 0) {
        selectedOrgForStats = orgs[0].id
        setSelectedOrgId(orgs[0].id)
        setSelectedOrgName(orgs[0].display_name || orgs[0].name)
      }
      
      // 6. 并行加载用户统计和用户列表
      // 统计数据显示全租户数据，用户列表可按组织过滤
      await Promise.all([
        loadStatsForSpecificTenant(newTenantId, null),  // 统计全租户数据
        loadUsersForSpecificTenant(1, pageSize, newTenantId, selectedOrgForStats)
      ])
      
      // Tenant switch completed
    } catch (_error) {
      // Failed to switch tenant
      toast.error('租户切换失败')
    }
  }

  // 为指定租户加载组织列表
  const loadOrganizationsForTenant = async (tenantId: string): Promise<Organization[]> => {
    try {
      setLoadingOrgs(true)
      const params = {
        skip: 0,
        limit: 100,
        tenant_id: tenantId
      }
      
      // Loading organization list for specific tenant
      const orgs = await organizationAPI.getOrganizations(params)
      const orgsList = Array.isArray(orgs) ? orgs : []
      setOrganizations(orgsList)
      return orgsList
    } catch (_error) {
      // Failed to fetch organizations for tenant
      setOrganizations([])
      return []
    } finally {
      setLoadingOrgs(false)
    }
  }

  // 为指定租户和组织加载用户列表
  const loadUsersForSpecificTenant = useCallback(async (page: number, size: number, tenantId: string, orgId: string | null) => {
    try {
      setLoading(true)
      const params: {
        skip: number
        limit: number
        tenant_id: string
        search?: string
        organization_id?: string
      } = {
        skip: (page - 1) * size,
        limit: size,
        tenant_id: tenantId
      }

      if (searchQuery) {
        params.search = searchQuery
      }

      if (orgId) {
        params.organization_id = orgId
      }

      // Loading users for specific tenant
      const users = await usersAPI.getUsers(params)
      const usersList = Array.isArray(users) ? users : []
      setUsers(usersList)
      setTotalUsers(usersList.length)
    } catch (_error) {
      // Failed to fetch users for specific tenant
      toast.error('获取用户列表失败')
      setUsers([])
      setTotalUsers(0)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  // 为指定租户和组织加载统计数据
  const loadStatsForSpecificTenant = async (tenantId: string, orgId: string | null) => {
    try {
      const params: {
        tenant_id: string
        organization_id?: string
      } = {
        tenant_id: tenantId
      }

      if (orgId) {
        params.organization_id = orgId
      }

      // Loading statistics for specific tenant
      const stats = await usersAPI.getUserStatistics(params)
      setUserStats(stats)
    } catch (_error: unknown) {
      // Failed to fetch user statistics for specific tenant
      
      setUserStats({
        total: 0,
        active: 0,
        inactive: 0,
        new_this_month: 0,
        super_admin: 0,
        admin: 0,
        normal: 0
      })
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
      
      const tenantId = isSuperAdmin 
        ? currentTenantInfo?.id 
        : currentUser?.current_tenant_id
      if (tenantId) {
        loadUsersForSpecificTenant(currentPage, pageSize, tenantId, selectedOrgId)
      }
    } catch (_error) {
      // Failed to delete user
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
      
      const tenantId = isSuperAdmin 
        ? currentTenantInfo?.id 
        : currentUser?.current_tenant_id
      if (tenantId) {
        loadUsersForSpecificTenant(currentPage, pageSize, tenantId, selectedOrgId)
      }
    } catch (_error) {
      // Failed to toggle user status
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
    } catch (_error) {
      // Failed to reset password
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
    } catch (_error) {
      // Failed to send verification email
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
    } catch (_error) {
      // Failed to batch delete users
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
    } catch (_error) {
      // Failed to export users
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
  const handleOrgChange = async (orgId: string | null, orgName: string) => {
    // Switching organization
    
    // 更新状态
    setSelectedOrgId(orgId)
    setSelectedOrgName(orgName)
    setCurrentPage(1)
    
    // 移动端切换组织后自动关闭侧边栏
    if (isMobileView) {
      setIsSidebarOpen(false)
    }
    
    // 🎯 获取当前租户ID，组织切换后立即重新加载用户列表和统计数据
    const currentTenantId = isSuperAdmin 
      ? currentTenantInfo?.id
      : currentUser?.current_tenant_id
    
    if (!currentTenantId) {
      // No valid tenant ID, skipping organization switch data loading
      return
    }
    
    try {
      // Organization switch, reloading data
      // 用户列表按组织过滤，统计数据保持全租户显示
      await Promise.all([
        loadUsersForSpecificTenant(1, pageSize, currentTenantId, orgId),
        loadStatsForSpecificTenant(currentTenantId, null)  // 统计数据始终显示全租户
      ])
    } catch (_error) {
      // Failed to reload data after organization change
    }
  }


  // 处理用户添加成功
  const handleUserAdded = (_user: User) => {
    const tenantId = isSuperAdmin 
      ? currentTenantInfo?.id 
      : currentUser?.current_tenant_id
    if (tenantId) {
      loadUsersForSpecificTenant(currentPage, pageSize, tenantId, selectedOrgId)
    }
  }

  // 处理用户更新成功
  const handleUserUpdated = (_user: User) => {
    setEditingUser(null)
    const tenantId = isSuperAdmin 
      ? currentTenantInfo?.id 
      : currentUser?.current_tenant_id
    if (tenantId) {
      loadUsersForSpecificTenant(currentPage, pageSize, tenantId, selectedOrgId)
    }
  }

  // 统一的数据初始化逻辑
  useEffect(() => {
    if (!currentUser?.id) return

    // Debug info removed for production

    const initializeData = async () => {
      try {
        if (isSuperAdmin) {
          // 超级管理员：先加载租户列表
          await fetchAvailableTenants()
          
          // 超级管理员如果还没选择租户，等待用户选择，不加载数据
          if (!currentTenantInfo?.id) {
            // Super admin hasn't selected tenant, waiting for selection
            return
          }
        }
        
        // 🎯 检查是否有有效的租户信息来加载数据
        const tenantId = isSuperAdmin 
          ? currentTenantInfo?.id  // 超级管理员必须选择租户
          : currentUser?.current_tenant_id  // 租户管理员使用固定租户

        if (tenantId) {
          // Initializing data with tenant ID
          
          // 1. 加载组织列表
          await loadOrganizationsForTenant(tenantId)
          
          // 2. 不自动选择组织，让用户自主选择（默认显示全部用户）
          const selectedOrgForData = selectedOrgId
          
          // 3. 并行加载用户统计和用户列表
          // 统计数据默认显示全租户数据（不传organization_id）
          // 用户列表可以按组织过滤
          await Promise.all([
            loadStatsForSpecificTenant(tenantId, null),  // 统计全租户数据
            loadUsersForSpecificTenant(currentPage, pageSize, tenantId, selectedOrgForData)
          ])
        } else {
          // No valid tenant ID, skipping data loading
        }
      } catch (_error) {
        // Failed to initialize data
      }
    }

    initializeData()
  }, [
    currentUser?.id,
    currentUser?.current_tenant_id,
    currentTenantInfo?.id,
    isSuperAdmin,
    fetchAvailableTenants,
    currentPage,
    pageSize,
    loadUsersForSpecificTenant,
    selectedOrgId
  ])

  // 分页变化时重新获取数据
  useEffect(() => {
    const tenantId = isSuperAdmin 
      ? currentTenantInfo?.id 
      : currentUser?.current_tenant_id
      
    if (currentUser?.id && tenantId) {
      loadUsersForSpecificTenant(currentPage, pageSize, tenantId, selectedOrgId)
    }
  }, [currentPage, currentTenantInfo?.id, currentUser?.current_tenant_id, currentUser?.id, isSuperAdmin, loadUsersForSpecificTenant, pageSize, selectedOrgId])

  // 搜索和筛选变化时重新获取数据（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      // 🎯 确保有有效的租户ID才进行数据加载
      const tenantId = isSuperAdmin 
        ? currentTenantInfo?.id 
        : currentUser?.current_tenant_id
        
      if (currentUser?.id && tenantId) {
        loadUsersForSpecificTenant(1, pageSize, tenantId, selectedOrgId)
        // 统计数据始终显示全租户数据，不受组织筛选影响
        loadStatsForSpecificTenant(tenantId, null)
        setCurrentPage(1)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedOrgId, currentUser?.id, isSuperAdmin, currentTenantInfo?.id, currentUser?.current_tenant_id, loadUsersForSpecificTenant, pageSize])

  // 不再自动选择组织，让用户主动选择
  // 用户可以通过组织树选择具体组织，或点击"全部用户"查看所有用户

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
        <div className="flex h-full">
          {/* 左侧组织树侧边栏 */}
          {(isSidebarOpen || !isMobileView) && (
            <div className={`${
              isMobileView 
                ? 'fixed inset-y-0 left-0 z-50 w-80 bg-background shadow-xl'
                : `relative bg-background transition-all duration-300 ease-in-out ${
                    isSidebarOpen ? 'w-80' : 'w-0'
                  }`
            } flex-shrink-0 ${isMobileView ? '' : 'overflow-hidden'}`}>
            {/* 移动端背景遮罩 */}
            {isMobileView && isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/30 md:hidden z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            
            {/* 组织树内容 */}
            <div className={`h-full overflow-y-auto ${isMobileView ? 'relative z-50' : ''} ${
              !isMobileView ? 'w-80' : ''
            }`}>
              <OrganizationTree
                selectedOrgId={selectedOrgId}
                onOrgSelect={handleOrgChange}
                currentTenantId={isSuperAdmin ? currentTenantInfo?.id : undefined}
                isSuperAdmin={isSuperAdmin}
                currentUserTenantId={currentUser?.current_tenant_id}
              />
            </div>
          </div>
          )}

          {/* 右侧主内容区域 */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto p-6">
            <div className="max-w-full mx-auto space-y-6">
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
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />

              {/* 用户列表 */}
              <div className="bg-card rounded-lg border">
                {isMobileView ? (
                  <UserCardList
                    users={filteredUsers}
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
                    users={filteredUsers}
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
              </div>

              {/* 分页控件 - 响应式设计 */}
              {totalUsers > pageSize && (
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="whitespace-nowrap">共 {totalUsers} 个用户</span>
                        <Separator orientation="vertical" className="h-4 hidden sm:block" />
                        <span className="hidden sm:inline whitespace-nowrap">
                          第 {currentPage} 页，共 {Math.ceil(totalUsers / pageSize)} 页
                        </span>
                        <span className="sm:hidden text-xs">
                          {currentPage}/{Math.ceil(totalUsers / pageSize)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 justify-center sm:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1 || loading}
                          className="flex-1 sm:flex-none"
                        >
                          <IconChevronLeft size={16} />
                          <span className="hidden sm:inline ml-1">上一页</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalUsers / pageSize), prev + 1))}
                          disabled={currentPage >= Math.ceil(totalUsers / pageSize) || loading}
                          className="flex-1 sm:flex-none"
                        >
                          <span className="hidden sm:inline mr-1">下一页</span>
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
                } catch (_error: any) {

                  // 提取错误信息
                  const errorMessage = _error?.response?.data?.detail ||
                                     _error?.response?.data?.message ||
                                     _error?.message ||
                                     '更新用户失败'

                  toast.error(errorMessage)
                  throw _error
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
        onUserRestored={() => {
          const tenantId = isSuperAdmin 
            ? currentTenantInfo?.id 
            : currentUser?.current_tenant_id
          if (tenantId) {
            loadUsersForSpecificTenant(currentPage, pageSize, tenantId, selectedOrgId)
          }
        }}
      />

      {/* 批量导入对话框 */}
      <BatchImportDialog
        open={isBatchImportOpen}
        onOpenChange={setIsBatchImportOpen}
        onImportSuccess={() => {
          const tenantId = isSuperAdmin 
            ? currentTenantInfo?.id 
            : currentUser?.current_tenant_id
          if (tenantId) {
            loadUsersForSpecificTenant(currentPage, pageSize, tenantId, selectedOrgId)
          }
        }}
      />
    </>
  )
}