import { Outlet } from '@tanstack/react-router'
import {
  IconBrowserCheck,
  IconNotification,
  IconPalette,
  IconTool,
  IconUser,
} from '@tabler/icons-react'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useTranslation } from 'react-i18next'
import SidebarNav from './components/sidebar-nav'

export default function Settings() {
  const { t } = useTranslation()
  
  const breadcrumbItems = [
    { label: t('nav.settings') }
  ]
  
  const sidebarNavItems = getSidebarNavItems(t)

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('settings.title')}
          </h1>
          <p className='text-muted-foreground'>
            {t('settings.description')}
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full overflow-y-hidden p-1'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}

const getSidebarNavItems = (t: any) => [
  {
    title: t('nav.profile'),
    icon: <IconUser size={18} />,
    href: '/settings',
  },
  {
    title: t('nav.account'),
    icon: <IconTool size={18} />,
    href: '/settings/account',
  },
  {
    title: t('nav.appearance'),
    icon: <IconPalette size={18} />,
    href: '/settings/appearance',
  },
  {
    title: t('nav.notifications'),
    icon: <IconNotification size={18} />,
    href: '/settings/notifications',
  },
  {
    title: t('nav.display'),
    icon: <IconBrowserCheck size={18} />,
    href: '/settings/display',
  },
]
