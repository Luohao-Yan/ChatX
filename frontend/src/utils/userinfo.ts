/**
 * 用户信息管理工具
 * 统一的用户信息获取功能，避免重复代码
 */

interface UserInfo {
  id: number
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  avatar_url?: string
  phone?: string
  bio?: string
  urls?: { value: string }[]
  date_of_birth?: string
  preferred_language?: string
  created_at: string
  updated_at?: string
  last_login?: string
  roles?: string[]
  permissions?: string[]
}

const CACHE_KEY = 'userinfo'
const CACHE_DURATION = 30 * 60 * 1000 // 30分钟

/**
 * 获取用户信息（从缓存）
 * 登录时已经缓存了用户信息，直接从缓存获取即可
 */
export function getUserInfo(): UserInfo | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const cacheData = JSON.parse(cached)
    const now = Date.now()
    const cacheAge = now - cacheData.timestamp

    // 检查缓存是否过期
    if (cacheAge <= CACHE_DURATION && cacheData.user) {
      return cacheData.user
    }

    // 缓存过期，清除
    localStorage.removeItem(CACHE_KEY)
    return null
  } catch (error) {
    console.warn('获取用户信息失败:', error)
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

/**
 * 清除用户信息缓存
 */
export function clearUserInfo(): void {
  localStorage.removeItem(CACHE_KEY)
}