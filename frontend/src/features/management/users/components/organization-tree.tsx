import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  IconBuilding,
  IconBuildingBank,
  IconUsers,
  IconChevronRight,
  IconChevronDown,
  IconSearch,
  IconRefresh,
  IconPlus
} from '@tabler/icons-react'
import { cn } from '@/utils/utils'
import { organizationAPI, type Organization } from '@/services/api/organization'
import { toast } from 'sonner'

interface OrganizationTreeProps {
  selectedOrgId?: string | null
  onOrgSelect: (orgId: string | null, orgName: string) => void
  onAddUser?: (orgId: string) => void
  currentTenantId?: string | null
  isSuperAdmin?: boolean
  currentUserTenantId?: string | null
}

interface TreeNode extends Organization {
  children: TreeNode[]
  expanded: boolean
}

export function OrganizationTree({ selectedOrgId, onOrgSelect, onAddUser, currentTenantId, isSuperAdmin, currentUserTenantId }: OrganizationTreeProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // 获取组织数据
  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const params: {
        skip: number
        limit: number
        tenant_id?: string
      } = {
        skip: 0,
        limit: 100
      }
      
      // 传递租户ID
      if (isSuperAdmin && currentTenantId) {
        // 超级管理员：使用选中的租户
        params.tenant_id = currentTenantId
      } else if (!isSuperAdmin && currentUserTenantId) {
        // 非超级管理员：使用自己的租户ID
        params.tenant_id = currentUserTenantId
      }
      
      const data = await organizationAPI.getOrganizations(params)
      setOrganizations(data)
      buildTree(data)
    } catch (error) {
      console.warn('Failed to fetch organizations:', error)
      toast.error('获取组织列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenantId, isSuperAdmin, currentUserTenantId])

  // 构建树形结构
  const buildTree = (orgList: Organization[]) => {
    const orgMap = new Map<string, TreeNode>()
    const rootNodes: TreeNode[] = []

    // 创建节点映射
    orgList.forEach(org => {
      orgMap.set(org.id, {
        ...org,
        children: [],
        expanded: expandedNodes.has(org.id)
      })
    })

    // 构建树形关系
    orgList.forEach(org => {
      const node = orgMap.get(org.id)!
      if (org.parent_id && orgMap.has(org.parent_id)) {
        const parent = orgMap.get(org.parent_id)!
        parent.children.push(node)
      } else {
        rootNodes.push(node)
      }
    })

    // 排序：根据level、priority和名称进行排序
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        // 先按level排序
        if (a.level !== b.level) {
          return a.level - b.level
        }
        // 同级组织优先按优先级降序排序（数值越大优先级越高）
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        // 优先级相同时按名称字母顺序排序（支持中文排序）
        return a.name.localeCompare(b.name, 'zh-CN')
      })
      // 递归排序子节点
      nodes.forEach(node => sortNodes(node.children))
    }

    sortNodes(rootNodes)
    setTreeData(rootNodes)
  }

  // 切换节点展开状态
  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
    buildTree(organizations)
  }

  // 获取组织类型图标
  const getOrgIcon = (level: number) => {
    if (level === 0) {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <IconBuilding className="h-4 w-4 text-blue-600" />
        </div>
      )
    } else if (level === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <IconBuildingBank className="h-4 w-4 text-green-600" />
        </div>
      )
    } else {
      return (
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <IconUsers className="h-4 w-4 text-purple-600" />
        </div>
      )
    }
  }

  // 获取组织类型徽章
  const getOrgBadge = (level: number) => {
    if (level === 0) {
      return <Badge variant="default" className="text-xs px-1.5 py-0.5 h-5">公司</Badge>
    } else if (level === 1) {
      return <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5">部门</Badge>
    } else {
      return <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">团队</Badge>
    }
  }

  // 渲染树节点
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedOrgId === node.id

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
            "hover:bg-muted/60 hover:shadow-sm",
            isSelected && "bg-primary/5 border-l-3 border-l-primary/70 shadow-sm ring-1 ring-primary/10"
          )}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={() => onOrgSelect(node.id, node.display_name || node.name)}
        >
          {/* 展开/收起按钮 */}
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-4 h-4 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand(node.id)
                }}
              >
                {isExpanded ? (
                  <IconChevronDown className="h-3 w-3" />
                ) : (
                  <IconChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : null}
          </div>

          {/* 组织图标 */}
          <div className="flex items-center justify-center">
            {getOrgIcon(node.level)}
          </div>

          {/* 组织信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-medium truncate transition-colors",
                isSelected && "text-primary/90 font-semibold"
              )}>
                {node.display_name || node.name}
              </span>
              {getOrgBadge(node.level)}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconUsers className="h-3 w-3" />
              <span>{node.member_count}人</span>
              {hasChildren && (
                <>
                  <span>•</span>
                  <span>{node.children.length}个子部门</span>
                </>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            {onAddUser && (
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddUser(node.id)
                }}
              >
                <IconPlus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // 搜索过滤
  const filteredTreeData = treeData.filter(node => {
    if (!searchQuery) return true
    const searchInNode = (n: TreeNode): boolean => {
      if (n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.display_name && n.display_name.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return true
      }
      return n.children.some(searchInNode)
    }
    return searchInNode(node)
  })

  return (
    <div className="flex flex-col h-full gap-2">
      {/* 头部工具栏 */}
      <div className="flex flex-col gap-3 ">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">组织架构</h3>
          <Button variant="outline" size="sm" onClick={fetchOrganizations}>
            <IconRefresh className="h-4 w-4 mr-1" />
            刷新
          </Button>
        </div>
        
        {/* 搜索框 */}
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索组织..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 快捷操作 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOrgSelect(null, '全部用户')}
            className={cn(
              "transition-all duration-200",
              selectedOrgId === null && "bg-primary/8 border-primary/70 shadow-sm ring-1 ring-primary/10 font-semibold text-primary/90"
            )}
          >
            <IconUsers className="h-4 w-4 mr-1" />
            全部用户
          </Button>
        </div>
      </div>

      {/* 树形结构 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : filteredTreeData.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">
              {searchQuery ? '没有找到匹配的组织' : '暂无组织数据'}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTreeData.map(node => renderTreeNode(node))}
          </div>
        )}
      </div>
    </div>
  )
}