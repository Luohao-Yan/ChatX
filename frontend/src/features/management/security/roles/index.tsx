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
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconShield,
  IconLock,
  IconUnlock,
  IconSearch,
  IconRefresh,
  IconEye,
  IconUsers,
  IconCheck,
  IconX,
  IconSettings
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

// 模拟角色数据
const mockRoles = [
  {
    id: '1',
    name: '系统管理员',
    code: 'system_admin',
    description: '拥有系统最高权限，可以管理所有功能',
    userCount: 2,
    permissions: ['user_create', 'user_edit', 'user_delete', 'role_manage', 'system_config'],
    status: 'active',
    isSystem: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    name: '部门管理员',
    code: 'dept_admin',
    description: '管理部门内的用户和基本设置',
    userCount: 8,
    permissions: ['user_view', 'user_edit', 'dept_manage'],
    status: 'active',
    isSystem: false,
    createdAt: '2024-01-05',
    updatedAt: '2024-02-01'
  },
  {
    id: '3',
    name: '普通用户',
    code: 'normal_user',
    description: '系统的基础用户权限',
    userCount: 185,
    permissions: ['user_view', 'profile_edit'],
    status: 'active',
    isSystem: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-10'
  },
  {
    id: '4',
    name: '访客用户',
    code: 'guest_user',
    description: '临时访问权限，功能受限',
    userCount: 12,
    permissions: ['user_view'],
    status: 'active',
    isSystem: false,
    createdAt: '2024-01-20',
    updatedAt: '2024-02-05'
  },
  {
    id: '5',
    name: '已停用角色',
    code: 'disabled_role',
    description: '已停用的测试角色',
    userCount: 0,
    permissions: [],
    status: 'disabled',
    isSystem: false,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-25'
  }
]

// 模拟权限数据
const mockPermissions = [
  { id: 'user_view', name: '查看用户', category: '用户管理' },
  { id: 'user_create', name: '创建用户', category: '用户管理' },
  { id: 'user_edit', name: '编辑用户', category: '用户管理' },
  { id: 'user_delete', name: '删除用户', category: '用户管理' },
  { id: 'role_manage', name: '角色管理', category: '权限管理' },
  { id: 'dept_manage', name: '部门管理', category: '组织管理' },
  { id: 'system_config', name: '系统配置', category: '系统管理' },
  { id: 'profile_edit', name: '编辑个人资料', category: '个人设置' }
]

export default function RolesManagement() {
  const { t } = useTranslation()
  const [roles, setRoles] = useState(mockRoles)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [viewingRole, setViewingRole] = useState<any>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('nav.securityPermissions') },
    { label: t('nav.rolesPermissions') }
  ]

  // 过滤角色
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
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
    setLoading(true)
    setTimeout(() => {
      toast.success('角色列表已刷新')
      setLoading(false)
    }, 1000)
  }

  const handleToggleStatus = (role: any) => {
    if (role.isSystem) {
      toast.error('系统角色无法修改状态')
      return
    }
    
    const newStatus = role.status === 'active' ? 'disabled' : 'active'
    setRoles(prev => prev.map(r => 
      r.id === role.id ? { ...r, status: newStatus } : r
    ))
    toast.success(`角色已${newStatus === 'active' ? '启用' : '停用'}`)
  }

  const handleDeleteRole = (role: any) => {
    if (role.isSystem) {
      toast.error('系统角色无法删除')
      return
    }
    
    if (role.userCount > 0) {
      toast.error('该角色下还有用户，无法删除')
      return
    }
    
    setRoles(prev => prev.filter(r => r.id !== role.id))
    toast.success('角色已删除')
  }

  const groupPermissionsByCategory = () => {
    const grouped: { [key: string]: typeof mockPermissions } = {}
    mockPermissions.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = []
      }
      grouped[permission.category].push(permission)
    })
    return grouped
  }

  const RoleForm = ({ role, onClose }: { role?: any, onClose: () => void }) => {
    const [formData, setFormData] = useState({
      name: role?.name || '',
      code: role?.code || '',
      description: role?.description || '',
      permissions: role?.permissions || []
    })

    const handleSubmit = () => {
      if (!formData.name || !formData.code) {
        toast.error('请填写角色名称和编码')
        return
      }
      
      if (role) {
        // 编辑
        setRoles(prev => prev.map(r => 
          r.id === role.id ? { ...r, ...formData, updatedAt: new Date().toISOString() } : r
        ))
        toast.success('角色更新成功')
      } else {
        // 新增
        const newRole = {
          id: Date.now().toString(),
          ...formData,
          userCount: 0,
          status: 'active',
          isSystem: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setRoles(prev => [newRole, ...prev])
        toast.success('角色创建成功')
      }
      onClose()
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
              placeholder="输入角色名称"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">角色编码 *</label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              placeholder="输入角色编码，如：dept_manager"
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
            {Object.entries(groupPermissionsByCategory()).map(([category, permissions]) => (
              <div key={category}>
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{category}</h5>
                <div className="space-y-2 ml-4">
                  {permissions.map(permission => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.permissions.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission.id]
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission.id)
                            }))
                          }
                        }}
                      />
                      <label className="text-sm">{permission.name}</label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            {role ? '更新' : '创建'}
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
              <IconUnlock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {roles.filter(r => r.status === 'active').length}
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
                {roles.reduce((sum, role) => sum + role.userCount, 0)}
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
              <div className="text-2xl font-bold">{mockPermissions.length}</div>
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
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <IconRefresh size={16} className="mr-2" />
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
                  {loading ? (
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
                              <div className="font-medium">{role.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {role.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{role.code}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IconUsers className="h-4 w-4 text-muted-foreground" />
                            <span>{role.userCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{role.permissions.length}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(role.status)}
                        </TableCell>
                        <TableCell>
                          {role.isSystem ? (
                            <Badge variant="secondary">系统</Badge>
                          ) : (
                            <Badge variant="outline">自定义</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(role.updatedAt).toLocaleDateString('zh-CN')}
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
                              disabled={role.isSystem}
                            >
                              <IconEdit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(role)}
                              disabled={role.isSystem}
                            >
                              {role.status === 'active' ? (
                                <IconLock size={16} className="text-red-600" />
                              ) : (
                                <IconUnlock size={16} className="text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(role)}
                              disabled={role.isSystem || role.userCount > 0}
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
                    <label className="text-sm font-medium">角色编码</label>
                    <p className="text-sm text-muted-foreground">{viewingRole.code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">用户数量</label>
                    <p className="text-sm text-muted-foreground">{viewingRole.userCount} 人</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">状态</label>
                    <div className="mt-1">{getStatusBadge(viewingRole.status)}</div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">描述</label>
                    <p className="text-sm text-muted-foreground">{viewingRole.description}</p>
                  </div>
                </div>

                {/* 权限列表 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">权限列表</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {Object.entries(groupPermissionsByCategory()).map(([category, permissions]) => {
                      const rolePermissions = permissions.filter(p => viewingRole.permissions.includes(p.id))
                      if (rolePermissions.length === 0) return null
                      
                      return (
                        <div key={category}>
                          <h5 className="text-sm font-medium text-muted-foreground mb-2">{category}</h5>
                          <div className="space-y-1 ml-4">
                            {rolePermissions.map(permission => (
                              <div key={permission.id} className="flex items-center gap-2">
                                <IconCheck className="h-3 w-3 text-green-600" />
                                <span className="text-sm">{permission.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
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