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
  IconLockOpen,
  IconSearch,
  IconRefresh,
  IconEye,
  IconTemplate,
  IconCheck,
  IconX,
  IconSettings,
  IconBuilding,
  IconUsers
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { PasswordPolicy, PolicyScopeType, PolicyStatus, PasswordPolicyCreate, PasswordPolicyUpdate } from '@/types/entities/password-policy'
import { passwordPolicyAPI } from '@/services/api/password-policies'

export default function PasswordPolicyManagement() {
  const { t } = useTranslation()
  const [policies, setPolicies] = useState<PasswordPolicy[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<PasswordPolicy | null>(null)
  const [viewingPolicy, setViewingPolicy] = useState<PasswordPolicy | null>(null)
  const [filterScope, setFilterScope] = useState<PolicyScopeType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<PolicyStatus | 'all'>('all')

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('nav.securityPermissions') },
    { label: '密码策略' }
  ]

  // 加载策略列表
  const loadPolicies = async () => {
    setLoading(true)
    try {
      const response = await passwordPolicyAPI.getPolicies({
        scope_type: filterScope !== 'all' ? filterScope : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchQuery || undefined,
        limit: 100
      })
      setPolicies(response.items)
    } catch (error) {
      toast.error('加载密码策略列表失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicies()
  }, [filterScope, filterStatus])

  // 过滤策略
  const filteredPolicies = policies.filter(policy => 
    policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.scope_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: PolicyStatus) => {
    switch (status) {
      case PolicyStatus.ACTIVE:
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <IconCheck className="w-3 h-3 mr-1" />
            激活
          </Badge>
        )
      case PolicyStatus.INACTIVE:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            <IconX className="w-3 h-3 mr-1" />
            停用
          </Badge>
        )
      case PolicyStatus.DRAFT:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <IconEdit className="w-3 h-3 mr-1" />
            草稿
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getScopeIcon = (scopeType: PolicyScopeType) => {
    switch (scopeType) {
      case PolicyScopeType.TENANT:
        return <IconBuilding className="w-4 h-4" />
      case PolicyScopeType.ORGANIZATION:
        return <IconBuilding className="w-4 h-4" />
      case PolicyScopeType.DEPARTMENT:
        return <IconUsers className="w-4 h-4" />
      case PolicyScopeType.TEAM:
        return <IconUsers className="w-4 h-4" />
      default:
        return <IconSettings className="w-4 h-4" />
    }
  }

  const getScopeDisplayName = (scopeType: PolicyScopeType) => {
    switch (scopeType) {
      case PolicyScopeType.TENANT:
        return '租户'
      case PolicyScopeType.ORGANIZATION:
        return '组织'
      case PolicyScopeType.DEPARTMENT:
        return '部门'
      case PolicyScopeType.TEAM:
        return '团队'
      default:
        return scopeType
    }
  }

  const handleRefresh = () => {
    loadPolicies()
    toast.success('策略列表已刷新')
  }

  const handleDeletePolicy = async (policy: PasswordPolicy) => {
    try {
      await passwordPolicyAPI.deletePolicy(policy.id)
      setPolicies(prev => prev.filter(p => p.id !== policy.id))
      toast.success('密码策略已删除')
    } catch (error) {
      toast.error('删除密码策略失败')
      console.error(error)
    }
  }

  const handleToggleStatus = async (policy: PasswordPolicy) => {
    const newStatus = policy.status === PolicyStatus.ACTIVE ? PolicyStatus.INACTIVE : PolicyStatus.ACTIVE
    try {
      const updatedPolicy = await passwordPolicyAPI.updatePolicy(policy.id, { status: newStatus })
      setPolicies(prev => prev.map(p => p.id === policy.id ? updatedPolicy : p))
      toast.success(`策略已${newStatus === PolicyStatus.ACTIVE ? '启用' : '停用'}`)
    } catch (error) {
      toast.error('更新策略状态失败')
      console.error(error)
    }
  }

  const PolicyForm = ({ policy, onClose }: { policy?: PasswordPolicy, onClose: () => void }) => {
    const [formData, setFormData] = useState<PasswordPolicyCreate>({
      name: policy?.name || '',
      description: policy?.description || '',
      scope_type: policy?.scope_type || PolicyScopeType.TENANT,
      scope_id: policy?.scope_id || '',
      scope_name: policy?.scope_name || '',
      rules: policy?.rules || {
        min_length: 8,
        require_uppercase: false,
        require_lowercase: false,
        require_digits: false,
        require_special: false,
        forbid_user_info: false,
        forbid_common: false
      },
      override_parent: policy?.override_parent || false
    })

    const handleSubmit = async () => {
      if (!formData.name || !formData.scope_id || !formData.scope_name) {
        toast.error('请填写所有必填字段')
        return
      }
      
      try {
        if (policy) {
          // 编辑
          const updatedPolicy = await passwordPolicyAPI.updatePolicy(policy.id, {
            name: formData.name,
            description: formData.description,
            rules: formData.rules
          })
          setPolicies(prev => prev.map(p => p.id === policy.id ? updatedPolicy : p))
          toast.success('密码策略更新成功')
        } else {
          // 新增
          const newPolicy = await passwordPolicyAPI.createPolicy(formData)
          setPolicies(prev => [newPolicy, ...prev])
          toast.success('密码策略创建成功')
        }
        onClose()
      } catch (error) {
        toast.error(policy ? '更新密码策略失败' : '创建密码策略失败')
        console.error(error)
      }
    }

    return (
      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <Label>策略名称 *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入策略名称"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>策略描述</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="输入策略描述"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>作用域类型 *</Label>
              <Select value={formData.scope_type} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, scope_type: value as PolicyScopeType }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择作用域类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PolicyScopeType.TENANT}>租户</SelectItem>
                  <SelectItem value={PolicyScopeType.ORGANIZATION}>组织</SelectItem>
                  <SelectItem value={PolicyScopeType.DEPARTMENT}>部门</SelectItem>
                  <SelectItem value={PolicyScopeType.TEAM}>团队</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>作用域ID *</Label>
              <Input
                value={formData.scope_id}
                onChange={(e) => setFormData(prev => ({ ...prev, scope_id: e.target.value }))}
                placeholder="输入作用域ID"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>作用域名称 *</Label>
              <Input
                value={formData.scope_name}
                onChange={(e) => setFormData(prev => ({ ...prev, scope_name: e.target.value }))}
                placeholder="输入作用域名称"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.override_parent}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, override_parent: checked }))}
            />
            <Label>覆盖父级策略</Label>
          </div>
        </div>

        {/* 密码规则配置 */}
        <div>
          <h4 className="text-sm font-medium mb-3">密码规则配置</h4>
          <div className="space-y-4 border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>最小长度</Label>
                <Input
                  type="number"
                  value={formData.rules.min_length}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    rules: { ...prev.rules, min_length: parseInt(e.target.value) || 8 }
                  }))}
                  min="1"
                  max="128"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>最大长度</Label>
                <Input
                  type="number"
                  value={formData.rules.max_length || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    rules: { ...prev.rules, max_length: e.target.value ? parseInt(e.target.value) : undefined }
                  }))}
                  min="1"
                  max="128"
                  className="mt-1"
                  placeholder="不限制"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.rules.require_uppercase}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    rules: { ...prev.rules, require_uppercase: checked }
                  }))}
                />
                <Label>必须包含大写字母</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.rules.require_lowercase}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    rules: { ...prev.rules, require_lowercase: checked }
                  }))}
                />
                <Label>必须包含小写字母</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.rules.require_digits}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    rules: { ...prev.rules, require_digits: checked }
                  }))}
                />
                <Label>必须包含数字</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.rules.require_special}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    rules: { ...prev.rules, require_special: checked }
                  }))}
                />
                <Label>必须包含特殊字符</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.rules.forbid_user_info}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    rules: { ...prev.rules, forbid_user_info: checked }
                  }))}
                />
                <Label>禁止包含用户信息</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.rules.forbid_common}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    rules: { ...prev.rules, forbid_common: checked }
                  }))}
                />
                <Label>禁止使用常见密码</Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            {policy ? '更新' : '创建'}
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
            密码策略管理
          </h1>
          <p className='text-muted-foreground'>
            管理系统密码策略，设置不同组织层级的密码复杂度要求
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总策略数</CardTitle>
              <IconShield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{policies.length}</div>
              <p className="text-xs text-muted-foreground">
                已配置的密码策略
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">激活策略</CardTitle>
              <IconCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {policies.filter(p => p.status === PolicyStatus.ACTIVE).length}
              </div>
              <p className="text-xs text-muted-foreground">
                当前生效的策略
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">覆盖策略</CardTitle>
              <IconLock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {policies.filter(p => p.override_parent).length}
              </div>
              <p className="text-xs text-muted-foreground">
                覆盖父级的策略
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">继承策略</CardTitle>
              <IconTemplate className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {policies.filter(p => p.is_inherited).length}
              </div>
              <p className="text-xs text-muted-foreground">
                启用继承的策略
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 策略列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>密码策略列表</CardTitle>
                <CardDescription>
                  查看和管理系统中的所有密码策略
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterScope} onValueChange={(value) => setFilterScope(value as PolicyScopeType | 'all')}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="作用域" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value={PolicyScopeType.TENANT}>租户</SelectItem>
                    <SelectItem value={PolicyScopeType.ORGANIZATION}>组织</SelectItem>
                    <SelectItem value={PolicyScopeType.DEPARTMENT}>部门</SelectItem>
                    <SelectItem value={PolicyScopeType.TEAM}>团队</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as PolicyStatus | 'all')}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value={PolicyStatus.ACTIVE}>激活</SelectItem>
                    <SelectItem value={PolicyStatus.INACTIVE}>停用</SelectItem>
                    <SelectItem value={PolicyStatus.DRAFT}>草稿</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="relative w-64">
                  <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索策略..."
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
                      添加策略
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>添加密码策略</DialogTitle>
                      <DialogDescription>
                        创建新的密码策略并配置相应的规则
                      </DialogDescription>
                    </DialogHeader>
                    <PolicyForm onClose={() => setIsAddDialogOpen(false)} />
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
                    <TableHead>策略信息</TableHead>
                    <TableHead>作用域</TableHead>
                    <TableHead>规则摘要</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>继承</TableHead>
                    <TableHead>创建时间</TableHead>
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
                  ) : filteredPolicies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        没有找到密码策略
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPolicies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <IconLock className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{policy.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {policy.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getScopeIcon(policy.scope_type)}
                            <div>
                              <div className="text-sm font-medium">
                                {getScopeDisplayName(policy.scope_type)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {policy.scope_name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>最小长度: {policy.rules.min_length}</div>
                            <div className="text-xs text-muted-foreground">
                              {[
                                policy.rules.require_uppercase && '大写',
                                policy.rules.require_lowercase && '小写',
                                policy.rules.require_digits && '数字',
                                policy.rules.require_special && '特殊字符'
                              ].filter(Boolean).join(', ')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(policy.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {policy.is_inherited && (
                              <Badge variant="outline" className="text-xs">
                                继承
                              </Badge>
                            )}
                            {policy.override_parent && (
                              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                                覆盖
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(policy.created_at).toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingPolicy(policy)}
                              title="查看策略详情"
                            >
                              <IconEye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPolicy(policy)}
                            >
                              <IconEdit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(policy)}
                            >
                              {policy.status === PolicyStatus.ACTIVE ? (
                                <IconX size={16} className="text-red-600" />
                              ) : (
                                <IconCheck size={16} className="text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePolicy(policy)}
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

        {/* 编辑策略对话框 */}
        <Dialog open={!!editingPolicy} onOpenChange={(open) => !open && setEditingPolicy(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑密码策略</DialogTitle>
              <DialogDescription>
                修改密码策略的信息和规则配置
              </DialogDescription>
            </DialogHeader>
            {editingPolicy && (
              <PolicyForm policy={editingPolicy} onClose={() => setEditingPolicy(null)} />
            )}
          </DialogContent>
        </Dialog>

        {/* 查看策略详情对话框 */}
        <Dialog open={!!viewingPolicy} onOpenChange={(open) => !open && setViewingPolicy(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>密码策略详情</DialogTitle>
              <DialogDescription>
                查看密码策略的详细信息和规则配置
              </DialogDescription>
            </DialogHeader>
            {viewingPolicy && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>策略名称</Label>
                    <p className="text-sm text-muted-foreground">{viewingPolicy.name}</p>
                  </div>
                  <div>
                    <Label>状态</Label>
                    <div className="mt-1">{getStatusBadge(viewingPolicy.status)}</div>
                  </div>
                  <div>
                    <Label>作用域类型</Label>
                    <p className="text-sm text-muted-foreground">{getScopeDisplayName(viewingPolicy.scope_type)}</p>
                  </div>
                  <div>
                    <Label>作用域名称</Label>
                    <p className="text-sm text-muted-foreground">{viewingPolicy.scope_name}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>描述</Label>
                    <p className="text-sm text-muted-foreground">{viewingPolicy.description || '无'}</p>
                  </div>
                </div>

                {/* 规则详情 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">密码规则</h4>
                  <div className="space-y-2 border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">最小长度：</span>
                        <span className="text-sm text-muted-foreground">{viewingPolicy.rules.min_length} 位</span>
                      </div>
                      {viewingPolicy.rules.max_length && (
                        <div>
                          <span className="text-sm font-medium">最大长度：</span>
                          <span className="text-sm text-muted-foreground">{viewingPolicy.rules.max_length} 位</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {viewingPolicy.rules.require_uppercase && (
                        <div className="flex items-center gap-2">
                          <IconCheck className="h-3 w-3 text-green-600" />
                          <span className="text-sm">必须包含大写字母</span>
                        </div>
                      )}
                      {viewingPolicy.rules.require_lowercase && (
                        <div className="flex items-center gap-2">
                          <IconCheck className="h-3 w-3 text-green-600" />
                          <span className="text-sm">必须包含小写字母</span>
                        </div>
                      )}
                      {viewingPolicy.rules.require_digits && (
                        <div className="flex items-center gap-2">
                          <IconCheck className="h-3 w-3 text-green-600" />
                          <span className="text-sm">必须包含数字</span>
                        </div>
                      )}
                      {viewingPolicy.rules.require_special && (
                        <div className="flex items-center gap-2">
                          <IconCheck className="h-3 w-3 text-green-600" />
                          <span className="text-sm">必须包含特殊字符</span>
                        </div>
                      )}
                      {viewingPolicy.rules.forbid_user_info && (
                        <div className="flex items-center gap-2">
                          <IconCheck className="h-3 w-3 text-green-600" />
                          <span className="text-sm">禁止包含用户信息</span>
                        </div>
                      )}
                      {viewingPolicy.rules.forbid_common && (
                        <div className="flex items-center gap-2">
                          <IconCheck className="h-3 w-3 text-green-600" />
                          <span className="text-sm">禁止使用常见密码</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 继承信息 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">继承设置</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {viewingPolicy.is_inherited ? (
                        <IconCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <IconX className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">启用继承</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {viewingPolicy.override_parent ? (
                        <IconCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <IconX className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">覆盖父级策略</span>
                    </div>
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