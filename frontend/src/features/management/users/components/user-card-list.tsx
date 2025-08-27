import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  IconCalendar,
  IconBuilding,
} from '@tabler/icons-react'
import { User } from '@/types/entities/user'
import { Organization } from '@/services/api/organization'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface UserCardListProps {
  users: User[]
  loading: boolean
  selectedUsers: User[]
  organizations: Organization[]
  onUserSelect: (user: User, selected: boolean) => void
  onUserEdit: (user: User) => void
  onUserDelete: (user: User) => void
  onUserToggleStatus: (user: User) => void
  onUserResetPassword: (user: User) => void
  onUserSendVerification: (user: User) => void
  currentUser: any
}

export function UserCardList({
  users,
  loading,
  selectedUsers,
  organizations,
  onUserSelect,
  onUserEdit,
  onUserDelete,
  onUserToggleStatus,
  onUserResetPassword,
  onUserSendVerification,
  currentUser
}: UserCardListProps) {
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
    if (!organizationId || !organizations) return '未分配组织'
    const org = organizations.find(o => o.id === organizationId)
    return org ? org.name : '未知组织'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <Card className="p-12 text-center">
        <IconUser size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          暂无用户数据
        </h3>
        <p className="text-muted-foreground mb-4">
          当前筛选条件下没有找到用户，请调整筛选条件或添加新用户。
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const isSelected = selectedUsers.some(u => u.id === user.id)
        const isCurrentUser = currentUser?.id === user.id

        return (
          <Card 
            key={user.id} 
            className={`transition-all duration-200 hover:shadow-md ${
              isSelected 
                ? 'ring-2 ring-primary bg-primary/10' 
                : 'hover:bg-muted/50'
            } ${
              isCurrentUser 
                ? 'ring-2 ring-secondary' 
                : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                {/* 选择框 */}
                <div className="flex items-center pt-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onUserSelect(user, !!checked)}
                    disabled={isCurrentUser}
                    aria-label={`选择用户 ${user.username}`}
                  />
                </div>

                {/* 头像 */}
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={user.avatar_url} 
                    alt={user.username} 
                  />
                  <AvatarFallback>
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* 用户信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {user.full_name || user.username}
                        </h3>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5 shrink-0">
                            我
                          </Badge>
                        )}
                        {!user.is_verified && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0.5 shrink-0">
                            未验证
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    </div>

                    {/* 操作菜单 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
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
                  </div>

                  {/* 邮箱 */}
                  <div className="flex items-center gap-2 mb-3">
                    <IconMail size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>

                  {/* 组织信息 */}
                  <div className="flex items-center gap-2 mb-3">
                    <IconBuilding size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {getUserOrganizationName(user.organization_id)}
                    </span>
                  </div>

                  {/* 标签行 */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {/* 角色标签 */}
                    <div className="flex items-center gap-1">
                      {getUserRoleIcon(user.roles)}
                      <Badge variant={getUserRoleBadgeVariant(user.roles)} className="text-xs px-2 py-1">
                        {getUserRoleText(user.roles)}
                      </Badge>
                    </div>

                    {/* 状态标签 */}
                    <Badge 
                      variant={user.is_active ? 'default' : 'secondary'}
                      className="text-xs px-2 py-1"
                    >
                      <div className="flex items-center gap-1">
                        {user.is_active ? (
                          <IconUserCheck size={12} />
                        ) : (
                          <IconUserOff size={12} />
                        )}
                        {user.is_active ? '活跃' : '停用'}
                      </div>
                    </Badge>
                  </div>

                  {/* 创建时间 */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconCalendar size={12} className="shrink-0" />
                    <span>
                      创建于 {formatDistanceToNow(new Date(user.created_at), { 
                        addSuffix: true, 
                        locale: zhCN 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}