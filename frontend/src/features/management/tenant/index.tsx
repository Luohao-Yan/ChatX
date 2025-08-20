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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconBuilding,
  IconSearch,
  IconRefresh,
  IconEye,
  IconUsers,
  IconDots,
  IconShield,
  IconDatabase,
  IconDeviceFloppy,
  IconHistory,
  IconAlertTriangle
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { tenantAPI, Tenant, TenantStatus, TenantBackup } from '@/services/api/tenants'
import { useAuth } from '@/stores/auth'

export default function TenantManagement() {
  const { t } = useTranslation()
  const { userInfo } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null)
  const [backupingTenant, setBackupingTenant] = useState<Tenant | null>(null)
  const [tenantBackups, setTenantBackups] = useState<TenantBackup[]>([])
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [backupForm, setBackupForm] = useState({
    backup_name: '',
    description: ''
  })
  
  // 创建租户表单状态
  const [createForm, setCreateForm] = useState({
    name: '',
    display_name: '',
    description: '',
    slug: '',
    owner_id: '',
    features: ['user_management', 'file_management', 'basic_chat'] as string[],
    limits: {
      max_users: -1, // -1 表示无限制
      max_file_size_mb: -1, // -1 表示无限制
      max_storage_gb: -1 // -1 表示无限制
    }
  })

  // 编辑租户表单状态
  const [editForm, setEditForm] = useState({
    display_name: '',
    description: '',
    features: [] as string[],
    limits: {
      max_users: -1,
      max_file_size_mb: -1,
      max_storage_gb: -1
    }
  })

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: '系统管理' },
    { label: '租户管理' }
  ]

  // 加载租户数据
  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true)
      console.log('🏢 [TenantManagement] 开始获取租户列表...')
      const tenantsData = await tenantAPI.getTenants({
        search: searchQuery || undefined
      })
      console.log('🏢 [TenantManagement] 获取到租户数量:', tenantsData.length, tenantsData)
      setTenants(tenantsData)
    } catch (error) {
      console.error('❌ [TenantManagement] 获取租户列表失败:', error)
      toast.error('获取租户列表失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  // 初始加载数据
  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  // 过滤租户
  const filteredTenants = tenants.filter(tenant => 
    tenant.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tenant.description && tenant.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleRefresh = async () => {
    await fetchTenants()
    toast.success('租户列表已刷新')
  }

  // 创建租户处理函数
  const handleCreateTenant = async () => {
    if (!createForm.name || !createForm.display_name) {
      toast.error('请填写必填字段')
      return
    }

    try {
      setIsCreating(true)
      console.log('🏢 [TenantManagement] 创建租户:', createForm)
      
      const newTenant = await tenantAPI.createTenant({
        name: createForm.name,
        display_name: createForm.display_name,
        description: createForm.description,
        slug: createForm.slug || createForm.name.toLowerCase().replace(/\s+/g, '_'),
        owner_id: userInfo?.id || 'system', // 使用当前用户ID作为所有者
        features: createForm.features,
        limits: createForm.limits,
        settings: {
          allow_self_registration: false,
          user_type: 'enterprise',
          max_users: createForm.limits.max_users,
          features: createForm.features
        }
      })
      
      // 添加到租户列表
      setTenants(prev => [newTenant, ...prev])
      
      // 重置表单
      setCreateForm({
        name: '',
        display_name: '',
        description: '',
        slug: '',
        owner_id: '',
        features: ['user_management', 'file_management', 'basic_chat'],
        limits: {
          max_users: -1, // -1 表示无限制
          max_file_size_mb: -1, // -1 表示无限制
          max_storage_gb: -1 // -1 表示无限制
        }
      })
      
      setIsAddDialogOpen(false)
      toast.success('租户创建成功')
    } catch (error) {
      console.error('❌ [TenantManagement] 创建租户失败:', error)
      toast.error('创建租户失败，请稍后重试')
    } finally {
      setIsCreating(false)
    }
  }

  // 初始化编辑表单
  const initEditForm = (tenant: Tenant) => {
    setEditForm({
      display_name: tenant.display_name || tenant.name,
      description: tenant.description || '',
      features: tenant.features || [],
      limits: {
        max_users: tenant.limits?.max_users || -1,
        max_file_size_mb: tenant.limits?.max_file_size_mb || -1,
        max_storage_gb: tenant.limits?.max_storage_gb || -1
      }
    })
  }

  // 编辑租户处理函数
  const handleEditTenant = async () => {
    if (!editingTenant) return
    
    try {
      setIsEditing(true)
      
      // 准备更新数据
      const updateData = {
        display_name: editForm.display_name,
        description: editForm.description,
        features: editForm.features,
        limits: editForm.limits
      }
      
      await tenantAPI.updateTenant(editingTenant.id, updateData)
      toast.success('租户更新成功')
      setEditingTenant(null)
      
      // 重新获取租户列表
      await fetchTenants()
    } catch (error) {
      console.error('❌ [TenantManagement] 编辑租户失败:', error)
      toast.error('编辑租户失败，请稍后重试')
    } finally {
      setIsEditing(false)
    }
  }

  // 备份租户处理函数
  const handleBackupTenant = async () => {
    if (!backupingTenant) return
    
    try {
      setIsBackingUp(true)
      console.log('🏢 [TenantManagement] 备份租户:', backupingTenant.id, backupForm)
      
      const backup = await tenantAPI.backupTenant(backupingTenant.id, {
        backup_name: backupForm.backup_name || `${backupingTenant.display_name}_备份`,
        description: backupForm.description
      })
      
      console.log('✅ [TenantManagement] 租户备份成功:', backup)
      
      // 重置表单
      setBackupForm({ backup_name: '', description: '' })
      setBackupingTenant(null)
      
      toast.success(`租户备份成功，版本: v${backup.version}`)
    } catch (error) {
      console.error('❌ [TenantManagement] 备份租户失败:', error)
      toast.error('备份租户失败，请稍后重试')
    } finally {
      setIsBackingUp(false)
    }
  }

  // 删除租户处理函数
  const handleDeleteTenant = async () => {
    if (!deletingTenant) return
    
    try {
      setIsDeleting(true)
      console.log('🏢 [TenantManagement] 删除租户:', deletingTenant.id)
      
      await tenantAPI.deleteTenant(deletingTenant.id)
      
      // 从列表中移除
      setTenants(prev => prev.filter(t => t.id !== deletingTenant.id))
      setDeletingTenant(null)
      
      toast.success('租户删除成功')
    } catch (error: any) {
      console.error('❌ [TenantManagement] 删除租户失败:', error)
      const errorMessage = error?.response?.data?.detail || error.message || '删除租户失败，请稍后重试'
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  // 加载备份列表
  const loadTenantBackups = async (tenantId: string) => {
    try {
      const backups = await tenantAPI.getTenantBackups(tenantId)
      setTenantBackups(backups)
      console.log('🏢 [TenantManagement] 加载备份列表:', backups)
    } catch (error) {
      console.error('❌ [TenantManagement] 加载备份列表失败:', error)
      toast.error('加载备份列表失败')
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge variant="default" className="bg-green-100 text-green-800">激活</Badge> : 
      <Badge variant="secondary" className="bg-red-100 text-red-800">禁用</Badge>
  }

  return (
    <>
      <Header>
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
      </Header>

      <Main className="overflow-y-auto">
        <div className='space-y-0.5 mb-4'>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight'>
            租户管理
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            管理系统中的所有租户，只有超级管理员可以访问此功能
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总租户数</CardTitle>
              <IconBuilding className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
              <p className="text-xs text-muted-foreground">
                激活租户: {tenants.filter(t => t.is_active).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总用户数</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants.reduce((sum, tenant) => sum + (tenant.user_count || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                所有租户用户
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总组织数</CardTitle>
              <IconBuilding className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants.reduce((sum, tenant) => sum + (tenant.org_count || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                所有租户组织
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">存储使用</CardTitle>
              <IconDatabase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants.reduce((total, tenant) => {
                  // 如果有 storage_used，尝试解析数值
                  if (tenant.storage_used) {
                    const match = tenant.storage_used.match(/(\d+\.?\d*)/);
                    return total + (match ? parseFloat(match[1]) : 0);
                  }
                  return total;
                }, 0).toFixed(1)} GB
              </div>
              <p className="text-xs text-muted-foreground">
                总存储使用量
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 租户列表 */}
        <Card>
          <CardHeader>
            {/* 大屏幕：标题描述和操作按钮在同一行，小屏幕：分两行 */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              {/* 标题和描述 */}
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl">租户列表</CardTitle>
                <CardDescription className="text-sm mt-1">
                  查看和管理所有系统租户
                </CardDescription>
              </div>
              
              {/* 搜索和操作按钮 - 大屏幕时在右侧，小屏幕时独占一行 */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 lg:flex-shrink-0">
                <div className="relative flex-1 min-w-0 sm:w-64 lg:w-64">
                  <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索租户..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="flex-1 sm:flex-initial">
                    <IconRefresh size={16} className="mr-2" />
                    <span>刷新</span>
                  </Button>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1 sm:flex-initial">
                        <IconPlus size={16} className="mr-2" />
                        <span>创建租户</span>
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>创建新租户</DialogTitle>
                      <DialogDescription>
                        为新企业或组织创建独立的租户环境
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">租户标识 *</Label>
                          <Input
                            id="name"
                            placeholder="tenant_name"
                            value={createForm.name}
                            onChange={(e) => setCreateForm(prev => ({ 
                              ...prev, 
                              name: e.target.value,
                              slug: e.target.value.toLowerCase().replace(/\s+/g, '_')
                            }))}
                          />
                          <p className="text-xs text-muted-foreground">用于系统内部标识，只能使用字母、数字和下划线</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="display_name">显示名称 *</Label>
                          <Input
                            id="display_name"
                            placeholder="企业名称"
                            value={createForm.display_name}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, display_name: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">描述</Label>
                        <Textarea
                          id="description"
                          placeholder="租户描述信息"
                          rows={3}
                          value={createForm.description}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="max_users">最大用户数</Label>
                          <Input
                            id="max_users"
                            type="text"
                            placeholder="无限制"
                            value={createForm.limits.max_users === -1 ? '' : createForm.limits.max_users.toString()}
                            onChange={(e) => {
                              const value = e.target.value.trim()
                              if (value === '' || value === '无限制') {
                                setCreateForm(prev => ({ 
                                  ...prev, 
                                  limits: { ...prev.limits, max_users: -1 }
                                }))
                              } else {
                                const num = parseInt(value)
                                if (!isNaN(num) && num >= 0) {
                                  setCreateForm(prev => ({ 
                                    ...prev, 
                                    limits: { ...prev.limits, max_users: num }
                                  }))
                                }
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground">留空表示无限制，或输入具体数字</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="max_storage_gb">存储限制 (GB)</Label>
                          <Input
                            id="max_storage_gb"
                            type="text"
                            placeholder="无限制"
                            value={createForm.limits.max_storage_gb === -1 ? '' : createForm.limits.max_storage_gb.toString()}
                            onChange={(e) => {
                              const value = e.target.value.trim()
                              if (value === '' || value === '无限制') {
                                setCreateForm(prev => ({ 
                                  ...prev, 
                                  limits: { ...prev.limits, max_storage_gb: -1 }
                                }))
                              } else {
                                const num = parseInt(value)
                                if (!isNaN(num) && num >= 0) {
                                  setCreateForm(prev => ({ 
                                    ...prev, 
                                    limits: { ...prev.limits, max_storage_gb: num }
                                  }))
                                }
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground">留空表示无限制，或输入具体数字</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="max_file_size_mb">文件大小限制 (MB)</Label>
                          <Input
                            id="max_file_size_mb"
                            type="text"
                            placeholder="无限制"
                            value={createForm.limits.max_file_size_mb === -1 ? '' : createForm.limits.max_file_size_mb.toString()}
                            onChange={(e) => {
                              const value = e.target.value.trim()
                              if (value === '' || value === '无限制') {
                                setCreateForm(prev => ({ 
                                  ...prev, 
                                  limits: { ...prev.limits, max_file_size_mb: -1 }
                                }))
                              } else {
                                const num = parseInt(value)
                                if (!isNaN(num) && num >= 0) {
                                  setCreateForm(prev => ({ 
                                    ...prev, 
                                    limits: { ...prev.limits, max_file_size_mb: num }
                                  }))
                                }
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground">留空表示无限制，或输入具体数字</p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={handleCreateTenant} disabled={isCreating}>
                          {isCreating ? '创建中...' : '创建租户'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>租户名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>用户数</TableHead>
                    <TableHead>组织数</TableHead>
                    <TableHead>存储使用</TableHead>
                    <TableHead>创建者</TableHead>
                    <TableHead>创建时间</TableHead>
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
                  ) : filteredTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        没有找到租户
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <IconBuilding className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{tenant.display_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {tenant.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(tenant.is_active)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IconUsers size={14} className="text-muted-foreground" />
                            <span>{tenant.user_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IconBuilding size={14} className="text-muted-foreground" />
                            <span>{tenant.org_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IconDatabase size={14} className="text-muted-foreground" />
                            <span>{tenant.storage_used || '0 GB'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tenant.owner_id === 'system' ? '系统' : tenant.owner_id || '未知'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(tenant.created_at).toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <IconDots size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewingTenant(tenant)}>
                                <IconEye size={16} className="mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingTenant(tenant)
                                initEditForm(tenant)
                              }}>
                                <IconEdit size={16} className="mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setBackupingTenant(tenant)
                                setBackupForm({
                                  backup_name: `${tenant.display_name}_备份_${new Date().toISOString().slice(0, 10)}`,
                                  description: ''
                                })
                              }}>
                                <IconDeviceFloppy size={16} className="mr-2" />
                                备份
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeletingTenant(tenant)} className="text-red-600">
                                <IconTrash size={16} className="mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 查看租户详情对话框 */}
        <Dialog open={!!viewingTenant} onOpenChange={(open) => !open && setViewingTenant(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>租户详情</DialogTitle>
              <DialogDescription>
                查看租户的详细信息和使用情况
              </DialogDescription>
            </DialogHeader>
            {viewingTenant && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconBuilding className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{viewingTenant.display_name}</h3>
                    <p className="text-muted-foreground">{viewingTenant.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">租户ID</label>
                    <p className="text-sm text-muted-foreground">{viewingTenant.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">状态</label>
                    <div className="mt-1">{getStatusBadge(viewingTenant.is_active)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">用户数量</label>
                    <p className="text-sm text-muted-foreground">{viewingTenant.user_count || 0} 人</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">组织数量</label>
                    <p className="text-sm text-muted-foreground">{viewingTenant.org_count || 0} 个</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">存储使用</label>
                    <p className="text-sm text-muted-foreground">{viewingTenant.storage_used || '0 GB'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">创建时间</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(viewingTenant.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 编辑租户对话框 */}
        <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑租户</DialogTitle>
              <DialogDescription>
                修改租户的基本信息和设置
              </DialogDescription>
            </DialogHeader>
            {editingTenant && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <IconBuilding className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{editingTenant.name}</div>
                    <div className="text-sm text-muted-foreground">租户ID: {editingTenant.id}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_display_name">显示名称 *</Label>
                    <Input
                      id="edit_display_name"
                      placeholder="企业名称"
                      value={editForm.display_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_description">描述</Label>
                  <Textarea
                    id="edit_description"
                    placeholder="租户描述信息"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_max_users">最大用户数</Label>
                    <Input
                      id="edit_max_users"
                      type="text"
                      placeholder="无限制"
                      value={editForm.limits.max_users === -1 ? '' : editForm.limits.max_users.toString()}
                      onChange={(e) => {
                        const value = e.target.value.trim()
                        if (value === '' || value === '无限制') {
                          setEditForm(prev => ({ 
                            ...prev, 
                            limits: { ...prev.limits, max_users: -1 }
                          }))
                        } else {
                          const num = parseInt(value)
                          if (!isNaN(num) && num >= 0) {
                            setEditForm(prev => ({ 
                              ...prev, 
                              limits: { ...prev.limits, max_users: num }
                            }))
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_max_storage_gb">存储限制 (GB)</Label>
                    <Input
                      id="edit_max_storage_gb"
                      type="text"
                      placeholder="无限制"
                      value={editForm.limits.max_storage_gb === -1 ? '' : editForm.limits.max_storage_gb.toString()}
                      onChange={(e) => {
                        const value = e.target.value.trim()
                        if (value === '' || value === '无限制') {
                          setEditForm(prev => ({ 
                            ...prev, 
                            limits: { ...prev.limits, max_storage_gb: -1 }
                          }))
                        } else {
                          const num = parseInt(value)
                          if (!isNaN(num) && num >= 0) {
                            setEditForm(prev => ({ 
                              ...prev, 
                              limits: { ...prev.limits, max_storage_gb: num }
                            }))
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_max_file_size_mb">文件大小限制 (MB)</Label>
                    <Input
                      id="edit_max_file_size_mb"
                      type="text"
                      placeholder="无限制"
                      value={editForm.limits.max_file_size_mb === -1 ? '' : editForm.limits.max_file_size_mb.toString()}
                      onChange={(e) => {
                        const value = e.target.value.trim()
                        if (value === '' || value === '无限制') {
                          setEditForm(prev => ({ 
                            ...prev, 
                            limits: { ...prev.limits, max_file_size_mb: -1 }
                          }))
                        } else {
                          const num = parseInt(value)
                          if (!isNaN(num) && num >= 0) {
                            setEditForm(prev => ({ 
                              ...prev, 
                              limits: { ...prev.limits, max_file_size_mb: num }
                            }))
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingTenant(null)}>
                    取消
                  </Button>
                  <Button onClick={handleEditTenant} disabled={isEditing || !editForm.display_name.trim()}>
                    {isEditing ? '保存中...' : '保存更改'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 备份租户对话框 */}
        <Dialog open={!!backupingTenant} onOpenChange={(open) => !open && setBackupingTenant(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>备份租户</DialogTitle>
              <DialogDescription>
                创建租户的完整备份，包括所有用户、组织和文件信息
              </DialogDescription>
            </DialogHeader>
            {backupingTenant && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <IconBuilding className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{backupingTenant.display_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {backupingTenant.user_count || 0} 用户 • {backupingTenant.org_count || 0} 组织
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="backup_name">备份名称</Label>
                    <Input
                      id="backup_name"
                      placeholder="备份名称"
                      value={backupForm.backup_name}
                      onChange={(e) => setBackupForm(prev => ({ ...prev, backup_name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="backup_description">备份描述 (可选)</Label>
                    <Textarea
                      id="backup_description"
                      placeholder="描述此次备份的目的或变更内容"
                      rows={3}
                      value={backupForm.description}
                      onChange={(e) => setBackupForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBackupingTenant(null)}>
                    取消
                  </Button>
                  <Button onClick={handleBackupTenant} disabled={isBackingUp}>
                    {isBackingUp ? '备份中...' : '开始备份'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 删除租户确认对话框 */}
        <Dialog open={!!deletingTenant} onOpenChange={(open) => !open && setDeletingTenant(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconAlertTriangle className="h-5 w-5 text-red-500" />
                确认删除租户
              </DialogTitle>
              <DialogDescription>
                此操作不可撤销，请确认您要删除以下租户：
              </DialogDescription>
            </DialogHeader>
            {deletingTenant && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                    <IconBuilding className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <div className="font-medium text-red-900">{deletingTenant.display_name}</div>
                    <div className="text-sm text-red-700">
                      {deletingTenant.user_count || 0} 用户 • {deletingTenant.org_count || 0} 组织
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <IconAlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">删除条件：</p>
                      <p>• 租户下不能有任何用户</p>
                      <p>• 租户下不能有任何组织</p>
                      <p>如果不满足条件，删除将会失败</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeletingTenant(null)}>
                    取消
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteTenant} disabled={isDeleting}>
                    {isDeleting ? '删除中...' : '确认删除'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}