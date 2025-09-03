/**
 * Organization Tree Table Component
 * 组织树表格展示层组件
 */

import { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  IconChevronRight,
  IconChevronDown,
  IconBuilding,
  IconUsers,
  IconCalendar,
  IconMapPin,
  IconDots,
  IconEye,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react'
import { Organization } from '@/services/api/organization'
import { OrganizationTreeNode } from '@/types/organization.types'

interface OrganizationTreeTableProps {
  organizationTree: OrganizationTreeNode[]
  loading: boolean
  onView: (org: Organization) => void
  onEdit: (org: Organization) => void
  onDelete: (org: Organization) => void
}

export function OrganizationTreeTable({
  organizationTree,
  loading,
  onView,
  onEdit,
  onDelete
}: OrganizationTreeTableProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // 切换节点展开状态
  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  // 渲染组织树节点
  const renderOrganizationNode = useCallback((node: OrganizationTreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    const rows = [
      <TableRow key={node.id} className="hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleNodeExpansion(node.id)}
              >
                {isExpanded ? (
                  <IconChevronDown className="h-4 w-4" />
                ) : (
                  <IconChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-2">
              <IconBuilding className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{node.display_name || node.name}</p>
              {node.description && (
                <p className="text-xs text-muted-foreground truncate">{node.description}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {node.level === 0 ? '公司' : node.level === 1 ? '部门' : '团队'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center text-sm text-muted-foreground">
            <IconMapPin className="h-3 w-3 mr-1" />
            L{node.level}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center text-sm">
            <IconUsers className="h-3 w-3 mr-1 text-muted-foreground" />
            {node.member_count || 0}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm text-muted-foreground">
            {hasChildren ? node.children!.length : 0}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center text-xs text-muted-foreground">
            <IconCalendar className="h-3 w-3 mr-1" />
            {new Date(node.created_at).toLocaleDateString()}
          </div>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <IconDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(node)}>
                <IconEye className="h-4 w-4 mr-2" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <IconEdit className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(node)}
                className="text-red-600"
              >
                <IconTrash className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ]

    // 如果展开且有子节点，递归渲染子节点
    if (isExpanded && hasChildren) {
      node.children!.forEach(child => {
        rows.push(...renderOrganizationNode(child, depth + 1))
      })
    }

    return rows
  }, [expandedNodes, toggleNodeExpansion, onView, onEdit, onDelete])

  if (loading) {
    return (
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
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="animate-pulse flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="w-12 h-6 bg-gray-200 rounded animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
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
          {organizationTree.length > 0 ? (
            organizationTree.map(node => renderOrganizationNode(node))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                没有找到组织
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}