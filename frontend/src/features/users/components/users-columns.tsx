import { ColumnDef } from '@tanstack/react-table'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from '../data/schema'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'

// Status badge colors
const getStatusBadge = (isActive: boolean, isVerified: boolean) => {
  if (!isActive) {
    return <Badge variant="destructive">已停用</Badge>
  }
  if (!isVerified) {
    return <Badge variant="secondary">未验证</Badge>
  }
  return <Badge variant="default">正常</Badge>
}

// Role badge with colors
const getRoleBadge = (roles?: string[]) => {
  if (!roles || roles.length === 0) {
    return <Badge variant="outline">普通用户</Badge>
  }
  
  return (
    <div className="flex gap-1 flex-wrap">
      {roles.slice(0, 2).map((role, index) => (
        <Badge key={index} variant="default" className="text-xs">
          {role}
        </Badge>
      ))}
      {roles.length > 2 && (
        <Badge variant="outline" className="text-xs">
          +{roles.length - 2}
        </Badge>
      )}
    </div>
  )
}

export const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    meta: {
      className: cn(
        'sticky md:table-cell left-0 z-10 rounded-tl',
        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted'
      ),
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'userInfo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='用户信息' />
    ),
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url} alt={user.username} />
            <AvatarFallback>
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium truncate">
              {user.full_name || user.username}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              @{user.username}
            </div>
          </div>
        </div>
      )
    },
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)] lg:drop-shadow-none',
        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
        'sticky left-6 md:table-cell min-w-[200px]'
      ),
    },
    enableHiding: false,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='邮箱' />
    ),
    cell: ({ row }) => (
      <div className='w-fit text-nowrap'>{row.getValue('email')}</div>
    ),
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='电话' />
    ),
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string
      return <div>{phone || '-'}</div>
    },
    enableSorting: false,
  },
  {
    id: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='状态' />
    ),
    cell: ({ row }) => {
      const user = row.original
      return getStatusBadge(user.is_active, user.is_verified)
    },
    filterFn: (row, _id, value) => {
      const user = row.original
      const status = !user.is_active ? 'inactive' : !user.is_verified ? 'unverified' : 'active'
      return value.includes(status)
    },
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: 'roles',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='角色' />
    ),
    cell: ({ row }) => {
      const user = row.original
      return getRoleBadge(user.roles)
    },
    filterFn: (row, _id, value) => {
      const user = row.original
      if (!user.roles || user.roles.length === 0) {
        return value.includes('user')
      }
      return user.roles.some(role => value.includes(role))
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='创建时间' />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'))
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString('zh-CN')}
        </div>
      )
    },
  },
  {
    accessorKey: 'last_login',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='最后登录' />
    ),
    cell: ({ row }) => {
      const lastLogin = row.getValue('last_login') as string
      if (!lastLogin) return <div className="text-sm text-muted-foreground">从未登录</div>
      
      const date = new Date(lastLogin)
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString('zh-CN')}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    header: '操作',
    cell: DataTableRowActions,
    enableSorting: false,
    enableHiding: false,
    meta: {
      className: 'text-left',
    },
  },
]
