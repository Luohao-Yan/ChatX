import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { 
  IconBuilding,
  IconBuildingBank,
  IconUsers,
  IconRefresh,
  IconArrowsMaximize,
  IconContract,
  IconDownload,
  IconSettings
} from '@tabler/icons-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// 模拟组织数据
const organizationData = {
  id: '1',
  name: 'ChatX 科技有限公司',
  type: 'company',
  leader: '张三',
  memberCount: 245,
  children: [
    {
      id: '2',
      name: '技术研发部',
      type: 'department',
      leader: '李四',
      memberCount: 85,
      children: [
        {
          id: '3',
          name: '前端开发组',
          type: 'team',
          leader: '王五',
          memberCount: 28,
          children: []
        },
        {
          id: '4',
          name: '后端开发组',
          type: 'team',
          leader: '赵六',
          memberCount: 32,
          children: []
        },
        {
          id: '5',
          name: 'DevOps团队',
          type: 'team',
          leader: '钱七',
          memberCount: 15,
          children: []
        }
      ]
    },
    {
      id: '6',
      name: '产品设计部',
      type: 'department',
      leader: '孙八',
      memberCount: 25,
      children: [
        {
          id: '7',
          name: 'UI设计组',
          type: 'team',
          leader: '周九',
          memberCount: 12,
          children: []
        },
        {
          id: '8',
          name: 'UX研究组',
          type: 'team',
          leader: '吴十',
          memberCount: 8,
          children: []
        }
      ]
    },
    {
      id: '9',
      name: '市场营销部',
      type: 'department',
      leader: '郑十一',
      memberCount: 35,
      children: [
        {
          id: '10',
          name: '品牌推广组',
          type: 'team',
          leader: '王十二',
          memberCount: 18,
          children: []
        },
        {
          id: '11',
          name: '客户成功组',
          type: 'team',
          leader: '李十三',
          memberCount: 17,
          children: []
        }
      ]
    },
    {
      id: '12',
      name: '人力资源部',
      type: 'department',
      leader: '张十四',
      memberCount: 15,
      children: []
    },
    {
      id: '13',
      name: '财务部',
      type: 'department',
      leader: '陈十五',
      memberCount: 12,
      children: []
    }
  ]
}

export default function OrganizationChart() {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'tree' | 'compact'>('tree')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['1', '2', '6', '9']))
  const [loading, setLoading] = useState(false)

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('nav.organizationStructure') },
    { label: t('nav.organizationChart') }
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company':
        return <IconBuilding className="h-4 w-4 text-blue-600" />
      case 'department':
        return <IconBuildingBank className="h-4 w-4 text-green-600" />
      case 'team':
        return <IconUsers className="h-4 w-4 text-purple-600" />
      default:
        return <IconBuilding className="h-4 w-4" />
    }
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      company: { label: '公司', variant: 'default' as const, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      department: { label: '部门', variant: 'secondary' as const, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      team: { label: '团队', variant: 'outline' as const, className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
    }
    const typeInfo = typeMap[type as keyof typeof typeMap] || { label: type, variant: 'outline' as const, className: '' }
    return <Badge variant={typeInfo.variant} className={typeInfo.className}>{typeInfo.label}</Badge>
  }

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const expandAll = () => {
    const getAllNodeIds = (node: any): string[] => {
      const ids = [node.id]
      if (node.children) {
        node.children.forEach((child: any) => {
          ids.push(...getAllNodeIds(child))
        })
      }
      return ids
    }
    setExpandedNodes(new Set(getAllNodeIds(organizationData)))
  }

  const collapseAll = () => {
    setExpandedNodes(new Set(['1']))
  }

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      toast.success('组织架构图已刷新')
      setLoading(false)
    }, 1000)
  }

  const renderOrgNode = (node: any, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className="relative">
        {/* 连接线 */}
        {level > 0 && (
          <div className="absolute left-0 top-0 w-6 h-6 border-l-2 border-b-2 border-border rounded-bl-lg" 
               style={{ left: `${(level - 1) * 40 + 8}px`, top: '-12px' }} />
        )}
        
        {/* 节点卡片 */}
        <div 
          className={`relative ml-${level * 10} mb-4 transition-all duration-200`}
          style={{ marginLeft: `${level * 40}px` }}
        >
          <Card className={`hover:shadow-md transition-all duration-200 border-l-4 ${
            node.type === 'company' ? 'border-l-blue-500' :
            node.type === 'department' ? 'border-l-green-500' :
            'border-l-purple-500'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* 展开/收起按钮 */}
                  {hasChildren && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleNode(node.id)}
                      className="w-6 h-6 p-0 flex-shrink-0"
                    >
                      {isExpanded ? (
                        <IconContract className="h-3 w-3" />
                      ) : (
                        <IconExpand className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  
                  {/* 图标 */}
                  <div className="flex-shrink-0">
                    {getTypeIcon(node.type)}
                  </div>
                  
                  {/* 组织信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{node.name}</h4>
                      {getTypeBadge(node.type)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>负责人: {node.leader}</span>
                      <span className="flex items-center gap-1">
                        <IconUsers className="h-3 w-3" />
                        {node.memberCount} 人
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 子部门数量 */}
                {hasChildren && (
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {node.children.length} 个子部门
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {node.children.map((child: any, index: number) => (
              <div key={child.id} className="relative">
                {/* 垂直连接线 */}
                {index < node.children.length - 1 && (
                  <div className="absolute border-l-2 border-border h-full"
                       style={{ left: `${level * 40 + 24}px`, top: '0px' }} />
                )}
                {renderOrgNode(child, level + 1)}
              </div>
            ))}
          </div>
        )}
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
            {t('nav.organizationChart')}
          </h1>
          <p className='text-muted-foreground'>
            可视化展示组织架构层级关系，支持交互式浏览和管理
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 控制面板 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">架构图控制</CardTitle>
            <CardDescription>调整显示模式和交互选项</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">显示模式:</label>
                <Select value={viewMode} onValueChange={(value: 'tree' | 'compact') => setViewMode(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tree">树形图</SelectItem>
                    <SelectItem value="compact">紧凑模式</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  <IconExpand className="h-4 w-4 mr-1" />
                  全部展开
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  <IconContract className="h-4 w-4 mr-1" />
                  全部收起
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <IconRefresh className="h-4 w-4 mr-1" />
                  刷新
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success('导出功能开发中')}>
                  <IconDownload className="h-4 w-4 mr-1" />
                  导出
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success('设置功能开发中')}>
                  <IconSettings className="h-4 w-4 mr-1" />
                  设置
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 组织架构图 */}
        <Card>
          <CardHeader>
            <CardTitle>组织架构图</CardTitle>
            <CardDescription>
              点击节点旁的展开/收起按钮来浏览不同层级的组织结构
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">加载中...</div>
              </div>
            ) : (
              <div className="relative overflow-auto">
                <div className="min-w-fit p-4">
                  {renderOrgNode(organizationData)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总层级数</CardTitle>
              <IconBuilding className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground">
                从公司到团队
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均团队规模</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(organizationData.memberCount / organizationData.children.length)}
              </div>
              <p className="text-xs text-muted-foreground">
                人/部门
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">管理幅度</CardTitle>
              <IconBuildingBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organizationData.children.length}
              </div>
              <p className="text-xs text-muted-foreground">
                直接下属部门
              </p>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}