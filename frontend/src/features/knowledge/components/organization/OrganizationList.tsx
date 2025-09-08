/**
 * 组织列表组件
 */

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { IconEdit, IconTrash, IconRefresh } from '@tabler/icons-react'
import type { Organization } from '../../types'

interface OrganizationListProps {
  organizations: Organization[]
  loading?: boolean
  onEdit: (organization: Organization) => void
  onDelete: (organization: Organization) => void
  onRefresh: () => void
}

export default function OrganizationList({
  organizations,
  loading = false,
  onEdit,
  onDelete,
  onRefresh
}: OrganizationListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">加载组织数据...</p>
        </div>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground">暂无组织数据</h3>
        <p className="text-sm text-muted-foreground mt-2">点击新建按钮创建第一个组织</p>
        <Button onClick={onRefresh} variant="outline" size="sm" className="mt-4">
          <IconRefresh size={14} className="mr-1" />
          刷新
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">组织管理</h2>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <IconRefresh size={14} className="mr-1" />
          刷新
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="p-4">
          <div className="text-sm text-muted-foreground mb-4">
            共 {organizations.length} 个组织
          </div>
          
          {/* TODO: 实现树形组织结构显示 */}
          <div className="space-y-2">
            {organizations.map(org => (
              <div
                key={org.id}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{org.name}</h4>
                  {org.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {org.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                    <span>类型: {org.type}</span>
                    <span>创建时间: {new Date(org.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(org)}
                    className="h-8 w-8"
                  >
                    <IconEdit size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(org)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <IconTrash size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}