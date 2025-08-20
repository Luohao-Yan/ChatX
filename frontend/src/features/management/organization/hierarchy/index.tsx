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
  IconBuilding,
  IconBuildingBank,
  IconSearch,
  IconRefresh,
  IconEye,
  IconUsers,
  IconChevronRight,
  IconChevronDown,
  IconDots,
  IconRestore,
  IconUser,
  IconCalendar,
  IconMapPin,
  IconUserCheck
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
import { toast } from 'sonner'
import { organizationAPI, type Organization } from '@/services/api/organization'
import { OrganizationForm } from '../components/organization-form'
import { OrganizationRecycleBin } from '../components/organization-recycle-bin'

export default function OrganizationHierarchy() {
  const { t } = useTranslation()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null)
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false)
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('nav.organizationStructure') },
    { label: t('nav.organizationHierarchy') }
  ]

  // 获取组织数据
  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      // 获取扁平化列表用于编辑和操作
      const data = await organizationAPI.getOrganizations({ search: searchQuery })
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      toast.error('获取组织列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  // 搜索功能
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrganizations()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // 构建层级树结构 - 支持折叠功能
  const buildOrganizationTree = (organizations: Organization[], parentId: string | null = null): Organization[] => {
    // 找到指定父级的直接子组织
    const children = organizations
      .filter(org => {
        // 如果 parentId 为 null，寻找根级组织（没有 parent_id 或 parent_id 为 null/空字符串）
        if (parentId === null) {
          return !org.parent_id || org.parent_id === '' || org.parent_id === null
        }
        // 否则寻找指定父级的子组织
        return org.parent_id === parentId
      })
      .sort((a, b) => a.name.localeCompare(b.name)) // 只按名称排序
    
    const result: Organization[] = []
    for (const child of children) {
      result.push(child)
      
      // 如果该组织没有被折叠，则递归添加子组织
      if (!collapsedNodes.has(child.id)) {
        const subChildren = buildOrganizationTree(organizations, child.id)
        result.push(...subChildren)
      }
    }
    
    return result
  }

  // 切换折叠状态
  const toggleCollapse = (orgId: string) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orgId)) {
        newSet.delete(orgId)
      } else {
        newSet.add(orgId)
      }
      return newSet
    })
  }

  // 检查组织是否有子组织
  const hasChildren = (orgId: string) => {
    return organizations.some(org => org.parent_id === orgId)
  }

  // 过滤组织（先过滤，再构建树结构）
  const searchFilteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // 如果有搜索条件，显示扁平化的搜索结果；否则显示层级树结构
  const displayOrganizations = searchQuery 
    ? searchFilteredOrgs 
    : buildOrganizationTree(organizations)

  // 计算子组织数量
  const getChildrenCount = (parentId: string) => {
    return organizations.filter(org => org.parent_id === parentId).length
  }

  const getTypeIcon = (level: number) => {
    if (level === 0) {
      return <IconBuilding className="h-4 w-4 text-blue-600" />
    } else if (level === 1) {
      return <IconBuildingBank className="h-4 w-4 text-green-600" />
    } else {
      return <IconUsers className="h-4 w-4 text-purple-600" />
    }
  }

  const getTypeBadge = (level: number) => {
    if (level === 0) {
      return <Badge variant="default">公司</Badge>
    } else if (level === 1) {
      return <Badge variant="secondary">部门</Badge>
    } else {
      return <Badge variant="outline">团队</Badge>
    }
  }

  const handleRefresh = async () => {
    await fetchOrganizations()
    toast.success('组织架构已刷新')
  }

  const handleFormSuccess = () => {
    setIsAddDialogOpen(false)
    setEditingOrg(null)
    fetchOrganizations()
  }

  const handleDeleteOrganization = async (org: Organization) => {
    try {
      await organizationAPI.deleteOrganization(org.id)
      setOrganizations(prev => prev.filter(o => o.id !== org.id))
      setDeletingOrg(null)
      toast.success(`组织 "${org.name}" 已移至回收站`)
    } catch (error) {
      console.error('Failed to delete organization:', error)
      toast.error('删除组织失败')
    }
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
            {t('nav.organizationHierarchy')}
          </h1>
          <p className='text-muted-foreground'>
            管理组织架构层级关系，包括公司、部门和团队的创建与编辑
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总组织数</CardTitle>
              <IconBuilding className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations.length}</div>
              <p className="text-xs text-muted-foreground">
                包含所有层级组织
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">部门数量</CardTitle>
              <IconBuildingBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organizations.filter(org => org.level === 1).length}
              </div>
              <p className="text-xs text-muted-foreground">
                一级部门
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">团队数量</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organizations.filter(org => org.level >= 2).length}
              </div>
              <p className="text-xs text-muted-foreground">
                工作团队
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总成员数</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organizations.reduce((sum, org) => sum + org.member_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                所有组织成员
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 组织列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>组织架构列表</CardTitle>
                <CardDescription>
                  查看和管理所有组织的层级关系
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3">
                {/* 搜索栏 */}
                <div className="relative w-full">
                  <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索组织..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* 操作按钮 */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefresh} className="flex-1 sm:flex-none">
                    <IconRefresh size={16} className="mr-2" />
                    <span className="hidden sm:inline">刷新</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsRecycleBinOpen(true)} className="flex-1 sm:flex-none">
                    <IconRestore size={16} className="mr-2" />
                    <span className="hidden sm:inline">回收站</span>
                  </Button>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1 sm:flex-none">
                        <IconPlus size={16} className="mr-2" />
                        <span className="hidden sm:inline">添加组织</span>
                        <span className="sm:hidden">添加</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl mx-4">
                      <DialogHeader>
                        <DialogTitle>添加新组织</DialogTitle>
                        <DialogDescription>
                          创建新的组织单元，可以是公司、部门或团队
                        </DialogDescription>
                      </DialogHeader>
                      <OrganizationForm
                        parentOrganizations={organizations}
                        onSuccess={handleFormSuccess}
                        onCancel={() => setIsAddDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              </div>
          </CardHeader>
          <CardContent>
            {/* 桌面版表格 */}
            <div className="hidden lg:block">
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>组织名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>层级</TableHead>
                      <TableHead>成员数</TableHead>
                      <TableHead>子部门</TableHead>
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
                  ) : displayOrganizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        没有找到组织
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayOrganizations.map((org) => {
                      return (
                        <TableRow key={org.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {/* 折叠按钮 */}
                              <div 
                                style={{ marginLeft: `${org.level * 20}px` }}
                                className="flex items-center gap-1"
                              >
                                {hasChildren(org.id) ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-muted"
                                    onClick={() => toggleCollapse(org.id)}
                                  >
                                    {collapsedNodes.has(org.id) ? (
                                      <IconChevronRight size={14} />
                                    ) : (
                                      <IconChevronDown size={14} />
                                    )}
                                  </Button>
                                ) : (
                                  <div className="w-6 h-6 flex items-center justify-center">
                                    {org.level > 0 && (
                                      <div className="text-xs text-muted-foreground">•</div>
                                    )}
                                  </div>
                                )}
                                
                                {/* 层级连接线 */}
                                {org.level > 0 && (
                                  <div className="text-xs text-muted-foreground mr-1">└─</div>
                                )}
                              </div>
                              
                              {/* 组织图标和信息 */}
                              <div className="flex items-center gap-2">
                                {getTypeIcon(org.level)}
                                <div>
                                  <div className="font-medium">
                                    {org.display_name || org.name}
                                    {/* 调试信息 - 可以在开发时临时启用 */}
                                    {process.env.NODE_ENV === 'development' && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        (级别:{org.level}, 父级:{org.parent_id || 'null'})
                                      </span>
                                    )}
                                  </div>
                                  {org.description && (
                                    <div className="text-sm text-muted-foreground">
                                      {org.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(org.level)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: org.level + 1 }, (_, i) => (
                                <div key={i} className="flex items-center">
                                  {i > 0 && <IconChevronRight size={12} className="text-muted-foreground" />}
                                  <div className={`w-2 h-2 rounded-full ${
                                    i === org.level ? 'bg-primary' : 'bg-muted-foreground/30'
                                  }`} />
                                </div>
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                L{org.level + 1}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <IconUsers size={14} className="text-muted-foreground" />
                              <span>{org.member_count}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <IconBuilding size={14} className="text-muted-foreground" />
                              <span>{getChildrenCount(org.id)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(org.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <IconDots size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewingOrg(org)}>
                                  <IconEye size={16} className="mr-2" />
                                  查看详情
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditingOrg(org)}>
                                  <IconEdit size={16} className="mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => setDeletingOrg(org)}
                                >
                                  <IconTrash size={16} className="mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* 移动版卡片列表 */}
            <div className="lg:hidden space-y-3">
              {loading ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  加载中...
                </div>
              ) : displayOrganizations.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  没有找到组织
                </div>
              ) : (
                displayOrganizations.map((org) => (
                  <Card key={org.id} className="p-4">
                    <div className="space-y-3">
                      {/* 组织信息 */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* 层级指示器 */}
                          <div 
                            style={{ marginLeft: `${Math.min(org.level * 12, 24)}px` }}
                            className="flex items-center gap-1 flex-shrink-0"
                          >
                            {hasChildren(org.id) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-muted"
                                onClick={() => toggleCollapse(org.id)}
                              >
                                {collapsedNodes.has(org.id) ? (
                                  <IconChevronRight size={14} />
                                ) : (
                                  <IconChevronDown size={14} />
                                )}
                              </Button>
                            ) : (
                              <div className="w-6 h-6 flex items-center justify-center">
                                {org.level > 0 && (
                                  <div className="text-xs text-muted-foreground">•</div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* 组织图标和名称 */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getTypeIcon(org.level)}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {org.display_name || org.name}
                              </div>
                              {org.description && (
                                <div className="text-sm text-muted-foreground truncate">
                                  {org.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* 操作按钮 */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <IconDots size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingOrg(org)}>
                              <IconEye size={16} className="mr-2" />
                              查看
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingOrg(org)}>
                              <IconEdit size={16} className="mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => setDeletingOrg(org)}
                            >
                              <IconTrash size={16} className="mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* 标签和统计 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(org.level)}
                        <Badge variant="outline" className="text-xs">
                          L{org.level + 1}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <IconUsers size={12} />
                          <span>{org.member_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <IconBuilding size={12} />
                          <span>{getChildrenCount(org.id)}</span>
                        </div>
                      </div>
                      
                      {/* 创建时间 */}
                      <div className="text-xs text-muted-foreground">
                        {new Date(org.created_at).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 查看组织详情对话框 */}
        <Dialog open={!!viewingOrg} onOpenChange={(open) => !open && setViewingOrg(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconEye size={20} />
                组织详情
              </DialogTitle>
              <DialogDescription>
                查看组织的详细信息和层级关系
              </DialogDescription>
            </DialogHeader>
            {viewingOrg && (
              <div className="space-y-6">
                {/* 基本信息卡片 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        {getTypeIcon(viewingOrg.level)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{viewingOrg.display_name || viewingOrg.name}</h3>
                        <p className="text-muted-foreground">{viewingOrg.description || '暂无描述'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getTypeBadge(viewingOrg.level)}
                          <Badge variant={viewingOrg.is_active ? "default" : "secondary"}>
                            {viewingOrg.is_active ? "正常" : "已停用"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* 详细信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 组织信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconBuilding size={16} />
                        组织信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <IconUser size={16} className="text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">组织ID</div>
                          <div className="text-sm text-muted-foreground font-mono">{viewingOrg.id}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <IconMapPin size={16} className="text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">层级路径</div>
                          <div className="text-sm text-muted-foreground font-mono">{viewingOrg.path || '/'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <IconUserCheck size={16} className="text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">组织拥有者</div>
                          <div className="text-sm text-muted-foreground">{viewingOrg.owner_id}</div>
                        </div>
                      </div>

                      {viewingOrg.parent_id && (
                        <div className="flex items-center gap-3">
                          <IconBuilding size={16} className="text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">父级组织</div>
                            <div className="text-sm text-muted-foreground">
                              {organizations.find(org => org.id === viewingOrg.parent_id)?.name || viewingOrg.parent_id}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 统计信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconUsers size={16} />
                        统计信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">成员数量</span>
                        <Badge variant="outline">{viewingOrg.member_count} 人</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">子部门数</span>
                        <Badge variant="outline">{getChildrenCount(viewingOrg.id)} 个</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">组织层级</span>
                        <Badge variant="outline">L{viewingOrg.level + 1}</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">状态</span>
                        <Badge variant={viewingOrg.is_active ? "default" : "secondary"}>
                          {viewingOrg.is_active ? "正常" : "已停用"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 时间信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <IconCalendar size={16} />
                      时间信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium">创建时间</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(viewingOrg.created_at).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      
                      {viewingOrg.updated_at && (
                        <div>
                          <div className="text-sm font-medium">最后更新</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(viewingOrg.updated_at).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      )}

                      {viewingOrg.deleted_at && (
                        <div>
                          <div className="text-sm font-medium">删除时间</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(viewingOrg.deleted_at).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 子组织列表 */}
                {getChildrenCount(viewingOrg.id) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconBuilding size={16} />
                        子组织 ({getChildrenCount(viewingOrg.id)})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {organizations
                          .filter(org => org.parent_id === viewingOrg.id)
                          .map(childOrg => (
                            <div key={childOrg.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                              {getTypeIcon(childOrg.level)}
                              <div className="flex-1">
                                <div className="font-medium">{childOrg.display_name || childOrg.name}</div>
                                <div className="text-sm text-muted-foreground">{childOrg.description}</div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {childOrg.member_count} 人
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 编辑组织对话框 */}
        <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
          <DialogContent className="max-w-2xl mx-4">
            <DialogHeader>
              <DialogTitle>编辑组织</DialogTitle>
              <DialogDescription>
                修改组织信息和设置
              </DialogDescription>
            </DialogHeader>
            {editingOrg && (
              <OrganizationForm
                organization={editingOrg}
                parentOrganizations={organizations.filter(org => org.id !== editingOrg.id)}
                onSuccess={handleFormSuccess}
                onCancel={() => setEditingOrg(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <AlertDialog open={!!deletingOrg} onOpenChange={(open) => !open && setDeletingOrg(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除组织</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要删除组织 "{deletingOrg?.name}" 吗？删除的组织将移至回收站，可以在回收站中恢复。
                {deletingOrg && getChildrenCount(deletingOrg.id) > 0 && (
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      ⚠️ 注意：该组织下还有 {getChildrenCount(deletingOrg.id)} 个子组织，删除后所有子组织也将一并移至回收站。
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deletingOrg && handleDeleteOrganization(deletingOrg)}
                className="bg-red-600 hover:bg-red-700"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 回收站 */}
        <OrganizationRecycleBin
          open={isRecycleBinOpen}
          onOpenChange={setIsRecycleBinOpen}
          onOrganizationRestored={fetchOrganizations}
        />
      </Main>
    </>
  )
}