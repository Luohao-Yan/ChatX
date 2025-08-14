import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RequestError } from '@/services/http/request'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { handleServerError } from '@/utils/handle-server-error'
import { initializeAuthSystem } from '@/services/http/auth-interceptor'
import { FontProvider } from './context/font-context'
import { ThemeProvider } from './context/theme-context'
import { AppearanceProvider } from './context/appearance-context'
import { LoginLayoutProvider } from './context/login-layout-context'
import './utils/i18n'
import './index.css'
// Generated Routes
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof RequestError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof RequestError) {
          if (error.response?.status === 304) {
            toast.error('Content not modified!')
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof RequestError) {
        if (error.response?.status === 401) {
          toast.error('Session expired!')
          useAuthStore.getState().reset()
          const redirect = `${router.history.location.href}`
          // 根据用户的登录布局设置重定向到正确的页面
          const loginLayout = localStorage.getItem('login-layout')
          const loginPath = loginLayout === 'double-column' ? '/sign-in-2' : '/sign-in'
          router.navigate({ to: loginPath, search: { redirect } })
        }
        if (error.response?.status === 500) {
          toast.error('Internal Server Error!')
          router.navigate({ to: '/500' })
        }
        if (error.response?.status === 403) {
          // router.navigate("/forbidden", { replace: true });
        }
      }
    },
  }),
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Initialize auth system
const cleanupAuthSystem = initializeAuthSystem()

// Cleanup function (used on hot reload in development)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupAuthSystem()
  })
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme='light' storageKey='vite-ui-theme'>
          <AppearanceProvider>
            <FontProvider>
              <LoginLayoutProvider>
                <RouterProvider router={router} />
              </LoginLayoutProvider>
            </FontProvider>
          </AppearanceProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
