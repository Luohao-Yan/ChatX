import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  IconSearch,
  IconDownload,
  IconUpload,
  IconRefresh,
  IconTrash,
  IconSettings,
  IconChevronDown,
  IconX,
  IconMenu2,
} from '@tabler/icons-react'
import { AddUserDialog } from './add-user-dialog'
import { User } from '@/types/entities/user'

interface Organization {
  id: string
  tenant_id: string
  name: string
  display_name?: string
  description?: string
  logo_url?: string
  owner_id: string
  parent_id?: string
  path: string
  level: number
  is_active: boolean
  member_count: number
  settings?: Record<string, unknown>
  created_at: string
  updated_at?: string
  deleted_at?: string
  user_count?: number
}

interface UserToolbarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedOrgId: string | null
  selectedUsers: User[]
  onRefresh: () => void
  onBatchImport: () => void
  onExportUsers: () => void
  onBatchDelete: () => void
  onRecycleBin: () => void
  organizations: Organization[]
  onUserAdded: (user: User) => void
  userStats: {
    total: number
    active: number
    inactive: number
  }
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export function UserToolbar({
  searchTerm,
  onSearchChange,
  selectedOrgId,
  selectedUsers,
  onRefresh,
  onBatchImport,
  onExportUsers,
  onBatchDelete,
  onRecycleBin,
  organizations,
  onUserAdded,
  userStats,
  isSidebarOpen,
  onToggleSidebar
}: UserToolbarProps) {

  const selectedOrgName = selectedOrgId 
    ? organizations.find(org => org.id === selectedOrgId)?.display_name || organizations.find(org => org.id === selectedOrgId)?.name || '全部用户'
    : '全部用户'

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 侧边栏切换按钮 */}
          {onToggleSidebar && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onToggleSidebar}
              className="px-3 h-8"
              title={isSidebarOpen ? "隐藏组织架构" : "显示组织架构"}
            >
              <IconMenu2 size={16} />
              <span className="ml-2 text-sm hidden md:inline">
                {isSidebarOpen ? "隐藏组织架构" : "显示组织架构"}
              </span>
            </Button>
          )}
          
          <h1 className="text-xl font-semibold">用户管理</h1>
          
          {/* 统计徽章 */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2 py-1">
              总计 {userStats.total}
            </Badge>
            <Badge variant="outline" className="px-2 py-1 hidden sm:flex">
              活跃 {userStats.active}
            </Badge>
            <Badge variant="outline" className="px-2 py-1 hidden sm:flex">
              停用 {userStats.inactive}
            </Badge>
          </div>
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            className="h-8 px-3"
          >
            <IconRefresh size={16} />
            <span className="ml-2 hidden md:inline">刷新</span>
          </Button>
          
          <AddUserDialog
            onUserAdded={onUserAdded}
            triggerVariant="default"
            triggerSize="sm"
            className="h-8 px-3"
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3">
                <IconSettings size={16} />
                <span className="ml-1 hidden lg:inline">更多操作</span>
                <IconChevronDown size={12} className="ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onBatchImport}>
                <IconUpload size={16} className="mr-2" />
                批量导入
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportUsers}>
                <IconDownload size={16} className="mr-2" />
                导出数据
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRecycleBin}>
                <IconTrash size={16} className="mr-2" />
                回收站
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

        {/* 搜索和筛选栏 - 响应式布局 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-0">
            <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索用户名、邮箱或姓名..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9 w-full"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <IconX size={12} />
              </Button>
            )}
          </div>

          {/* 筛选状态显示 */}
          <div className="flex items-center gap-2 sm:min-w-fit flex-shrink-0">
            <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">当前显示:</span>
            <span className="text-sm text-muted-foreground whitespace-nowrap sm:hidden">显示:</span>
            <Badge variant="outline" className="text-xs truncate max-w-[120px] sm:max-w-none">
              {selectedOrgName}
            </Badge>
          </div>
        </div>

        {/* 批量操作栏 - 响应式布局 */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                已选择 {selectedUsers.length} 个用户
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onBatchDelete}
                className="text-red-600 hover:text-red-700 w-full sm:w-auto"
              >
                <IconTrash size={16} className="mr-1" />
                批量删除
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}