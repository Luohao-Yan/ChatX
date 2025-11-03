import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Input } from '@/components/ui/input'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconShield,
  IconLock,
  IconLockOpen,
  IconSearch,
  IconRefresh,
  IconEye,
  IconUsers,
  IconCheck,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { roleAPI, Role, Permission, RoleCreate, RoleUpdate } from '@/services/api/roles'

// 扩展角色类型，增加用户统计
interface RoleWithStats extends Role {
  user_count?: number
  permission_count?: number
  permissions?: Permission[]
}

export default function RolesManagement() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleWithStats | null>(null)
  const [viewingRole, setViewingRole] = useState<RoleWithStats | null>(null)

  // Fetch role permissions when viewing a role
  const {
    data: rolePermissions = [],
    isLoading: rolePermissionsLoading
  } = useQuery({
    queryKey: ['role-permissions', viewingRole?.id],
    queryFn: async () => {
      if (viewingRole?.id) {
        return await roleAPI.getRolePermissions(viewingRole.id)
      }
      return []
    },
    enabled: !!viewingRole?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch roles with stats
  const {
    data: roles = [],
    isLoading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles
  } = useQuery({
    queryKey: ['roles-with-stats'],
    queryFn: async () => {
      try {
        return await roleAPI.getRolesWithStats()
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || '获取角色列表失败')
        throw error
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch permissions
  const {
    data: permissions = [],
    isLoading: permissionsLoading,
    error: permissionsError
  } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      try {
        return await roleAPI.getAllPermissions()
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || '获取权限列表失败')
        throw error
      }
    },
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: (data: RoleCreate) => roleAPI.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-with-stats'] })
      toast.success('角色创建成功')
      setIsAddDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || '角色创建失败')
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoleUpdate }) =>
      roleAPI.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-with-stats'] })
      toast.success('角色更新成功')
      setEditingRole(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || '角色更新失败')
    },
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => roleAPI.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-with-stats'] })
      toast.success('角色删除成功')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || '角色删除失败')
    },
  })

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('nav.securityPermissions') },
    { label: t('nav.rolesPermissions') }
  ]

  // 过滤角色
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (is_active: boolean) => {
    return is_active ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        激活
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
        停用
      </Badge>
    )
  }

  const handleRefresh = () => {
    refetchRoles()
    toast.success('角色列表已刷新')
  }

  const handleToggleStatus = (role: RoleWithStats) => {
    if (role.is_system) {
      toast.error('系统角色无法修改状态')
      return
    }

    const newStatus = !role.is_active
    updateRoleMutation.mutate({
      id: role.id,
      data: { is_active: newStatus }
    })
  }

  const handleDeleteRole = (role: RoleWithStats) => {
    if (role.is_system) {
      toast.error('系统角色无法删除')
      return
    }

    if (role.user_count && role.user_count > 0) {
      toast.error('该角色下还有用户，无法删除')
      return
    }

    deleteRoleMutation.mutate(role.id)
  }

  const groupPermissionsByCategory = () => {
    const grouped: { [key: string]: Permission[] } = {}
    permissions.forEach(permission => {
      const category = permission.category || permission.group_name || '其他'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(permission)
    })
    return grouped
  }

  const RoleForm = ({ role, onClose }: { role?: RoleWithStats, onClose: () => void }) => {
    const [formData, setFormData] = useState({
      name: role?.name || '',
      display_name: role?.display_name || '',
      description: role?.description || '',
      selectedPermissions: []
    })

    // Fetch role permissions when editing
    const {
      data: editRolePermissions = [],
      isLoading: editPermissionsLoading
    } = useQuery({
      queryKey: ['edit-role-permissions', role?.id],
      queryFn: async () => {
        if (role?.id) {
          return await roleAPI.getRolePermissions(role.id)
        }
        return []
      },
      enabled: !!role?.id,
    })

    // Update form data when permissions are loaded
    useEffect(() => {
      if (editRolePermissions.length > 0) {
        setFormData(prev => ({
          ...prev,
          selectedPermissions: editRolePermissions.map(p => p.id)
        }))
      }
    }, [editRolePermissions])

    const handleSubmit = () => {
      if (!formData.name || !formData.display_name) {
        toast.error('请填写角色名称和显示名称')
        return
      }

      if (role) {
        // 编辑
        updateRoleMutation.mutate({
          id: role.id,
          data: {
            display_name: formData.display_name,
            description: formData.description,
          }
        })
      } else {
        // 新增
        createRoleMutation.mutate({
          name: formData.name,
          display_name: formData.display_name,
          description: formData.description,
        })
      }
    }

    return (
      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">角色名称 *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入角色名称，如：dept_manager"
              className="mt-1"
              disabled={!!role} // 编辑时不允许修改角色名称
            />
          </div>
          <div>
            <label className="text-sm font-medium">显示名称 *</label>
            <Input
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="输入显示名称，如：部门管理员"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">角色描述</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="输入角色描述"
              className="mt-1"
            />
          </div>
        </div>

        {/* 权限配置 */}
        <div>
          <h4 className="text-sm font-medium mb-3">权限配置</h4>
          <div className="space-y-4 max-h-64 overflow-y-auto border rounded-lg p-4">
            {(editPermissionsLoading && role) ? (
              <div className="text-center py-4">加载权限中...</div>
            ) : (
              Object.entries(groupPermissionsByCategory()).map(([category, permissions]) => (
              <div key={category}>
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{category}</h5>
                <div className="space-y-2 ml-4">
                  {permissions.map(permission => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.selectedPermissions.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              selectedPermissions: [...prev.selectedPermissions, permission.id]
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              selectedPermissions: prev.selectedPermissions.filter(p => p !== permission.id)
                            }))
                          }
                        }}
                      />
                      <label className="text-sm">{permission.display_name}</label>
                    </div>
                  ))}
                </div>
              </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
          >
            {createRoleMutation.isPending || updateRoleMutation.isPending
              ? '处理中...'
              : role
              ? '更新'
              : '创建'}
          </Button>
        </div>
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
            {t('nav.rolesPermissions')}
          </h1>
          <p className='text-muted-foreground'>
            管理系统角色和权限分配，控制用户对不同功能的访问权限
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总角色数</CardTitle>
              <IconShield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.length}</div>
              <p className="text-xs text-muted-foreground">
                包含系统和自定义角色
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">激活角色</CardTitle>
              <IconLockOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {roles.filter(r => r.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                当前可用角色
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">分配用户</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {roles.reduce((sum, role) => sum + (role.user_count || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                已分配角色的用户
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">权限项目</CardTitle>
              <IconLock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{permissions.length}</div>
              <p className="text-xs text-muted-foreground">
                系统权限总数
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 角色列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>角色列表</CardTitle>
                <CardDescription>
                  查看和管理系统中的所有角色
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索角色..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={rolesLoading}
                >
                  <IconRefresh
                    size={16}
                    className={`mr-2 ${rolesLoading ? 'animate-spin' : ''}`}
                  />
                  刷新
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <IconPlus size={16} className="mr-2" />
                      添加角色
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>添加新角色</DialogTitle>
                      <DialogDescription>
                        创建新的系统角色并配置相应的权限
                      </DialogDescription>
                    </DialogHeader>
                    <RoleForm onClose={() => setIsAddDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>角色信息</TableHead>
                    <TableHead>编码</TableHead>
                    <TableHead>用户数</TableHead>
                    <TableHead>权限数</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolesLoading || permissionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        没有找到角色
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <IconShield className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{role.display_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {role.description || '无描述'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{role.name}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IconUsers className="h-4 w-4 text-muted-foreground" />
                            <span>{role.user_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{role.permission_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(role.is_active)}
                        </TableCell>
                        <TableCell>
                          {role.is_system ? (
                            <Badge variant="secondary">系统</Badge>
                          ) : (
                            <Badge variant="outline">自定义</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(role.updated_at || role.created_at).toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingRole(role)}
                            >
                              <IconEye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingRole(role)}
                              disabled={role.is_system}
                            >
                              <IconEdit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(role)}
                              disabled={role.is_system}
                            >
                              {role.is_active ? (
                                <IconLock size={16} className="text-red-600" />
                              ) : (
                                <IconLockOpen size={16} className="text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(role)}
                              disabled={role.is_system || (role.user_count && role.user_count > 0)}
                              className="text-red-600 hover:text-red-700"
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
          </CardContent>
        </Card>

        {/* 编辑角色对话框 */}
        <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑角色</DialogTitle>
              <DialogDescription>
                修改角色信息和权限配置
              </DialogDescription>
            </DialogHeader>
            {editingRole && (
              <RoleForm role={editingRole} onClose={() => setEditingRole(null)} />
            )}
          </DialogContent>
        </Dialog>

        {/* 查看角色详情对话框 */}
        <Dialog open={!!viewingRole} onOpenChange={(open) => !open && setViewingRole(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>角色详情</DialogTitle>
              <DialogDescription>
                查看角色的详细信息和权限配置
              </DialogDescription>
            </DialogHeader>
            {viewingRole && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">角色名称</label>
                    <p className="text-sm text-muted-foreground">{viewingRole.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">显示名称</label>
                    <p className="text-sm text-muted-foreground">{viewingRole.display_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">用户数量</label>
                    <p className="text-sm text-muted-foreground">{viewingRole.user_count || 0} 人</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">状态</label>
                    <div className="mt-1">{getStatusBadge(viewingRole.is_active)}</div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">描述</label>
                    <p className="text-sm text-muted-foreground">{viewingRole.description || '无描述'}</p>
                  </div>
                </div>

                {/* 权限列表 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">权限列表</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {rolePermissionsLoading ? (
                      <div className="text-center py-4">加载中...</div>
                    ) : rolePermissions.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">该角色暂无权限</div>
                    ) : (
                      Object.entries(groupPermissionsByCategory()).map(([category, permissions]) => {
                        const categoryRolePermissions = permissions.filter(p =>
                          rolePermissions.some(rp => rp.id === p.id)
                        )
                        if (categoryRolePermissions.length === 0) return null

                        return (
                          <div key={category}>
                            <h5 className="text-sm font-medium text-muted-foreground mb-2">{category}</h5>
                            <div className="space-y-1 ml-4">
                              {categoryRolePermissions.map(permission => (
                                <div key={permission.id} className="flex items-center gap-2">
                                  <IconCheck className="h-3 w-3 text-green-600" />
                                  <span className="text-sm">{permission.display_name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}