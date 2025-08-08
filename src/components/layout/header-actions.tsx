import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'

interface HeaderActionsProps {
  showSearch?: boolean
  className?: string
}

export function HeaderActions({ showSearch = true, className = '' }: HeaderActionsProps) {
  return (
    <div className={`ml-auto flex items-center space-x-4 ${className}`}>
      {showSearch && <Search />}
      <LanguageSwitcher />
      <ThemeSwitch />
      <ProfileDropdown />
    </div>
  )
}