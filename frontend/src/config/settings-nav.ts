import {
  IconBrowserCheck,
  IconNotification,
  IconPalette,
  IconTool,
  IconUserCog,
  IconPuzzle2,
} from '@tabler/icons-react'
import type { TFunction } from 'i18next'
import type { ComponentType } from 'react'
export interface SettingsNavItem {
  title: string
  href: string
  icon: ComponentType<{ size?: number; className?: string }>
}

export const getSettingsNavItems = (t: TFunction): SettingsNavItem[] => [
  {
    title: t('nav.profile'),
    icon: IconUserCog,
    href: '/settings' as const,
  },
  {
    title: t('nav.account'),
    icon: IconTool,
    href: '/settings/account' as const,
  },
  {
    title: t('nav.appearance'),
    icon: IconPalette,
    href: '/settings/appearance' as const,
  },
  {
    title: t('nav.notifications'),
    icon: IconNotification,
    href: '/settings/notifications' as const,
  },
  {
    title: t('nav.display'),
    icon: IconBrowserCheck,
    href: '/settings/display' as const,
  },
  {
    title: t('nav.mcp'),
    icon: IconPuzzle2,
    href: '/settings/mcp' as const,
  },
]