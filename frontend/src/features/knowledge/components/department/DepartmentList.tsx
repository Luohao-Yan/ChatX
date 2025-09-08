/**
 * 部门列表组件
 */

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { IconEdit, IconTrash, IconRefresh } from '@tabler/icons-react'
import type { Department, Organization } from '../../types'

interface DepartmentListProps {
  departments: Department[]
  organizations: Organization[]
  loading?: boolean
  selectedOrganizationId?: string
  onEdit: (department: Department) => void
  onDelete: (department: Department) => void
  onOrganizationFilter: (organizationId?: string) => void
  onRefresh: () => void
}

export default function DepartmentList({
  departments,
  organizations,
  loading = false,
  selectedOrganizationId,
  onEdit,
  onDelete,
  onOrganizationFilter,
  onRefresh
}: DepartmentListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">加载部门数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">部门管理</h2>
        <div className="flex items-center space-x-2">
          <Select value={selectedOrganizationId || ''} onValueChange={(value) => onOrganizationFilter(value || undefined)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="选择组织筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部组织</SelectItem>
              {Array.isArray(organizations) && organizations.map(org => {
                if (!org || typeof org.id !== 'string' || typeof org.name !== 'string') {
                  console.warn('Invalid organization data:', org)
                  return null
                }
                return (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                )
              }).filter(Boolean)}
            </SelectContent>
          </Select>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <IconRefresh size={14} className="mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {departments.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground">暂无部门数据</h3>
          <p className="text-sm text-muted-foreground mt-2">点击新建按钮创建第一个部门</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <div className="p-4">
            <div className="text-sm text-muted-foreground mb-4">
              共 {departments.length} 个部门
            </div>
            
            <div className="space-y-2">
              {Array.isArray(departments) && departments.map(dept => {
                if (!dept || typeof dept.id !== 'string') {
                  console.warn('Invalid department data:', dept)
                  return null
                }
                
                const organization = Array.isArray(organizations) 
                  ? organizations.find(org => org && org.id === dept.organizationId)
                  : null
                
                return (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{dept.name}</h4>
                      {dept.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {dept.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>所属组织: {organization?.name || '未知'}</span>
                        <span>成员数: {dept.memberCount || 0}</span>
                        <span>创建时间: {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString() : '未知'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(dept)}
                        className="h-8 w-8"
                      >
                        <IconEdit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(dept)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <IconTrash size={14} />
                      </Button>
                    </div>
                  </div>
                )
              }).filter(Boolean)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}