import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  IconDots,
  IconEdit,
  IconTrash,
  IconEye,
  IconUserOff,
  IconUserCheck,
  IconKey,
  IconMail,
  IconCrown,
  IconShield,
  IconUser,
  IconBuilding,
} from '@tabler/icons-react'
import { User } from '@/types/entities/user'
import { Organization } from '@/services/api/organization'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface UserTableProps {
  users: User[]
  loading: boolean
  selectedUsers: User[]
  organizations: Organization[]
  onUserSelect: (user: User, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onUserEdit: (user: User) => void
  onUserDelete: (user: User) => void
  onUserToggleStatus: (user: User) => void
  onUserResetPassword: (user: User) => void
  onUserSendVerification: (user: User) => void
  currentUser: any
}

export function UserTable({
  users,
  loading,
  selectedUsers,
  organizations,
  onUserSelect,
  onSelectAll,
  onUserEdit,
  onUserDelete,
  onUserToggleStatus,
  onUserResetPassword,
  onUserSendVerification,
  currentUser
}: UserTableProps) {
  const [sortField, setSortField] = useState<keyof User | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortField) return 0
    
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (aValue === bValue) return 0
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1
    
    const result = aValue < bValue ? -1 : 1
    return sortDirection === 'asc' ? result : -result
  })

  const allSelected = users.length > 0 && selectedUsers.length === users.length
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length

  const getUserRoleIcon = (roles?: string[]) => {
    if (!roles || roles.length === 0) return <IconUser size={16} className="text-gray-500" />
    
    if (roles.includes('super_admin') || roles.includes('system_admin')) {
      return <IconCrown size={16} className="text-amber-500" />
    }
    if (roles.includes('admin') || roles.includes('tenant_admin')) {
      return <IconShield size={16} className="text-blue-500" />
    }
    return <IconUser size={16} className="text-gray-500" />
  }

  const getUserRoleText = (roles?: string[]) => {
    if (!roles || roles.length === 0) return '普通用户'
    
    if (roles.includes('super_admin') || roles.includes('system_admin')) {
      return '超级管理员'
    }
    if (roles.includes('admin') || roles.includes('tenant_admin')) {
      return '管理员'
    }
    return '普通用户'
  }

  const getUserRoleBadgeVariant = (roles?: string[]) => {
    if (!roles || roles.length === 0) return 'outline'
    
    if (roles.includes('super_admin') || roles.includes('system_admin')) {
      return 'default'
    }
    if (roles.includes('admin') || roles.includes('tenant_admin')) {
      return 'secondary'
    }
    return 'outline'
  }

  // 获取用户所属组织名称
  const getUserOrganizationName = (organizationId?: string) => {
    if (!organizationId || !organizations) return '-'
    const org = organizations.find(o => o.id === organizationId)
    return org ? org.name : '未知组织'
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
        <IconUser size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          暂无用户数据
        </h3>
        <p className="text-muted-foreground mb-4">
          当前筛选条件下没有找到用户，请调整筛选条件或添加新用户。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                ref={(el) => {
                  if (el) {
                    const checkbox = el.querySelector('button')
                    if (checkbox) checkbox.setAttribute('data-indeterminate', (someSelected && !allSelected).toString())
                  }
                }}
                aria-label="选择所有用户"
              />
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none hover:bg-muted/80 transition-colors"
              onClick={() => handleSort('username')}
            >
              <div className="flex items-center gap-2">
                用户信息
                {sortField === 'username' && (
                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none hover:bg-muted/80 transition-colors"
              onClick={() => handleSort('email')}
            >
              <div className="flex items-center gap-2">
                邮箱
                {sortField === 'email' && (
                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </TableHead>
            <TableHead>组织</TableHead>
            <TableHead>角色</TableHead>
            <TableHead 
              className="cursor-pointer select-none hover:bg-muted/80 transition-colors"
              onClick={() => handleSort('is_active')}
            >
              <div className="flex items-center gap-2">
                状态
                {sortField === 'is_active' && (
                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none hover:bg-muted/80 transition-colors"
              onClick={() => handleSort('created_at')}
            >
              <div className="flex items-center gap-2">
                创建时间
                {sortField === 'created_at' && (
                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </TableHead>
            <TableHead className="text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedUsers.map((user) => {
            const isSelected = selectedUsers.some(u => u.id === user.id)
            const isCurrentUser = currentUser?.id === user.id
            
            return (
              <TableRow 
                key={user.id} 
                className={`hover:bg-muted/50 transition-colors ${
                  isSelected ? 'bg-primary/10' : ''
                }`}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onUserSelect(user, !!checked)}
                    disabled={isCurrentUser}
                    aria-label={`选择用户 ${user.username}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={user.avatar_url} 
                        alt={user.username} 
                      />
                      <AvatarFallback>
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {user.full_name || user.username}
                        </p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                            当前用户
                          </Badge>
                        )}
                        {!user.is_verified && (
                          <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                            未验证
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <IconMail size={16} className="text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <IconBuilding size={16} className="text-muted-foreground" />
                    <span className="text-sm">{getUserOrganizationName(user.organization_id)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getUserRoleIcon(user.roles)}
                    <Badge variant={getUserRoleBadgeVariant(user.roles)} className="text-xs px-1.5 py-0 h-4">
                      {getUserRoleText(user.roles)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.is_active ? 'default' : 'secondary'}
                    className="text-xs px-1.5 py-0 h-4"
                  >
                    <div className="flex items-center gap-1">
                      {user.is_active ? (
                        <IconUserCheck size={10} />
                      ) : (
                        <IconUserOff size={10} />
                      )}
                      {user.is_active ? '活跃' : '停用'}
                    </div>
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(user.created_at), { 
                      addSuffix: true, 
                      locale: zhCN 
                    })}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <IconDots size={16} />
                        <span className="sr-only">打开菜单</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onUserEdit(user)}>
                        <IconEye size={16} className="mr-2" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUserEdit(user)}>
                        <IconEdit size={16} className="mr-2" />
                        编辑用户
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onUserToggleStatus(user)}>
                        {user.is_active ? (
                          <>
                            <IconUserOff size={16} className="mr-2" />
                            停用用户
                          </>
                        ) : (
                          <>
                            <IconUserCheck size={16} className="mr-2" />
                            启用用户
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUserResetPassword(user)}>
                        <IconKey size={16} className="mr-2" />
                        重置密码
                      </DropdownMenuItem>
                      {!user.is_verified && (
                        <DropdownMenuItem onClick={() => onUserSendVerification(user)}>
                          <IconMail size={16} className="mr-2" />
                          发送验证邮件
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600 dark:text-red-400"
                        onClick={() => onUserDelete(user)}
                        disabled={isCurrentUser}
                      >
                        <IconTrash size={16} className="mr-2" />
                        删除用户
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}