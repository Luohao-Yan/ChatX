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
  IconChevronRight
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

export default function UsersManagement() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  
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
    if (user.is_online) {
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
                      <TableCell colSpan={7} className="h-32 text-center">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        没有找到用户
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
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
                            >
                              <IconTrash size={16} className="text-red-600" />
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
              <AlertDialogTitle>确认删除用户</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要删除用户 "{deletingUser?.username}" 吗？此操作不可撤销。
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