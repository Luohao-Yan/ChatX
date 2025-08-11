import { UserDropdown } from '@/components/user-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useAvatar } from '@/context/avatar-context'
import { getSidebarData } from './data/sidebar-data'
import { useTranslation } from 'react-i18next'

interface HeaderActionsProps {
  showSearch?: boolean
  className?: string
}

export function HeaderActions({ showSearch = true, className = '' }: HeaderActionsProps) {
  const { avatarDisplay } = useAvatar()
  const { t } = useTranslation()
  const sidebarData = getSidebarData(t)
  
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