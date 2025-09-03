/**
 * 系统用户管理页面
 * 只有超级管理员可以访问，用于管理system租户下的用户
 */

import { useState, useEffect, useCallback } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  IconEdit, 
  IconTrash, 
  IconToggleLeft, 
  IconToggleRight,
  IconUsers,
  IconUserX,
  IconSearch,
  IconRefresh,
  IconEye,
  IconDotsVertical,
  IconShield
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usersAPI } from '@/services/api/users'
import { tenantAPI, Tenant } from '@/services/api/tenants'
import { User } from '@/types/entities/user'
import { toast } from 'sonner'
import { useAuth } from '@/stores/auth'

export default function SystemUsersManagement() {
  const { t } = useTranslation()
  const { userInfo: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  // const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 租户相关状态
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('system')
  const [tenantsLoading, setTenantsLoading] = useState(false)
  
  // 分页状态
  const [currentPage] = useState(1)
  const [pageSize] = useState(10)
  // const [totalUsers, setTotalUsers] = useState(0)
  
  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('nav.systemManagement') },
    { label: '租户用户管理' },
    ...(selectedTenantId && selectedTenantId !== 'system' && selectedTenantId !== 'all' ? 
      [{ label: tenants.find(t => t.id === selectedTenantId)?.display_name || '未知租户' }] : 
      [])
  ]

  // 获取租户列表
  const fetchTenants = useCallback(async () => {
    try {
      setTenantsLoading(true)
      const tenantsData = await tenantAPI.getTenants()
      setTenants(tenantsData)
    } catch (error) {
      console.error('❌ [SystemUsers] 获取租户列表失败:', error)
      toast.error('获取租户列表失败')
    } finally {
      setTenantsLoading(false)
    }
  }, [])

  // 获取租户用户列表
  const fetchTenantUsers = useCallback(async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true)
      const skip = (page - 1) * size
      
      const params: any = {
        skip,
        limit: size,
        search: searchQuery || undefined,
      }
      
      const users = await usersAPI.getUsers(params)
      
      // 根据选择的租户过滤用户
      let filteredUsers = users
      if (selectedTenantId === 'system') {
        // 系统用户：superuser或具有super_admin角色或current_tenant_id为system
        filteredUsers = users.filter(user => {
          const isSuperuser = Boolean(user.is_superuser)
          const hasSuperAdminRole = Array.isArray(user.roles) && user.roles.includes('super_admin')
          const isSystemTenant = user.current_tenant_id === 'system'
          
          return isSuperuser || hasSuperAdminRole || isSystemTenant
        })
      } else if (selectedTenantId === 'all') {
        // 显示所有用户
        filteredUsers = users
      } else {
        // 特定租户的用户
        filteredUsers = users.filter(user => user.current_tenant_id === selectedTenantId)
      }
      
      setUsers(filteredUsers)
      // setTotalUsers(filteredUsers.length)
    } catch (error) {
      console.error('❌ [SystemUsers] 获取用户列表失败:', error)
      toast.error('获取用户列表失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, searchQuery, selectedTenantId])

  // 移除用户
  const handleRemoveUser = useCallback(async (userId: string) => {
    if (selectedTenantId === 'system' || selectedTenantId === 'all') {
      toast.error('无法从系统租户或全部用户视图中移除用户')
      return
    }

    try {
      setIsProcessing(true)
      await tenantAPI.removeTenantUser(selectedTenantId, userId)
      toast.success('用户移除成功')
      // 刷新用户列表
      await fetchTenantUsers()
    } catch (error) {
      console.error('❌ [SystemUsers] 移除用户失败:', error)
      toast.error('移除用户失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }, [selectedTenantId, fetchTenantUsers])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  useEffect(() => {
    fetchTenantUsers()
  }, [fetchTenantUsers])

  // 当选择的租户改变时，重新获取用户列表
  useEffect(() => {
    if (selectedTenantId) {
      fetchTenantUsers(1, pageSize) // 重置到第一页
    }
  }, [selectedTenantId, fetchTenantUsers, pageSize])

  // 过滤用户
  const filteredUsers = searchQuery ? users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) : users

  const handleToggleActive = async (user: User) => {
    if (!checkCanToggleUser(user)) {
      return
    }
    
    try {
      await usersAPI.updateUser(user.id, { is_active: !user.is_active })
      setUsers(prev => prev.map(u => 
        u.id === user.id 
          ? { ...u, is_active: !u.is_active }
          : u
      ))
      toast.success(`用户${user.username}已${user.is_active ? '停用' : '启用'}`)
    } catch (error) {
      toast.error('更新用户状态失败，请稍后重试')
    }
  }

  const handleDeleteUser = async (user: User) => {
    try {
      if (user.is_active) {
        await usersAPI.updateUser(user.id, { is_active: false })
        toast.success(`用户${user.username}已停用`)
      }
      
      await usersAPI.deleteUser(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setDeletingUser(null)
      toast.success(`用户${user.username}已删除`)
    } catch (error) {
      toast.error('删除用户失败，请稍后重试')
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

  const getUserTypeBadge = (user: User) => {
    if (user.is_superuser) {
      return <Badge variant="default" className="bg-red-100 text-red-800">超级管理员</Badge>
    }
    return <Badge variant="outline">系统用户</Badge>
  }

  const getOnlineIndicator = (user: User) => {
    const isOnline = Boolean(user.is_online)
    
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

  // 权限检查函数
  const canToggleUser = (user: User): boolean => {
    if (!currentUser) return false
    if (user.id === currentUser.id) return false
    return true
  }

  const canDeleteUser = (user: User): boolean => {
    if (!currentUser) return false
    if (user.id === currentUser.id) return false
    if (user.is_superuser && user.id !== currentUser.id) return false
    if (user.deleted_at) return false
    if (user.is_active) return false
    return true
  }

  const checkCanToggleUser = (user: User): boolean => {
    if (!currentUser) return false
    
    if (user.id === currentUser.id) {
      toast.error('不能修改自己的账户状态')
      return false
    }
    
    if (user.deleted_at) {
      toast.error('已删除的用户无法修改状态')
      return false
    }
    
    return true
  }

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

  const isAllSelected = filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length
  const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length

  return (
    <>
      <Header>
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
      </Header>

      <Main fixed className="p-2 sm:p-4 lg:p-4">
        {/* 页面标题 */}
        <div className='space-y-2 mb-6'>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight'>
            租户用户管理
          </h1>
          <p className='text-sm text-muted-foreground'>
            {selectedTenantId === 'system' ? '管理系统租户用户，包括超级管理员和系统管理员账户' :
             selectedTenantId === 'all' ? '查看和管理系统中的所有用户账户' :
             '管理指定租户下的用户，可以将用户移动到其他租户'}
          </p>
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">当前视图用户总数</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                激活用户: {users.filter(u => u.is_active).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">超级管理员</CardTitle>
              <IconShield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.is_superuser).length}
              </div>
              <p className="text-xs text-muted-foreground">
                拥有最高权限
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">当前租户</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {selectedTenantId === 'system' ? '系统租户' :
                 selectedTenantId === 'all' ? '全部租户' :
                 tenants.find(t => t.id === selectedTenantId)?.display_name || '未知租户'}
              </div>
              <p className="text-xs text-muted-foreground">
                在线用户: {users.filter(u => u.is_online).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 用户列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <IconUsers className="h-5 w-5" />
                  系统用户列表
                </CardTitle>
                <CardDescription>
                  {selectedTenantId === 'system' ? '系统租户下的所有用户账户' :
                   selectedTenantId === 'all' ? '系统中的所有用户账户' :
                   `租户 "${tenants.find(t => t.id === selectedTenantId)?.display_name || '未知'}" 下的用户账户`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* 租户选择器 */}
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId} disabled={tenantsLoading}>
                  <SelectTrigger className="min-w-[180px]">
                    <SelectValue placeholder="选择租户..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">系统租户</SelectItem>
                    <SelectItem value="all">全部用户</SelectItem>
                    {tenants.filter(t => t.id !== 'system').map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="relative min-w-[200px]">
                  <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索用户..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchTenantUsers()}>
                  <IconRefresh size={16} className="mr-2" />
                  刷新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-md">
              <div className="overflow-y-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          className={isIndeterminate ? "data-[state=indeterminate]:bg-primary" : ""}
                        />
                      </TableHead>
                      <TableHead>用户信息</TableHead>
                      <TableHead>用户类型</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>在线状态</TableHead>
                      <TableHead>最后登录</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            <span className="ml-2">加载中...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          {searchQuery ? '没有找到匹配的用户' : '暂无系统用户数据'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {user.full_name?.charAt(0) || user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{user.full_name || user.username}</div>
                                <div className="text-sm text-muted-foreground">@{user.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getUserTypeBadge(user)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{user.email}</div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user)}
                          </TableCell>
                          <TableCell>
                            {getOnlineIndicator(user)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.last_login ? new Date(user.last_login).toLocaleDateString('zh-CN') : '从未登录'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingUser(user)}
                                className="h-8 w-8 p-0"
                              >
                                <IconEye size={16} />
                              </Button>
                              {/* <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                                className="h-8 w-8 p-0"
                              >
                                <IconEdit size={16} />
                              </Button> */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(user)}
                                disabled={!canToggleUser(user)}
                                className={`h-8 w-8 p-0 ${!canToggleUser(user) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {user.is_active ? (
                                  <IconToggleLeft size={16} className="text-orange-500" />
                                ) : (
                                  <IconToggleRight size={16} className="text-green-500" />
                                )}
                              </Button>
                              {/* 移除用户按钮 - 仅在特定租户视图中显示 */}
                              {selectedTenantId !== 'system' && selectedTenantId !== 'all' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveUser(user.id)}
                                  disabled={isProcessing}
                                  className="h-8 w-8 p-0 text-orange-500 hover:text-orange-600"
                                  title="从当前租户移除用户"
                                >
                                  <IconUserX size={16} />
                                </Button>
                              )}
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <IconDotsVertical size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setDeletingUser(user)} disabled={!canDeleteUser(user)}>
                                    <IconTrash size={16} className="mr-2" />
                                    删除用户
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 查看用户详情对话框 */}
        <Dialog 
          open={!!viewingUser} 
          onOpenChange={(open) => {
            if (!open) setViewingUser(null)
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>系统用户详情</DialogTitle>
              <DialogDescription>
                查看系统用户的详细信息
              </DialogDescription>
            </DialogHeader>
            {viewingUser && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-medium text-primary">
                      {viewingUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-semibold">{viewingUser.full_name || viewingUser.username}</h3>
                    <p className="text-muted-foreground">@{viewingUser.username}</p>
                    <div className="mt-2 flex gap-2 justify-center sm:justify-start">
                      {getUserTypeBadge(viewingUser)}
                      {getStatusBadge(viewingUser)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">邮箱</label>
                    <p className="text-sm text-muted-foreground break-all">{viewingUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">租户ID</label>
                    <p className="text-sm text-muted-foreground">{viewingUser.current_tenant_id}</p>
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
        <AlertDialog 
          open={!!deletingUser} 
          onOpenChange={(open) => {
            if (!open) setDeletingUser(null)
          }}
        >
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除系统用户</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>您确定要删除系统用户 "{deletingUser?.username}" 吗？</p>
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
                className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Main>
    </>
  )
}