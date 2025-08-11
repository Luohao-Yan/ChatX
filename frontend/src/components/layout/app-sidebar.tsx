import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/layout/nav-group'
import { UserDropdown } from '@/components/user-dropdown'
import { TeamSwitcher } from '@/components/layout/team-switcher'
import { getSidebarData } from './data/sidebar-data'
import { useTranslation } from 'react-i18next'
import { useAvatar } from '@/context/avatar-context'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()
  const { avatarDisplay } = useAvatar()
  const sidebarData = getSidebarData(t)

  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((groupProps) => (
          <NavGroup key={groupProps.title} {...groupProps} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        {avatarDisplay === 'bottom-left' && (
          <UserDropdown user={sidebarData.user} variant="expanded" />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
