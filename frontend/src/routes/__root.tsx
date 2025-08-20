import { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/shared/navigation-progress'
import { EnterprisePageTransition } from '@/components/shared/enterprise-page-transition'
import GeneralError from '@/features/errors/general-error'
import NotFoundError from '@/features/errors/not-found-error'

interface RouterContext {
  queryClient: QueryClient
  auth?: {
    userInfo?: {
      id: string
      email: string
      username: string
      roles?: string[]
      is_superuser?: boolean
    }
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => {
    return (
      <>
        <NavigationProgress />
        <EnterprisePageTransition>
          <Outlet />
        </EnterprisePageTransition>
        <Toaster 
          duration={10000} 
          closeButton={true}
          position="bottom-right"
          richColors={true}
        />
        {/* Devtools disabled - uncomment below to enable in development
        {import.meta.env.MODE === 'development' && (
          <>
            <ReactQueryDevtools buttonPosition='bottom-left' />
            <TanStackRouterDevtools position='bottom-right' />
          </>
        )}
        */}
      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
