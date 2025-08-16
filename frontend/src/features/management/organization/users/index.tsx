import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconToggleLeft, 
  IconToggleRight,
  IconUsers,
  IconUserCheck,
  IconUserX,
  IconSearch,
  IconRefresh,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
  IconRestore,
  IconFileImport,
  IconX
} from '@tabler/icons-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useUsersApi } from '@/features/users/services/users-api'
import { User } from '@/features/users/data/schema'
import { toast } from 'sonner'
import { useAuth } from '@/stores/auth'

export default function UsersManagement() {
  const { t } = useTranslation()
  const { userInfo: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false)
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false)
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalUsers, setTotalUsers] = useState(0)
  
  const userApi = useUsersApi()

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('nav.organizationStructure') },
    { label: t('nav.usersManagement') }
  ]

  // 获取用户列表
  const fetchUsers = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true)
      const skip = (page - 1) * size
      const users = await userApi.getUsers({ skip, limit: size })
      setUsers(users)
      // 简单估算总数：如果返回的数量等于limit，说明可能还有更多数据
      if (users.length === size) {
        setTotalUsers((page) * size + 1) // 估算至少还有一页
      } else {
        setTotalUsers((page - 1) * size + users.length) // 精确计算
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('获取用户列表失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [currentPage, pageSize])

  // 过滤用户
  const filteredUsers = (users || []).filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleToggleActive = async (user: User) => {
    // 检查是否可以停用该用户
    if (!checkCanDisableUser(user)) {
      return
    }
    
    try {
      await userApi.updateUser(user.id, { is_active: !user.is_active })
      setUsers(prev => prev.map(u => 
        u.id === user.id 
          ? { ...u, is_active: !u.is_active }
          : u
      ))
      toast.success(`用户${user.username}已${user.is_active ? '停用' : '启用'}`)
    } catch (error) {
      console.error('Failed to toggle user status:', error)
      toast.error('更新用户状态失败，请稍后重试')
    }
  }

  const handleDeleteUser = async (user: User) => {
    try {
      // 如果用户是激活状态，先停用
      if (user.is_active) {
        // 检查是否可以停用
        if (!canDisableUser(user)) {
          checkCanDisableUser(user) // 显示错误信息
          return
        }
        
        // 先停用用户
        await userApi.updateUser(user.id, { is_active: false })
        toast.success(`用户${user.username}已停用`)
      }
      
      // 然后删除用户
      await userApi.deleteUser(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setDeletingUser(null)
      toast.success(`用户${user.username}已删除`)
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast.error('删除用户失败，请稍后重试')
    }
  }

  const handleAddUser = async (userData: any) => {
    try {
      const newUser = await userApi.createUser(userData)
      setUsers(prev => [newUser, ...prev])
      setIsAddDialogOpen(false)
      toast.success(`用户${userData.username}创建成功`)
    } catch (error) {
      console.error('Failed to create user:', error)
      // 错误处理由UserForm组件负责，这里不需要显示toast
      throw error // 重新抛出错误，让表单处理
    }
  }

  const handleUpdateUser = async (userData: any) => {
    if (!editingUser) return
    
    try {
      const updatedUser = await userApi.updateUser(editingUser.id, userData)
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id ? updatedUser : u
      ))
      setEditingUser(null)
      toast.success(`用户${editingUser.username}更新成功`)
    } catch (error) {
      console.error('Failed to update user:', error)
      // 错误处理由UserForm组件负责，这里不需要显示toast
      throw error // 重新抛出错误，让表单处理
    }
  }

  const getStatusBadge = (user: User) => {
    if (!user.is_active) {
      return <Badge variant="destructive">已停用</Badge>
    }
    if (!user.is_verified) {
      return <Badge variant="secondary">未验证</Badge>
    }
    return <Badge variant="default">正常</Badge>
  }

  const getOnlineIndicator = (user: User) => {
    // 检查用户是否在线
    // 优先使用后端计算的 is_online 字段
    let isOnline = Boolean(user.is_online)
    
    // 如果后端没有提供 is_online 字段，则基于 last_login 手动计算
    if (user.is_online === undefined && user.last_login) {
      const now = new Date()
      const lastLogin = new Date(user.last_login)
      const timeDiffSeconds = (now.getTime() - lastLogin.getTime()) / 1000
      isOnline = timeDiffSeconds < 3600 // 1小时内认为在线（临时调整用于测试）
    }
    
    if (isOnline) {
      return (
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-emerald-100 dark:ring-emerald-900/30"></div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">在线</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 bg-muted-foreground/40 rounded-full"></div>
        <span className="text-xs text-muted-foreground">离线</span>
      </div>
    )
  }

  // 选择相关的处理函数
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedUsers.length === 0) return
    
    const usersToDelete = users.filter(u => selectedUsers.includes(u.id))
    
    // 检查基本权限（不包括激活状态检查）
    const cannotDeleteUsers = usersToDelete.filter(u => {
      return u.id === currentUser?.id || u.is_superuser || u.deleted_at
    })
    
    if (cannotDeleteUsers.length > 0) {
      const reasons = cannotDeleteUsers.map(u => {
        if (u.id === currentUser?.id) return `${u.username}（自己）`
        if (u.is_superuser) return `${u.username}（超级管理员）`
        if (u.deleted_at) return `${u.username}（已删除）`
        return u.username
      })
      toast.error(`不能删除以下用户：${reasons.join(', ')}`)
      return
    }
    
    setIsProcessing(true)
    try {
      // 先停用所有激活的用户
      const activeUsersToDisable = usersToDelete.filter(u => u.is_active)
      if (activeUsersToDisable.length > 0) {
        await userApi.batchDisableUsers(activeUsersToDisable.map(u => u.id))
        toast.success(`已停用 ${activeUsersToDisable.length} 个用户`)
      }
      
      // 然后删除用户
      const result = await userApi.batchDeleteUsers(selectedUsers)
      toast.success(result.message)
      setSelectedUsers([])
      await fetchUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '批量删除失败')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchDisable = async () => {
    if (selectedUsers.length === 0) return
    
    // 检查是否有不能停用的用户
    const usersToDisable = users.filter(u => selectedUsers.includes(u.id))
    const cannotDisableUsers = usersToDisable.filter(u => !canDisableUser(u))
    
    if (cannotDisableUsers.length > 0) {
      const reasons = cannotDisableUsers.map(u => {
        if (u.id === currentUser?.id) return `${u.username}（自己）`
        if (u.is_superuser) return `${u.username}（超级管理员）`
        if (!u.is_active) return `${u.username}（已停用）`
        if (u.deleted_at) return `${u.username}（已删除）`
        return u.username
      })
      toast.error(`不能停用以下用户：${reasons.join(', ')}`)
      return
    }
    
    setIsProcessing(true)
    try {
      const result = await userApi.batchDisableUsers(selectedUsers)
      toast.success(result.message)
      setSelectedUsers([])
      await fetchUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '批量停用失败')
    } finally {
      setIsProcessing(false)
    }
  }

  // 权限检查函数
  const canDisableUser = (user: User): boolean => {
    if (!currentUser) return false
    
    // 不能停用自己
    if (user.id === currentUser.id) {
      return false
    }
    
    // 不能停用超级管理员
    if (user.is_superuser) {
      return false
    }
    
    // 已停用的用户不需要再次停用
    if (!user.is_active) {
      return false
    }
    
    // 已删除的用户不能停用
    if (user.deleted_at) {
      return false
    }
    
    return true
  }

  const canDeleteUser = (user: User): boolean => {
    if (!currentUser) return false
    
    // 不能删除自己
    if (user.id === currentUser.id) {
      return false
    }
    
    // 不能删除超级管理员
    if (user.is_superuser) {
      return false
    }
    
    // 已删除的用户不能再次删除
    if (user.deleted_at) {
      return false
    }
    
    // 必须先停用用户才能删除
    if (user.is_active) {
      return false
    }
    
    return true
  }

  // 权限检查并显示错误信息的函数
  const checkCanDisableUser = (user: User): boolean => {
    if (!currentUser) return false
    
    // 不能停用自己
    if (user.id === currentUser.id) {
      toast.error('不能停用自己的账户')
      return false
    }
    
    // 不能停用超级管理员
    if (user.is_superuser) {
      toast.error('不能停用超级管理员账户')
      return false
    }
    
    // 已停用的用户不需要再次停用
    if (!user.is_active) {
      toast.error('用户已处于停用状态')
      return false
    }
    
    // 已删除的用户不能停用
    if (user.deleted_at) {
      toast.error('已删除的用户无法停用')
      return false
    }
    
    return true
  }


  const isAllSelected = filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length
  const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length

  return (
    <>
      <Header>
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
      </Header>

      <Main className="overflow-y-auto">
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            用户管理
          </h1>
          <p className='text-muted-foreground'>
            管理系统用户，包括添加、编辑、删除和权限控制
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 统计卡片 - 紧凑优化布局 */}
        <div className="mb-3">
          <Card className="border-border/50">
            <CardContent className="p-3">
              {/* 主要统计行 */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center">
                    <IconUsers size={16} className="text-foreground" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {(users || []).length}
                    </div>
                    <p className="text-muted-foreground text-xs">系统总用户</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mb-0.5"></div>
                  <p className="text-xs text-muted-foreground">实时统计</p>
                </div>
              </div>

              {/* 详细统计横排 */}
              <div className="flex justify-between items-center gap-2">
                {/* 活跃用户 */}
                <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-muted/30 rounded-lg flex-1">
                  <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <IconUserCheck size={12} className="text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-bold text-foreground leading-none">
                      {(users || []).filter(u => u.is_active).length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">活跃</p>
                  </div>
                </div>

                {/* 已验证用户 */}
                <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-muted/30 rounded-lg flex-1">
                  <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <IconToggleRight size={12} className="text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-bold text-foreground leading-none">
                      {(users || []).filter(u => u.is_verified).length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">已验证</p>
                  </div>
                </div>

                {/* 未激活用户 */}
                <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-muted/30 rounded-lg flex-1">
                  <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <IconUserX size={12} className="text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-bold text-foreground leading-none">
                      {(users || []).filter(u => !u.is_active).length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">未激活</p>
                  </div>
                </div>
              </div>

              {/* 统计进度条 */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>活跃率</span>
                  <span>{(users || []).length > 0 ? Math.round(((users || []).filter(u => u.is_active).length / (users || []).length) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(users || []).length > 0 ? ((users || []).filter(u => u.is_active).length / (users || []).length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 移动端功能区域 - 紧凑设计 */}
        <div className="md:hidden space-y-3">
          {/* 搜索栏 */}
          <div className="relative">
            <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索用户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full h-9 rounded-lg border-border/50 focus:border-primary text-sm"
            />
          </div>

          {/* 批量操作区域 */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span className="text-xs font-medium text-primary">
                  已选择 {selectedUsers.length} 个
                </span>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchDisable}
                  disabled={isProcessing}
                  className="h-7 px-2.5 text-xs"
                >
                  停用
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={isProcessing}
                  className="h-7 px-2.5 text-xs"
                >
                  删除
                </Button>
              </div>
            </div>
          )}

          {/* 紧凑操作按钮组 */}
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 h-10 rounded-lg shadow-sm hover:shadow transition-all duration-200">
                  <IconPlus size={16} className="mr-2" />
                  <span className="text-sm font-medium">添加用户</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>添加新用户</DialogTitle>
                  <DialogDescription>
                    填写用户信息以创建新账户
                  </DialogDescription>
                </DialogHeader>
                <UserForm 
                  onSubmit={handleAddUser} 
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              className="flex-1 h-10 rounded-lg border-border/50 hover:border-primary/50 hover:bg-primary/5 shadow-sm hover:shadow transition-all duration-200"
              onClick={() => setIsBatchImportOpen(true)}
            >
              <IconFileImport size={16} className="mr-2 text-primary" />
              <span className="text-sm font-medium">批量导入</span>
            </Button>
          </div>

          {/* 次要操作按钮组 */}
          <div className="flex gap-1.5">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchUsers()}
              className="flex-1 h-8 rounded-md border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            >
              <IconRefresh size={14} className="mr-1.5 text-muted-foreground" />
              <span className="text-xs">刷新</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsRecycleBinOpen(true)}
              className="flex-1 h-8 rounded-md border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            >
              <IconRestore size={14} className="mr-1.5 text-muted-foreground" />
              <span className="text-xs">回收站</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                try {
                  await fetch('/api/v1/users/cache/clear', { 
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                  })
                  toast.success('缓存已清除')
                  await fetchUsers()
                } catch (_error) {
                  toast.error('清除缓存失败')
                }
              }}
              className="flex-1 h-8 rounded-md border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            >
              <IconX size={14} className="mr-1.5 text-muted-foreground" />
              <span className="text-xs">清缓存</span>
            </Button>
          </div>
        </div>

        {/* 桌面端用户列表 */}
        <Card className="hidden md:block">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>用户列表</CardTitle>
                <CardDescription>
                  查看和管理系统中的所有用户
                </CardDescription>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                {/* 批量操作按钮 */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto md:mr-4">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      已选择 {selectedUsers.length} 个用户
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchDisable}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none"
                      >
                        批量停用
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBatchDelete}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none"
                      >
                        批量删除
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索用户..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full"
                    />
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto md:overflow-visible">
                    <Button variant="outline" size="sm" onClick={() => fetchUsers()} className="whitespace-nowrap">
                      <IconRefresh size={16} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">刷新</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={async () => {
                        try {
                          await fetch('/api/v1/users/cache/clear', { 
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                            }
                          })
                          toast.success('缓存已清除')
                          await fetchUsers() // 重新获取数据
                        } catch (_error) {
                          toast.error('清除缓存失败')
                        }
                      }}
                      className="whitespace-nowrap"
                    >
                      <span className="hidden md:inline">清除缓存</span>
                      <span className="md:hidden">缓存</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsRecycleBinOpen(true)}
                      className="whitespace-nowrap"
                    >
                      <IconRestore size={16} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">回收站</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsBatchImportOpen(true)}
                      className="whitespace-nowrap"
                    >
                      <IconFileImport size={16} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">批量导入</span>
                    </Button>
                  </div>
                  
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full md:w-auto whitespace-nowrap">
                        <IconPlus size={16} className="mr-1 md:mr-2" />
                        添加用户
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>添加新用户</DialogTitle>
                        <DialogDescription>
                          填写用户信息以创建新账户
                        </DialogDescription>
                      </DialogHeader>
                      <UserForm 
                        onSubmit={handleAddUser} 
                        onCancel={() => setIsAddDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 桌面端表格视图 */}
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        ref={(ref) => {
                          if (ref) {
                            const checkbox = ref.querySelector('input[type="checkbox"]') as HTMLInputElement
                            if (checkbox) {
                              checkbox.indeterminate = isIndeterminate
                            }
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[60px]">序号</TableHead>
                    <TableHead>用户信息</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>在线状态</TableHead>
                    <TableHead>账户状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>最后更新</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center">
                        没有找到用户
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => 
                              handleSelectUser(user.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {(currentPage - 1) * pageSize + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.username}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium text-primary">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{user.full_name || user.username}</div>
                              <div className="text-sm text-muted-foreground">@{user.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {getOnlineIndicator(user)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.updated_at ? new Date(user.updated_at).toLocaleDateString('zh-CN') : '未知'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingUser(user)}
                            >
                              <IconEye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(user)}
                              disabled={!canDisableUser(user)}
                              className={!canDisableUser(user) ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              {user.is_active ? (
                                <IconToggleRight size={16} className="text-green-600" />
                              ) : (
                                <IconToggleLeft size={16} className="text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                            >
                              <IconEdit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingUser(user)}
                              disabled={!canDeleteUser(user)}
                              className={`${!canDeleteUser(user) ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}
                            >
                              <IconTrash size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            
            {/* 桌面端分页控制 */}
            <div className="hidden md:flex flex-col md:flex-row items-start md:items-center justify-between px-2 py-4 gap-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium whitespace-nowrap">每页显示</p>
                <Select
                  value={`${pageSize}`}
                  onValueChange={(value) => {
                    setPageSize(Number(value))
                    setCurrentPage(1)
                    fetchUsers(1, Number(value))
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm font-medium whitespace-nowrap">条记录</p>
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-2">
                <p className="text-sm font-medium whitespace-nowrap">
                  第 {currentPage} 页，共 {Math.ceil(totalUsers / pageSize)} 页
                </p>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPage = currentPage - 1
                      setCurrentPage(newPage)
                      fetchUsers(newPage, pageSize)
                    }}
                    disabled={currentPage <= 1}
                    className="whitespace-nowrap"
                  >
                    <IconChevronLeft size={16} />
                    <span className="hidden md:inline ml-1">上一页</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPage = currentPage + 1
                      setCurrentPage(newPage)
                      fetchUsers(newPage, pageSize)
                    }}
                    disabled={currentPage >= Math.ceil(totalUsers / pageSize)}
                    className="whitespace-nowrap"
                  >
                    <span className="hidden md:inline mr-1">下一页</span>
                    <IconChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 移动端用户列表 */}
        <div className="md:hidden space-y-4">
          {/* 移动端全选控制 */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                ref={(ref) => {
                  if (ref) {
                    const checkbox = ref.querySelector('input[type="checkbox"]') as HTMLInputElement
                    if (checkbox) {
                      checkbox.indeterminate = isIndeterminate
                    }
                  }
                }}
              />
              <span className="text-sm font-medium">
                {selectedUsers.length > 0 ? `已选择 ${selectedUsers.length} 个用户` : '全选'}
              </span>
            </div>
            {selectedUsers.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchDisable}
                  disabled={isProcessing}
                >
                  停用
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={isProcessing}
                >
                  删除
                </Button>
              </div>
            )}
          </div>

          {/* 用户卡片列表 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">加载中...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">没有找到用户</div>
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <div key={user.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 space-y-4">
                {/* 用户基本信息区域 */}
                <div className="flex items-start gap-4">
                  {/* 选择框和序号 */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => 
                        handleSelectUser(user.id, !!checked)
                      }
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      #{(currentPage - 1) * pageSize + index + 1}
                    </span>
                  </div>

                  {/* 头像 */}
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/5">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-primary">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* 用户信息 */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* 主要信息 */}
                    <div className="space-y-0.5">
                      <h3 className="font-semibold text-lg leading-tight truncate text-foreground">
                        {user.full_name || user.username}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    </div>
                    
                    {/* 联系信息 */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate flex-1">{user.email}</span>
                    </div>
                  </div>

                  {/* 右侧信息区域 */}
                  <div className="flex flex-col items-end gap-3">
                    {/* 状态标识 */}
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(user)}
                      <span className="text-xs text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'}
                      </span>
                    </div>
                    
                    {/* 在线状态 */}
                    <div>
                      {getOnlineIndicator(user)}
                    </div>
                  </div>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-border/50"></div>

                {/* 操作按钮区域 */}
                <div className="grid grid-cols-4 gap-2">
                  {/* 查看 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingUser(user)}
                    className="h-8 px-2 text-xs gap-1 hover:bg-primary/5 justify-center"
                  >
                    <IconEye size={14} />
                    查看
                  </Button>
                  
                  {/* 编辑 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUser(user)}
                    className="h-8 px-2 text-xs gap-1 hover:bg-primary/5 justify-center"
                  >
                    <IconEdit size={14} />
                    编辑
                  </Button>

                  {/* 启用/停用 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(user)}
                    disabled={!canDisableUser(user)}
                    className={`h-8 px-2 text-xs gap-1 justify-center ${
                      user.is_active 
                        ? 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20' 
                        : 'hover:bg-muted/50'
                    } ${!canDisableUser(user) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {user.is_active ? (
                      <>
                        <IconToggleRight size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300">停用</span>
                      </>
                    ) : (
                      <>
                        <IconToggleLeft size={14} className="text-muted-foreground" />
                        启用
                      </>
                    )}
                  </Button>

                  {/* 删除 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingUser(user)}
                    disabled={!canDeleteUser(user)}
                    className={`h-8 px-2 text-xs gap-1 justify-center ${
                      !canDeleteUser(user) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-destructive/5 text-destructive hover:text-destructive border-destructive/20'
                    }`}
                  >
                    <IconTrash size={14} />
                    删除
                  </Button>
                </div>
              </div>
            ))
          )}

          {/* 移动端分页控制 */}
          <div className="space-y-4 pt-4">
            {/* 分页信息 */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                第 {currentPage} 页，共 {Math.ceil(totalUsers / pageSize)} 页
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                显示 {filteredUsers.length} 条，共 {totalUsers} 条记录
              </p>
            </div>

            {/* 分页按钮 */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  const newPage = currentPage - 1
                  setCurrentPage(newPage)
                  fetchUsers(newPage, pageSize)
                }}
                disabled={currentPage <= 1}
                className="flex-1 max-w-[120px] h-11"
              >
                <IconChevronLeft size={16} className="mr-2" />
                上一页
              </Button>
              
              <div className="flex items-center gap-2">
                <Select
                  value={`${pageSize}`}
                  onValueChange={(value) => {
                    setPageSize(Number(value))
                    setCurrentPage(1)
                    fetchUsers(1, Number(value))
                  }}
                >
                  <SelectTrigger className="h-9 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((size) => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}条/页
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  const newPage = currentPage + 1
                  setCurrentPage(newPage)
                  fetchUsers(newPage, pageSize)
                }}
                disabled={currentPage >= Math.ceil(totalUsers / pageSize)}
                className="flex-1 max-w-[120px] h-11"
              >
                下一页
                <IconChevronRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* 编辑用户对话框 */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑用户</DialogTitle>
              <DialogDescription>
                修改用户的基本信息和权限设置
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
              <UserForm 
                initialData={editingUser}
                onSubmit={handleUpdateUser}
                onCancel={() => setEditingUser(null)}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>

        {/* 查看用户详情对话框 */}
        <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>用户详情</DialogTitle>
              <DialogDescription>
                查看用户的详细信息
              </DialogDescription>
            </DialogHeader>
            {viewingUser && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {viewingUser.avatar_url ? (
                      <img 
                        src={viewingUser.avatar_url} 
                        alt={viewingUser.username}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-medium text-primary">
                        {viewingUser.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-semibold">{viewingUser.full_name || viewingUser.username}</h3>
                    <p className="text-muted-foreground">@{viewingUser.username}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">邮箱</label>
                    <p className="text-sm text-muted-foreground break-all">{viewingUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">状态</label>
                    <div className="mt-1">{getStatusBadge(viewingUser)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">创建时间</label>
                    <p className="text-sm text-muted-foreground">
                      {viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleString('zh-CN') : '未知'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">最后更新</label>
                    <p className="text-sm text-muted-foreground">
                      {viewingUser.updated_at ? new Date(viewingUser.updated_at).toLocaleString('zh-CN') : '未知'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
          <AlertDialogContent className="w-[95vw] max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>确认软删除用户</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>您确定要删除用户 "{deletingUser?.username}" 吗？删除的用户将移至回收站，可以在回收站中恢复。</p>
                {deletingUser?.is_active && (
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      ⚠️ 注意：该用户当前处于激活状态，删除前将自动停用该用户。
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel className="w-full sm:w-auto">取消</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deletingUser && handleDeleteUser(deletingUser)}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 回收站弹窗 */}
        <RecycleBinDialog
          open={isRecycleBinOpen}
          onOpenChange={setIsRecycleBinOpen}
          onUserRestored={() => fetchUsers()}
        />

        {/* 批量导入弹窗 */}
        <BatchImportDialog
          open={isBatchImportOpen}
          onOpenChange={setIsBatchImportOpen}
          onImportSuccess={() => fetchUsers()}
        />
      </Main>
    </>
  )
}