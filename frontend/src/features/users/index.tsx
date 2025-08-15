import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useTranslation } from 'react-i18next'
import { columns } from './components/users-columns'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersTable } from './components/users-table'
import UsersProvider, { useUsers } from './context/users-context'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

function UsersContent() {
  const { t } = useTranslation()
  const { users, loading, error, refreshUsers } = useUsers()

  const breadcrumbItems = [
    { label: t('nav.users') }
  ]

  if (error) {
    return (
      <>
        <Header fixed>
          <Breadcrumb items={breadcrumbItems} />
          <HeaderActions />
        </Header>

        <Main>
          <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>用户列表</h2>
              <p className='text-muted-foreground'>
                管理系统用户和权限设置
              </p>
            </div>
          </div>
          
          <Alert variant="destructive" className="mb-4">
            <IconAlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refreshUsers()}
                className="ml-4"
              >
                <IconRefresh className="w-4 h-4 mr-2" />
                重试
              </Button>
            </AlertDescription>
          </Alert>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header fixed>
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>用户列表</h2>
            <p className='text-muted-foreground'>
              管理系统用户和权限设置
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>
        
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <UsersTable data={users || []} columns={columns} />
          )}
        </div>
      </Main>

      <UsersDialogs />
    </>
  )
}

export default function Users() {
  return (
    <UsersProvider>
      <UsersContent />
    </UsersProvider>
  )
}
