import { Link, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export interface User {
  name: string
  email: string
  avatar: string
}

interface UserDropdownProps {
  user: User
  variant?: 'compact' | 'expanded'
  showShortcuts?: boolean
}

export function UserDropdown({
  user,
  variant = 'compact',
  showShortcuts = false,
}: UserDropdownProps) {
  const { t } = useTranslation()
  const { isMobile } = useSidebar()
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      // 退出成功后，根据用户的登录布局设置重定向到正确的页面
      const loginLayout = localStorage.getItem('login-layout')
      if (loginLayout === 'double-column') {
        router.navigate({ to: '/sign-in-2' })
      } else {
        router.navigate({ to: '/sign-in' })
      }
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  const menuContent = (
    <DropdownMenuContent
      className={variant === 'expanded' 
        ? 'w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
        : 'w-56'
      }
      align='end'
      side={variant === 'expanded' && isMobile ? 'bottom' : variant === 'compact' ? 'bottom' : 'right'}
      sideOffset={variant === 'expanded' ? 4 : undefined}
{...(variant === 'compact' && { forceMount: true })}
    >
      <DropdownMenuLabel className={variant === 'expanded' ? 'p-0 font-normal' : 'font-normal'}>
        {variant === 'expanded' ? (
          <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
            <Avatar className='h-8 w-8 rounded-lg'>
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className='rounded-lg'>
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-semibold'>{user.name}</span>
              <span className='truncate text-xs'>{user.email}</span>
            </div>
          </div>
        ) : (
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>{user.name}</p>
            <p className='text-muted-foreground text-xs leading-none'>
              {user.email}
            </p>
          </div>
        )}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <Sparkles />
          {t('userMenu.upgradeToPro')}
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link to='/settings/account'>
            <BadgeCheck />
            {t('userMenu.account')}
            {showShortcuts && <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to='/settings'>
            <CreditCard />
            {t('userMenu.billing')}
            {showShortcuts && <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to='/settings'>
            <Settings />
            {t('userMenu.settings')}
            {showShortcuts && <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to='/settings/notifications'>
            <Bell />
            {t('userMenu.notifications')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout}>
        <LogOut />
        {t('userMenu.logOut')}
        {showShortcuts && <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>}
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  if (variant === 'expanded') {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className='rounded-lg'>
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>{user.name}</span>
                  <span className='truncate text-xs'>{user.email}</span>
                </div>
                <ChevronsUpDown className='ml-auto size-4' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            {menuContent}
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      {menuContent}
    </DropdownMenu>
  )
}