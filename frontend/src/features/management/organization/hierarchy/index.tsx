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
  IconDots
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
import { organizationAPI, type Organization } from '@/services/api/organization'

export default function OrganizationHierarchy() {
  const { t } = useTranslation()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null)

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('nav.organizationStructure') },
    { label: t('nav.organizationHierarchy') }
  ]

  // 获取组织数据
  const fetchOrganizations = async () => {
    try {
      setLoading(true)
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

  // 过滤组织（现在主要用于本地搜索优化）
  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getTypeIcon = (level: number, hasParent: boolean) => {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索组织..."
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
                      添加组织
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>添加新组织</DialogTitle>
                      <DialogDescription>
                        创建新的组织单元，可以是公司、部门或团队
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">组织创建功能正在开发中...</p>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={() => {
                          toast.success('组织创建功能即将上线')
                          setIsAddDialogOpen(false)
                        }}>
                          创建
                        </Button>
                      </div>
                    </div>
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
                  ) : filteredOrganizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        没有找到组织
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizations.map((org) => {
                      return (
                        <TableRow key={org.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div style={{ marginLeft: `${org.level * 20}px` }}>
                                {getTypeIcon(org.level, !!org.parent_id)}
                              </div>
                              <div>
                                <div className="font-medium">{org.display_name || org.name}</div>
                                {org.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {org.description}
                                  </div>
                                )}
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
                            <span className="text-muted-foreground">-</span>
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
                                <DropdownMenuItem className="text-red-600">
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
          </CardContent>
        </Card>

        {/* 查看组织详情对话框 */}
        <Dialog open={!!viewingOrg} onOpenChange={(open) => !open && setViewingOrg(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>组织详情</DialogTitle>
              <DialogDescription>
                查看组织的详细信息和层级关系
              </DialogDescription>
            </DialogHeader>
            {viewingOrg && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    {getTypeIcon(viewingOrg.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{viewingOrg.name}</h3>
                    <p className="text-muted-foreground">{viewingOrg.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">组织类型</label>
                    <div className="mt-1">{getTypeBadge(viewingOrg.type)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">成员数量</label>
                    <p className="text-sm text-muted-foreground">{viewingOrg.member_count} 人</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">子部门数</label>
                    <p className="text-sm text-muted-foreground">{viewingOrg.department_count} 个</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">创建时间</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(viewingOrg.created_at).toLocaleDateString('zh-CN')}
                    </p>
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