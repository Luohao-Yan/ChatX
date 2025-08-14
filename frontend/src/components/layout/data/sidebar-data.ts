import {
  IconBarrierBlock,
  IconBug,
  IconChecklist,
  IconError404,
  IconHelp,
  // IconLayoutDashboard,
  IconLock,
  IconLockAccess,
  IconMessages,
  IconPackages,
  IconServerOff,
  IconUserOff,
  IconUsers,
  IconFileText,
  IconClock,
  IconBookmarks,
  IconTrash,
  IconChartPie,
  IconTags,
  IconWorld,
  IconBrandWechat,
  IconBuilding,
  IconBuildingBank,
  IconDatabase,
  IconChartScatter3d,
  IconMicrophone,
  IconShare,
  // IconGauge,      // 仪表盘图标，非常适合质量评估
  IconScale,
} from '@tabler/icons-react'
import { AudioWaveform, Command, GalleryVerticalEnd } from 'lucide-react'
import { TFunction } from 'i18next'
import { type SidebarData } from '../types'
// import { title } from 'process'

export const getSidebarData = (t: TFunction, user?: { name: string; email: string; avatar: string }): SidebarData => {

  return {
    user: user || {
      name: 'Guest',
      email: 'guest@chatx.com',
      avatar: '/avatars/default.jpg',
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
        title: t('nav.agents'),
        items: [
          {
            title: t('nav.chats'),
            url: '/ai-chats',
            badge: '3',
            icon: IconMessages,
          },
          {
            title: t('nav.voice'),
            url: '/voice',
            icon: IconMicrophone,
          },
          {
            title: t('nav.tasks'),
            url: '/tasks',
            icon: IconChecklist,
          },
          {
            title: t('nav.projects'),
            url: '/projects',
            icon: IconPackages,
          },
          {
            title: t('nav.sharedApps'),
            url: '/shared-apps',
            icon: IconShare,
          },
          {
            title: t('nav.chatHistory'),
            url: '/chat-history',
            icon: IconClock,
          },
        ],
      },
      // {
      //   title: t('nav.general'),
      //   items: [
      //     {
      //       title: t('nav.dashboard'),
      //       url: '/',
      //       icon: IconLayoutDashboard,
      //     },
      //     {
      //       title: t('nav.tasks'),
      //       url: '/tasks',
      //       icon: IconChecklist,
      //     },
      //     {
      //       title: t('nav.apps'),
      //       url: '/apps',
      //       icon: IconPackages,
      //     },
      //     {
      //       title: t('nav.chats'),
      //       url: '/chats',
      //       badge: '3',
      //       icon: IconMessages,
      //     },
      //     {
      //       title: t('nav.users'),
      //       url: '/users',
      //       icon: IconUsers,
      //     },
      //     {
      //       title: t('nav.securedByClerk'),
      //       icon: ClerkLogo,
      //       items: [
      //         {
      //           title: t('nav.signIn'),
      //           url: '/clerk/sign-in',
      //         },
      //         {
      //           title: t('nav.signUp'),
      //           url: '/clerk/sign-up',
      //         },
      //         {
      //           title: t('nav.userManagement'),
      //           url: '/clerk/user-management',
      //         },
      //       ],
      //     },
      //   ],
      // },
      {
        title: t('nav.knowledgeCenters'),
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
            title: t('nav.organizationLib'),
            url: '/knowledge/organizations',
            icon: IconBuilding,
          },
          {
            title: t('nav.departmentLib'),
            url: '/knowledge/departments',
            icon: IconBuildingBank,
          },
          {
            title: t('nav.knowledgeGraph'),
            url: '/knowledge/graph',
            icon: IconChartScatter3d,
          },
          {
            title: t('nav.knowledgeFavorites'),
            icon: IconBookmarks,
            items: [
              {
                title: t('nav.documentFavorites'),
                url: '/documents/favorites',
                icon: IconFileText,
              },
              {
                title: t('nav.webBlogKnowledge'),
                url: '/knowledge/web-blogs',
                icon: IconWorld,
              },
              {
                title: t('nav.wechatKnowledge'),
                url: '/knowledge/wechat',
                icon: IconBrandWechat,
              },
            ],
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
            title: t('nav.knowledgeSettings'),
            icon: IconDatabase,
            items: [
              {
                title: t('nav.knowledgeCategories'),
                url: '/documents/settings/categories',
                icon: IconTags,
              },
              {
                title: t('nav.knowledgeQualityAssessment'),
                url: '/documents/settings/knowledgeQualityAssessment',
                icon: IconScale,
              },
            ],
          },
        ],
      },

      {
        title: t('nav.other'),
        items: [
          {
            title: t('nav.helpCenter'),
            url: '/help-center',
            icon: IconHelp,
          },
        ],
      },
      {
        title: t('nav.managementCenter'),
        items: [
          {
            title: t('nav.usersManagement'),
            url: '/management/users',
            icon: IconUsers,
          },
          {
            title: t('nav.organizationsManagement'),
            url: '/management/organizations',
            icon: IconBuilding,
          },
          {
            title: t('nav.departmentsManagement'),
            url: '/management/departments',
            icon: IconBuildingBank,
          },
          {
            title: t('nav.rolesManagement'),
            url: '/management/roles',
            icon: IconUserOff,
          },
          {
            title: t('nav.permissionsManagement'),
            url: '/management/permissions',
            icon: IconLockAccess,
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
    ],
  }
}
