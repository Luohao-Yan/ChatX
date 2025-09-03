import { useState, useEffect } from 'react'

// 系统Logo类型定义
interface SystemLogo {
  id: string
  name: string
  url: string
  type: 'default' | 'custom'
  isActive: boolean
}

// 默认Logo配置
const DEFAULT_LOGO: SystemLogo = {
  id: 'default-system',
  name: '系统默认Logo',
  url: '/logo.svg', // 使用public目录下的logo.svg
  type: 'default',
  isActive: true,
}

/**
 * 获取当前系统Logo的Hook
 * 提供系统Logo URL和相关信息
 */
export function useSystemLogo() {
  const [logo, setLogo] = useState<SystemLogo>(DEFAULT_LOGO)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取当前活跃的系统Logo
  const fetchActiveLogo = async () => {
    try {
      setLoading(true)
      setError(null)

      // 尝试从localStorage获取缓存的Logo设置
      const cachedLogo = localStorage.getItem('systemLogo')
      if (cachedLogo) {
        try {
          const parsedLogo = JSON.parse(cachedLogo)
          if (parsedLogo && parsedLogo.url) {
            setLogo(parsedLogo)
            return
          }
        } catch {
          // 忽略解析错误，使用默认Logo
        }
      }

      // TODO: 这里可以调用API获取系统Logo
      // const activeLogo = await SystemConfigAPI.getActiveLogo()
      // setLogo(activeLogo)
      
      // 暂时使用默认Logo
      setLogo(DEFAULT_LOGO)

    } catch (err) {
      console.error('Failed to fetch system logo:', err)
      setError('加载系统Logo失败')
      setLogo(DEFAULT_LOGO) // 出错时使用默认Logo
    } finally {
      setLoading(false)
    }
  }

  // 更新系统Logo（用于系统配置页面）
  const updateSystemLogo = (newLogo: SystemLogo) => {
    setLogo(newLogo)
    // 缓存到localStorage
    localStorage.setItem('systemLogo', JSON.stringify(newLogo))
  }

  // 组件挂载时获取Logo，但不会导致闪烁
  useEffect(() => {
    fetchActiveLogo()
  }, [])

  return {
    logo,
    loading,
    error,
    refetch: fetchActiveLogo,
    updateLogo: updateSystemLogo,
  }
}

/**
 * 简化版Hook，只返回Logo URL
 * 适用于只需要显示Logo的场景
 */
export function useSystemLogoUrl() {
  const { logo } = useSystemLogo()
  return logo.url
}

/**
 * 预加载系统Logo
 * 避免显示时的加载闪烁
 */
export function preloadSystemLogo(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}