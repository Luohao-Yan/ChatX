import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useAvatar } from '@/context/avatar-context'

interface HeaderActionsProps {
  showSearch?: boolean
  className?: string
}

export function HeaderActions({ showSearch = true, className = '' }: HeaderActionsProps) {
  const { avatarDisplay } = useAvatar()
  
  return (
    <div className={`ml-auto flex items-center space-x-4 ${className}`}>
      {showSearch && <Search />}
      <LanguageSwitcher />
      <ThemeSwitch />
      {avatarDisplay === 'top-right' && <ProfileDropdown />}
    </div>
  )
}