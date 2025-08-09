import {
  IconBrowserCheck,
  IconNotification,
  IconPalette,
  IconTool,
  IconUserCog,
} from '@tabler/icons-react'
import type { TFunction } from 'i18next'
import type { ComponentType } from 'react'
import type { LinkProps } from '@tanstack/react-router'

export interface SettingsNavItem {
  title: string
  href: LinkProps['to']
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
]