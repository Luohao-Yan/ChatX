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
  IconRestore
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
import { useUsersApi } from '@/features/users/services/users-api'
import { User } from '@/features/users/data/schema'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
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
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalUsers, setTotalUsers] = useState(0)
  
  const userApi = useUsersApi()

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
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
      toast.error('创建用户失败，请检查输入信息')
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
      toast.error('更新用户失败，请检查输入信息')
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
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-green-600">在线</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-xs text-gray-500">离线</span>
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

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                总用户数
              </CardTitle>
              <IconUsers size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(users || []).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                活跃用户
              </CardTitle>
              <IconUserCheck size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(users || []).filter(u => u.is_active).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                已验证用户
              </CardTitle>
              <IconToggleRight size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(users || []).filter(u => u.is_verified).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                未激活用户
              </CardTitle>
              <IconUserX size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(users || []).filter(u => !u.is_active).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* 用户列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>用户列表</CardTitle>
                <CardDescription>
                  查看和管理系统中的所有用户
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* 批量操作按钮 */}
                {selectedUsers.length > 0 && (
                  <div className="flex items-center gap-2 mr-4">
                    <span className="text-sm text-muted-foreground">
                      已选择 {selectedUsers.length} 个用户
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchDisable}
                      disabled={isProcessing}
                    >
                      批量停用
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBatchDelete}
                      disabled={isProcessing}
                    >
                      批量删除
                    </Button>
                  </div>
                )}
                
                <div className="relative">
                  <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索用户..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchUsers()}>
                  <IconRefresh size={16} className="mr-2" />
                  刷新
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
                >
                  清除缓存
                </Button>
                <Link to="/management/users/recycle-bin">
                  <Button variant="outline" size="sm">
                    <IconRestore size={16} className="mr-2" />
                    回收站
                  </Button>
                </Link>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <IconPlus size={16} className="mr-2" />
                      添加用户
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
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
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
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
            
            {/* 分页控制 */}
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">每页显示</p>
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
                <p className="text-sm font-medium">条记录</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
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
                  >
                    <IconChevronLeft size={16} />
                    上一页
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
                  >
                    下一页
                    <IconChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 编辑用户对话框 */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-2xl">
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>用户详情</DialogTitle>
              <DialogDescription>
                查看用户的详细信息
              </DialogDescription>
            </DialogHeader>
            {viewingUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
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
                  <div>
                    <h3 className="text-lg font-semibold">{viewingUser.full_name || viewingUser.username}</h3>
                    <p className="text-muted-foreground">@{viewingUser.username}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">邮箱</label>
                    <p className="text-sm text-muted-foreground">{viewingUser.email}</p>
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认软删除用户</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要删除用户 "{deletingUser?.username}" 吗？删除的用户将移至回收站，可以在回收站中恢复。
                {deletingUser?.is_active && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ 注意：该用户当前处于激活状态，删除前将自动停用该用户。
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deletingUser && handleDeleteUser(deletingUser)}
                className="bg-red-600 hover:bg-red-700"
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