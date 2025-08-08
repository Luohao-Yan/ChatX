import {
  IconBarrierBlock,
  IconBrowserCheck,
  IconBug,
  IconChecklist,
  IconError404,
  IconHelp,
  IconLayoutDashboard,
  IconLock,
  IconLockAccess,
  IconMessages,
  IconNotification,
  IconPackages,
  IconPalette,
  IconServerOff,
  IconSettings,
  IconTool,
  IconUserCog,
  IconUserOff,
  IconUsers,
} from '@tabler/icons-react'
import { AudioWaveform, Command, GalleryVerticalEnd } from 'lucide-react'
import { TFunction } from 'i18next'
import { ClerkLogo } from '@/assets/clerk-logo'
import { type SidebarData } from '../types'

export const getSidebarData = (t: TFunction): SidebarData => ({
  user: {
    name: 'satnaing',
    email: 'satnaingdev@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Shadcn Admin',
      logo: Command,
      plan: 'Vite + ShadcnUI',
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
          items: [
            {
              title: t('nav.profile'),
              url: '/settings',
              icon: IconUserCog,
            },
            {
              title: t('nav.account'),
              url: '/settings/account',
              icon: IconTool,
            },
            {
              title: t('nav.appearance'),
              url: '/settings/appearance',
              icon: IconPalette,
            },
            {
              title: t('nav.notifications'),
              url: '/settings/notifications',
              icon: IconNotification,
            },
            {
              title: t('nav.display'),
              url: '/settings/display',
              icon: IconBrowserCheck,
            },
          ],
        },
        {
          title: t('nav.helpCenter'),
          url: '/help-center',
          icon: IconHelp,
        },
      ],
    },
  ],
})
