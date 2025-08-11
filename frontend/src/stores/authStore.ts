import Cookies from 'js-cookie'
import { create } from 'zustand'
import { http } from '@/lib/request'
import { API_ENDPOINTS } from '@/lib/api-config'

const ACCESS_TOKEN = 'chatx_access_token'

interface AuthUser {
  id: number
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  avatar_url?: string
  phone?: string
  created_at: string
  updated_at?: string
  last_login?: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface AuthState {
  auth: {
    user: AuthUser | null
    accessToken: string
    isLoading: boolean
    error: string | null
    setUser: (user: AuthUser | null) => void
    setAccessToken: (accessToken: string) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    login: (credentials: LoginCredentials) => Promise<void>
    logout: () => void
    getCurrentUser: () => Promise<void>
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const cookieState = Cookies.get(ACCESS_TOKEN)
  const initToken = cookieState ? JSON.parse(cookieState) : ''
  
  // 设置默认请求头
  if (initToken) {
    http.setDefaultHeaders({
      'Authorization': `Bearer ${initToken}`
    })
  }
  
  return {
    auth: {
      user: null,
      accessToken: initToken,
      isLoading: false,
      error: null,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      setAccessToken: (accessToken) =>
        set((state) => {
          Cookies.set(ACCESS_TOKEN, JSON.stringify(accessToken))
          http.setDefaultHeaders({
            'Authorization': `Bearer ${accessToken}`
          })
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      setLoading: (isLoading) =>
        set((state) => ({ ...state, auth: { ...state.auth, isLoading } })),
      setError: (error) =>
        set((state) => ({ ...state, auth: { ...state.auth, error } })),
      login: async (credentials) => {
        const { setLoading, setError, setAccessToken, setUser } = get().auth
        
        try {
          setLoading(true)
          setError(null)
          
          // 使用FormData格式发送登录请求
          const formData = new FormData()
          formData.append('username', credentials.email)
          formData.append('password', credentials.password)
          
          const response = await http.post('/auth/login', formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          })
          
          const { access_token } = response.data as { access_token: string; token_type: string }
          setAccessToken(access_token)
          
          // 获取用户信息
          await get().auth.getCurrentUser()
          
        } catch (error: any) {
          console.error('Login error:', error)
          setError(error.data?.detail || '登录失败，请检查邮箱和密码')
          throw error
        } finally {
          setLoading(false)
        }
      },
      getCurrentUser: async () => {
        try {
          const response = await http.get('/auth/me')
          get().auth.setUser(response.data as AuthUser)
        } catch (error) {
          console.error('获取用户信息失败:', error)
          get().auth.reset()
        }
      },
      logout: () => {
        get().auth.reset()
      },
      resetAccessToken: () =>
        set((state) => {
          Cookies.remove(ACCESS_TOKEN)
          http.setDefaultHeaders({})
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          Cookies.remove(ACCESS_TOKEN)
          http.setDefaultHeaders({})
          return {
            ...state,
            auth: { 
              ...state.auth, 
              user: null, 
              accessToken: '', 
              isLoading: false,
              error: null 
            },
          }
        }),
    },
  }
})

// export const useAuth = () => useAuthStore((state) => state.auth)
