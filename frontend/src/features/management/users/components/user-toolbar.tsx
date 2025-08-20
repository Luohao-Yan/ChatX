import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  IconSearch,
  IconFilter,
  IconDownload,
  IconUpload,
  IconRefresh,
  IconTrash,
  IconUserPlus,
  IconSettings,
  IconChevronDown,
  IconX,
} from '@tabler/icons-react'
import { AddUserDialog } from './add-user-dialog'
import { User } from '@/types/entities/user'

interface Organization {
  id: string
  name: string
  display_name: string
  user_count?: number
}

interface UserToolbarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedOrgId: string | null
  onOrgChange: (orgId: string | null, orgName: string) => void
  selectedUsers: User[]
  onRefresh: () => void
  onBatchImport: () => void
  onExportUsers: () => void
  onBatchDelete: () => void
  onRecycleBin: () => void
  organizations: Organization[]
  loadingOrgs: boolean
  onUserAdded: (user: User) => void
  currentUser: any
  userStats: {
    total: number
    active: number
    inactive: number
  }
}

export function UserToolbar({
  searchTerm,
  onSearchChange,
  selectedOrgId,
  onOrgChange,
  selectedUsers,
  onRefresh,
  onBatchImport,
  onExportUsers,
  onBatchDelete,
  onRecycleBin,
  organizations,
  loadingOrgs,
  onUserAdded,
  currentUser,
  userStats
}: UserToolbarProps) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)

  const selectedOrgName = selectedOrgId 
    ? organizations.find(org => org.id === selectedOrgId)?.display_name || '全部用户'
    : '全部用户'

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6 mb-6">
      <div className="space-y-4">
        {/* 顶部操作栏 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">用户管理</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                总计: {userStats.total}
              </Badge>
              <Badge variant="outline" className="text-xs text-green-600">
                活跃: {userStats.active}
              </Badge>
              <Badge variant="outline" className="text-gray-600">
                停用: {userStats.inactive}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 刷新按钮 */}
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <IconRefresh size={16} className="mr-1" />
              刷新
            </Button>

            {/* 导入导出按钮 */}
            <Button variant="outline" size="sm" onClick={onBatchImport}>
              <IconUpload size={16} className="mr-1" />
              批量导入
            </Button>

            <Button variant="outline" size="sm" onClick={onExportUsers}>
              <IconDownload size={16} className="mr-1" />
              导出数据
            </Button>

            {/* 回收站按钮 */}
            <Button variant="outline" size="sm" onClick={onRecycleBin}>
              <IconTrash size={16} className="mr-1" />
              回收站
            </Button>

            {/* 添加用户按钮 */}
            <AddUserDialog
              onUserAdded={onUserAdded}
              triggerVariant="default"
              triggerSize="sm"
            />
          </div>
        </div>

        {/* 搜索和筛选栏 */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索用户名、邮箱或姓名..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <IconX size={14} />
              </Button>
            )}
          </div>

          {/* 组织筛选 */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedOrgId || 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  onOrgChange(null, '全部用户')
                } else {
                  const org = organizations.find(o => o.id === value)
                  onOrgChange(value, org?.display_name || '未知组织')
                }
              }}
            >
              <SelectTrigger className="w-48">
                <div className="flex items-center gap-2">
                  <IconFilter size={16} />
                  <SelectValue placeholder="选择组织" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center justify-between w-full">
                    <span>全部用户</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {userStats.total}
                    </Badge>
                  </div>
                </SelectItem>
                {loadingOrgs ? (
                  <SelectItem value="loading" disabled>
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                      <span>加载中...</span>
                    </div>
                  </SelectItem>
                ) : (
                  organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{org.display_name}</span>
                        {org.user_count !== undefined && (
                          <Badge variant="outline" className="text-xs ml-2">
                            {org.user_count}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* 高级筛选 */}
            <DropdownMenu open={isFilterMenuOpen} onOpenChange={setIsFilterMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconSettings size={16} className="mr-1" />
                  高级筛选
                  <IconChevronDown size={14} className={`ml-1 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  按状态筛选
                </DropdownMenuItem>
                <DropdownMenuItem>
                  按角色筛选
                </DropdownMenuItem>
                <DropdownMenuItem>
                  按创建时间筛选
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  重置筛选条件
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedUsers.length > 0 && (
          <div className="bg-primary/10 rounded-lg p-4 border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  已选择 {selectedUsers.length} 个用户
                </Badge>
                <span className="text-sm text-muted-foreground">
                  可执行批量操作
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBatchDelete}
                >
                  <IconTrash size={16} className="mr-1" />
                  批量删除
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 当前筛选状态显示 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>当前显示:</span>
          <Badge variant="outline" className="text-xs">
            {selectedOrgName}
          </Badge>
          {searchTerm && (
            <>
              <span>·</span>
              <Badge variant="outline" className="text-xs">
                搜索: "{searchTerm}"
              </Badge>
            </>
          )}
        </div>
      </div>
    </div>
  )
}