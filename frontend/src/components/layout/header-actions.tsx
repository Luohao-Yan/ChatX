import { UserDropdown } from '@/components/user-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useAvatar } from '@/context/avatar-context'
import { getSidebarData } from './data/sidebar-data'
import { useTranslation } from 'react-i18next'
import { getUserInfo } from '@/utils/userinfo'

interface HeaderActionsProps {
  showSearch?: boolean
  className?: string
}

export function HeaderActions({ showSearch = true, className = '' }: HeaderActionsProps) {
  const { avatarDisplay } = useAvatar()
  const { t } = useTranslation()
  
  const userInfo = getUserInfo()
  const userData = userInfo ? {
    name: userInfo.full_name || userInfo.username || 'User',
    email: userInfo.email,
    avatar: userInfo.avatar_url || '/avatars/default.jpg',
  } : undefined
  
  const sidebarData = getSidebarData(t, userData)
  
  return (
    <div className={`ml-auto flex items-center space-x-4 ${className}`}>
      {showSearch && <Search />}
      <LanguageSwitcher />
      <ThemeSwitch />
      {avatarDisplay === 'top-right' && (
        <UserDropdown 
          user={sidebarData.user} 
          variant="compact" 
          showShortcuts={true} 
        />
      )}
    </div>
  )
}