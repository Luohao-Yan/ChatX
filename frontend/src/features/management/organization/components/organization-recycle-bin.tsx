import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  IconSearch, 
  IconRefresh, 
  IconRestore,
  IconTrash,
  IconBuilding,
  IconClock,
  IconAlertTriangle,
  IconChevronRight,
  IconChevronDown,
  IconCheck
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
import { toast } from 'sonner'
import { organizationAPI, type Organization } from '@/services/api/organization'

// 扩展组织类型，添加树形结构相关属性
interface OrganizationTreeItem extends Organization {
  children: OrganizationTreeItem[]
  hasChildren: boolean
  canRestore: boolean // 是否可以恢复（根节点或父节点已恢复）
}

interface OrganizationRecycleBinProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrganizationRestored: () => void
  currentTenantId?: string
}

export function OrganizationRecycleBin({
  open,
  onOpenChange,
  onOrganizationRestored,
  currentTenantId,
}: OrganizationRecycleBinProps) {
  const [deletedOrganizations, setDeletedOrganizations] = useState<Organization[]>([])
  const [organizationTree, setOrganizationTree] = useState<OrganizationTreeItem[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedOrganizations, setSelectedOrganizations] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [restoringOrgId, setRestoringOrgId] = useState<string | null>(null)
  const [permanentDeletingOrgId, setPermanentDeletingOrgId] = useState<string | null>(null)
  const [showBatchConfirm, setShowBatchConfirm] = useState<'restore' | 'delete' | null>(null)

  // 构建树形结构的函数
  const buildOrganizationTree = (organizations: Organization[]): OrganizationTreeItem[] => {
    const orgMap = new Map<string, OrganizationTreeItem>()
    const rootNodes: OrganizationTreeItem[] = []

    // 先创建所有节点
    organizations.forEach(org => {
      orgMap.set(org.id, {
        ...org,
        children: [],
        hasChildren: false,
        canRestore: true // 默认都可以恢复，后面会根据父节点状态调整
      })
    })

    // 构建父子关系
    organizations.forEach(org => {
      const node = orgMap.get(org.id)!
      if (org.parent_id && orgMap.has(org.parent_id)) {
        const parent = orgMap.get(org.parent_id)!
        parent.children.push(node)
        parent.hasChildren = true
        // 如果父节点存在于回收站中，子节点就不能直接恢复
        node.canRestore = false
      } else {
        // 没有父节点或父节点不在回收站中的节点可以直接恢复
        rootNodes.push(node)
        node.canRestore = true
      }
    })

    return rootNodes
  }

  // 获取已删除的组织
  const fetchDeletedOrganizations = useCallback(async () => {
    try {
      setLoading(true)
      const params: { tenant_id?: string } = {}
      if (currentTenantId) {
        params.tenant_id = currentTenantId
      }
      
      
      const data = await organizationAPI.getDeletedOrganizations(params)
      setDeletedOrganizations(data)
      
      // 构建树形结构
      const tree = buildOrganizationTree(data)
      setOrganizationTree(tree)
      
      // 默认展开所有根节点
      const rootIds = new Set(tree.map(node => node.id))
      setExpandedNodes(rootIds)
    } catch (_error) {
      toast.error('获取回收站列表失败')
    } finally {
      setLoading(false)
    }
  }, [currentTenantId])

  useEffect(() => {
    if (open) {
      // 立即获取一次数据
      fetchDeletedOrganizations()
      
      // 为了确保能获取到刚删除的组织，延时再获取一次
      const timeoutId = setTimeout(() => {
        fetchDeletedOrganizations()
      }, 500) // 延时500ms再次获取
      
      // 清理状态
      setSelectedOrganizations(new Set())
      setSearchQuery('')
      
      // 清理定时器
      return () => clearTimeout(timeoutId)
    }
  }, [open, fetchDeletedOrganizations])

  // 递归过滤组织树
  const filterOrganizationTree = useCallback((nodes: OrganizationTreeItem[], query: string): OrganizationTreeItem[] => {
    return nodes.filter(node => {
      const matchesQuery = node.name.toLowerCase().includes(query.toLowerCase()) ||
        (node.description && node.description.toLowerCase().includes(query.toLowerCase()))
      
      // 过滤子节点
      const filteredChildren = filterOrganizationTree(node.children, query)
      
      // 如果当前节点匹配或有子节点匹配，则包含此节点
      if (matchesQuery || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        }
      }
      return false
    }).filter(Boolean) as OrganizationTreeItem[]
  }, [])

  // 过滤后的组织树
  const filteredOrganizationTree = useMemo(() => {
    return searchQuery.trim() 
      ? filterOrganizationTree(organizationTree, searchQuery.trim())
      : organizationTree
  }, [organizationTree, searchQuery, filterOrganizationTree])

  // 获取所有可见的组织（扁平化）
  const getAllVisibleOrganizations = (nodes: OrganizationTreeItem[]): OrganizationTreeItem[] => {
    const result: OrganizationTreeItem[] = []
    const traverse = (items: OrganizationTreeItem[]) => {
      items.forEach(item => {
        result.push(item)
        if (expandedNodes.has(item.id)) {
          traverse(item.children)
        }
      })
    }
    traverse(nodes)
    return result
  }

  const visibleOrganizations = getAllVisibleOrganizations(filteredOrganizationTree)

  // 处理节点展开/折叠
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  // 处理单个选择
  const handleSelectOrganization = (orgId: string, selected: boolean) => {
    setSelectedOrganizations(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(orgId)
      } else {
        newSet.delete(orgId)
      }
      return newSet
    })
  }

  // 处理全选/取消全选
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(visibleOrganizations.map(org => org.id))
      setSelectedOrganizations(allIds)
    } else {
      setSelectedOrganizations(new Set())
    }
  }

  // 全选状态
  const isAllSelected = visibleOrganizations.length > 0 && selectedOrganizations.size === visibleOrganizations.length
  const isPartialSelected = selectedOrganizations.size > 0 && selectedOrganizations.size < visibleOrganizations.length

  // 恢复组织
  const handleRestoreOrganization = async (org: Organization) => {
    try {
      setRestoringOrgId(org.id)
      await organizationAPI.restoreOrganization(org.id)
      
      // 从状态中移除已恢复的组织及其所有子组织
      setDeletedOrganizations(prev => {
        const removeOrgAndChildren = (orgId: string, organizations: Organization[]): Organization[] => {
          return organizations.filter(o => {
            if (o.id === orgId) return false
            // 检查是否是被恢复组织的子组织
            if (o.path.includes(orgId)) return false
            return true
          })
        }
        return removeOrgAndChildren(org.id, prev)
      })
      
      setSelectedOrganizations(prev => {
        const newSet = new Set(prev)
        newSet.delete(org.id)
        return newSet
      })
      
      toast.success(`组织 "${org.name}" 已恢复`)
      onOrganizationRestored()
      
      // 延迟刷新确保后端数据同步
      setTimeout(() => {
        fetchDeletedOrganizations()
      }, 500)
    } catch (_error) {
      toast.error('恢复组织失败')
    } finally {
      setRestoringOrgId(null)
    }
  }

  // 永久删除组织
  const handlePermanentDelete = async (org: Organization) => {
    try {
      await organizationAPI.permanentlyDeleteOrganization(org.id)
      
      // 从状态中移除已删除的组织及其所有子组织
      setDeletedOrganizations(prev => {
        const removeOrgAndChildren = (orgId: string, organizations: Organization[]): Organization[] => {
          return organizations.filter(o => {
            if (o.id === orgId) return false
            // 检查是否是被删除组织的子组织
            if (o.path.includes(orgId)) return false
            return true
          })
        }
        return removeOrgAndChildren(org.id, prev)
      })
      
      setSelectedOrganizations(prev => {
        const newSet = new Set(prev)
        newSet.delete(org.id)
        return newSet
      })
      
      setPermanentDeletingOrgId(null)
      toast.success(`组织 "${org.name}" 已永久删除`)
      
      // 延迟刷新确保后端数据同步
      setTimeout(() => {
        fetchDeletedOrganizations()
      }, 500)
    } catch (_error) {
      toast.error('永久删除失败')
    }
  }

  // 批量恢复
  const handleBatchRestore = async () => {
    if (selectedOrganizations.size === 0) return
    
    try {
      setBatchLoading(true)
      const orgIds = Array.from(selectedOrganizations)
      const result = await organizationAPI.batchRestoreOrganizations(orgIds)
      
      // 移除成功恢复的组织
      setDeletedOrganizations(prev => 
        prev.filter(org => !selectedOrganizations.has(org.id))
      )
      setSelectedOrganizations(new Set())
      setShowBatchConfirm(null)
      
      if (result.failedCount > 0) {
        toast.warning(`批量恢复完成：成功 ${result.successCount} 个，失败 ${result.failedCount} 个`)
      } else {
        toast.success(`成功恢复 ${result.successCount} 个组织`)
      }
      
      onOrganizationRestored()
      
      // 延迟刷新确保后端数据同步
      setTimeout(() => {
        fetchDeletedOrganizations()
      }, 500)
    } catch (_error) {
      toast.error('批量恢复失败')
    } finally {
      setBatchLoading(false)
    }
  }

  // 批量永久删除
  const handleBatchPermanentDelete = async () => {
    if (selectedOrganizations.size === 0) return
    
    try {
      setBatchLoading(true)
      const orgIds = Array.from(selectedOrganizations)
      const result = await organizationAPI.batchPermanentlyDeleteOrganizations(orgIds)
      
      // 移除成功删除的组织
      setDeletedOrganizations(prev => 
        prev.filter(org => !selectedOrganizations.has(org.id))
      )
      setSelectedOrganizations(new Set())
      setShowBatchConfirm(null)
      
      if (result.failedCount > 0) {
        toast.warning(`批量删除完成：成功 ${result.successCount} 个，失败 ${result.failedCount} 个`)
      } else {
        toast.success(`成功删除 ${result.successCount} 个组织`)
      }
      
      // 延迟刷新确保后端数据同步
      setTimeout(() => {
        fetchDeletedOrganizations()
      }, 500)
    } catch (_error) {
      toast.error('批量删除失败')
    } finally {
      setBatchLoading(false)
    }
  }

  const getTypeIcon = () => {
    return <IconBuilding className="h-4 w-4 text-muted-foreground" />
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

  const formatDeletedTime = (deletedAt: string) => {
    const date = new Date(deletedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  // 渲染树形结构的组织行
  const renderOrganizationRow = (org: OrganizationTreeItem, level: number = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = []
    const isExpanded = expandedNodes.has(org.id)
    const isSelected = selectedOrganizations.has(org.id)
    const paddingLeft = level * 24 + 8

    rows.push(
      <TableRow key={org.id} className={isSelected ? "bg-muted/50" : ""}>
        <TableCell className="w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => handleSelectOrganization(org.id, checked as boolean)}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3" style={{ paddingLeft }}>
            {org.hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleNodeExpansion(org.id)}
              >
                {isExpanded ? (
                  <IconChevronDown className="h-4 w-4" />
                ) : (
                  <IconChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              {getTypeIcon()}
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {org.display_name || org.name}
                {!org.canRestore && (
                  <Badge variant="outline" className="text-xs">
                    需要先恢复父级
                  </Badge>
                )}
              </div>
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
            <IconBuilding className="h-4 w-4 text-muted-foreground" />
            <span>{org.member_count}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <IconClock className="h-4 w-4" />
            <span>{formatDeletedTime(org.deleted_at!)}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestoreOrganization(org)}
              disabled={restoringOrgId === org.id || !org.canRestore}
              className="text-green-600 hover:text-green-700 disabled:text-muted-foreground"
            >
              <IconRestore size={16} className="mr-1" />
              恢复
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPermanentDeletingOrgId(org.id)}
              className="text-red-600 hover:text-red-700"
            >
              <IconTrash size={16} className="mr-1" />
              永久删除
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )

    // 如果节点展开，渲染子节点
    if (isExpanded && org.children.length > 0) {
      org.children.forEach(child => {
        rows.push(...renderOrganizationRow(child, level + 1))
      })
    }

    return rows
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconRestore className="h-5 w-5" />
              组织回收站
            </DialogTitle>
            <DialogDescription>
              管理已删除的组织，可以恢复或永久删除
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 工具栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索已删除的组织..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={fetchDeletedOrganizations} disabled={loading}>
                  <IconRefresh size={16} className="mr-2" />
                  刷新
                </Button>
              </div>
              <div className="flex items-center gap-4">
                {selectedOrganizations.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBatchConfirm('restore')}
                      disabled={batchLoading}
                      className="text-green-600 hover:text-green-700"
                    >
                      <IconRestore size={16} className="mr-1" />
                      批量恢复 ({selectedOrganizations.size})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBatchConfirm('delete')}
                      disabled={batchLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <IconTrash size={16} className="mr-1" />
                      批量删除 ({selectedOrganizations.size})
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconAlertTriangle size={16} className="text-yellow-600" />
                  <span>已删除 {deletedOrganizations.length} 个组织</span>
                </div>
              </div>
            </div>

            {/* 提醒信息 */}
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <IconAlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    注意事项
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• 恢复组织将同时恢复其下的所有子组织和成员关系</li>
                    <li>• 永久删除操作无法撤销，请谨慎操作</li>
                    <li>• 如果组织下还有子组织，需要先恢复或删除子组织</li>
                    <li>• 删除根节点会连带子节点一起永久删除</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 组织列表 */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected ? true : isPartialSelected ? "indeterminate" : false}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>组织信息</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>原成员数</TableHead>
                    <TableHead>删除时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrganizationTree.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        {searchQuery ? '没有找到匹配的组织' : '回收站为空'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizationTree.map(org => renderOrganizationRow(org))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 永久删除确认对话框 */}
      <AlertDialog 
        open={!!permanentDeletingOrgId} 
        onOpenChange={(open) => !open && setPermanentDeletingOrgId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="h-5 w-5 text-red-600" />
              确认永久删除
            </AlertDialogTitle>
            <AlertDialogDescription>
              您确定要永久删除组织 "{deletedOrganizations.find(o => o.id === permanentDeletingOrgId)?.name}" 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <div className="text-red-800 dark:text-red-200 text-sm font-medium">
                ⚠️ 警告：此操作无法撤销！
              </div>
              <div className="text-red-700 dark:text-red-300 text-sm mt-1">
                组织及其所有相关数据将被永久删除，包括历史记录、成员关系等。删除根节点会连带子节点一起删除。
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const org = deletedOrganizations.find(o => o.id === permanentDeletingOrgId)
                if (org) {
                  handlePermanentDelete(org)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量恢复确认对话框 */}
      <AlertDialog 
        open={showBatchConfirm === 'restore'} 
        onOpenChange={(open) => !open && setShowBatchConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconRestore className="h-5 w-5 text-green-600" />
              确认批量恢复
            </AlertDialogTitle>
            <AlertDialogDescription>
              您确定要恢复选中的 {selectedOrganizations.size} 个组织吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <div className="text-green-800 dark:text-green-200 text-sm font-medium">
                <IconCheck className="inline h-4 w-4 mr-1" />
                批量恢复说明
              </div>
              <ul className="text-green-700 dark:text-green-300 text-sm mt-1 space-y-1">
                <li>• 恢复组织将同时恢复其下的所有子组织和成员关系</li>
                <li>• 如果选中了子组织但未选中其父组织，子组织的恢复可能会失败</li>
                <li>• 建议先恢复根节点，再恢复其子节点</li>
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchRestore}
              disabled={batchLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {batchLoading ? '恢复中...' : '确认恢复'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog 
        open={showBatchConfirm === 'delete'} 
        onOpenChange={(open) => !open && setShowBatchConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="h-5 w-5 text-red-600" />
              确认批量删除
            </AlertDialogTitle>
            <AlertDialogDescription>
              您确定要永久删除选中的 {selectedOrganizations.size} 个组织吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <div className="text-red-800 dark:text-red-200 text-sm font-medium">
                ⚠️ 严重警告：此操作无法撤销！
              </div>
              <ul className="text-red-700 dark:text-red-300 text-sm mt-1 space-y-1">
                <li>• 所有选中的组织及其相关数据将被永久删除</li>
                <li>• 删除根节点会连带其所有子节点一起永久删除</li>
                <li>• 包括历史记录、成员关系等所有数据都将无法恢复</li>
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchPermanentDelete}
              disabled={batchLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {batchLoading ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}