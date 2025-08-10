import {
  IconBarrierBlock,
  IconBug,
  IconChecklist,
  IconError404,
  IconHelp,
  IconLayoutDashboard,
  IconLock,
  IconLockAccess,
  IconMessages,
  IconPackages,
  IconServerOff,
  IconSettings,
  IconUserOff,
  IconUsers,
  IconFileText,
  IconClock,
  IconHeart,
  IconTrash,
  IconChartPie,
} from '@tabler/icons-react'
import { AudioWaveform, Command, GalleryVerticalEnd } from 'lucide-react'
import { TFunction } from 'i18next'
import { ClerkLogo } from '@/assets/clerk-logo'
import { type SidebarData } from '../types'
import { getSettingsNavItems } from '@/config/settings-nav'

export const getSidebarData = (t: TFunction): SidebarData => {
  const settingsNavItems = getSettingsNavItems(t)

  return {
    user: {
      name: 'satnaing',
      email: 'satnaingdev@gmail.com',
      avatar: '/avatars/chatx.jpg',
    },
    teams: [
      {
        name: 'ChatX',
        logo: Command,
        plan: 'Vite + ChatX',
      },
      {
        name: 'Acme Inc',
        logo: GalleryVerticalEnd,
        plan: 'Enterprise',
      },
      {
        name: 'Acme Corp.',
        logo: AudioWaveform,
        plan: 'Startup',
      },
    ],
    navGroups: [
      {
        title: t('nav.general'),
        items: [
          {
            title: t('nav.dashboard'),
            url: '/',
            icon: IconLayoutDashboard,
          },
          {
            title: t('nav.tasks'),
            url: '/tasks',
            icon: IconChecklist,
          },
          {
            title: t('nav.apps'),
            url: '/apps',
            icon: IconPackages,
          },
          {
            title: t('nav.chats'),
            url: '/chats',
            badge: '3',
            icon: IconMessages,
          },
          {
            title: t('nav.users'),
            url: '/users',
            icon: IconUsers,
          },
          {
            title: t('nav.securedByClerk'),
            icon: ClerkLogo,
            items: [
              {
                title: t('nav.signIn'),
                url: '/clerk/sign-in',
              },
              {
                title: t('nav.signUp'),
                url: '/clerk/sign-up',
              },
              {
                title: t('nav.userManagement'),
                url: '/clerk/user-management',
              },
            ],
          },
        ],
      },
      {
        title: t('nav.documentManagement'),
        items: [
          {
            title: t('nav.myDocuments'),
            url: '/documents',
            icon: IconFileText,
          },
          {
            title: t('nav.recentDocuments'),
            url: '/documents/recent',
            icon: IconClock,
          },
          {
            title: t('nav.favorites'),
            url: '/documents/favorites',
            icon: IconHeart,
          },
          {
            title: t('nav.sharedWithMe'),
            url: '/documents/shared',
            icon: IconUsers,
          },
          {
            title: t('nav.trash'),
            url: '/documents/trash',
            icon: IconTrash,
          },
          {
            title: t('nav.storageAnalysis'),
            url: '/documents/storage',
            icon: IconChartPie,
          },
          {
            title: t('nav.documentSettings'),
            icon: IconSettings,
            items: [
              {
                title: '分类标签',
                url: '/documents/settings/categories',
              },
              {
                title: '文件夹管理',
                url: '/documents/settings/folders',
              },
            ],
          },
        ],
      },
      {
        title: t('nav.pages'),
        items: [
          {
            title: t('nav.auth'),
            icon: IconLockAccess,
            items: [
              {
                title: t('nav.signIn'),
                url: '/sign-in',
              },
              {
                title: t('nav.signInTwoCol'),
                url: '/sign-in-2',
              },
              {
                title: t('nav.signUp'),
                url: '/sign-up',
              },
              {
                title: t('nav.forgotPassword'),
                url: '/forgot-password',
              },
              {
                title: t('nav.otp'),
                url: '/otp',
              },
            ],
          },
          {
            title: t('nav.errors'),
            icon: IconBug,
            items: [
              {
                title: t('nav.unauthorized'),
                url: '/401',
                icon: IconLock,
              },
              {
                title: t('nav.forbidden'),
                url: '/403',
                icon: IconUserOff,
              },
              {
                title: t('nav.notFound'),
                url: '/404',
                icon: IconError404,
              },
              {
                title: t('nav.internalServerError'),
                url: '/500',
                icon: IconServerOff,
              },
              {
                title: t('nav.maintenanceError'),
                url: '/503',
                icon: IconBarrierBlock,
              },
            ],
          },
        ],
      },
      {
        title: t('nav.other'),
        items: [
          {
            title: t('nav.settings'),
            icon: IconSettings,
            items: settingsNavItems.map(item => ({
              title: item.title,
              url: item.href,
              icon: item.icon,
            })),
          },
          {
            title: t('nav.helpCenter'),
            url: '/help-center',
            icon: IconHelp,
          },
        ],
      },
    ],
  }
}
