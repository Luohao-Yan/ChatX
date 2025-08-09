import { createContext, useContext, useEffect, useState } from 'react'
import { useTheme } from '@/context/theme-context'
import { 
  loadAppConfig, 
  saveAppConfig, 
  applyAppConfig, 
  getDefaultConfig,
  type AppConfig 
} from '@/lib/app-config'
import type { ColorScheme } from '@/config/color-schemes'
import type { RadiusSize } from '@/config/radius-settings'

type AppearanceProviderProps = {
  children: React.ReactNode
}

type AppearanceProviderState = AppConfig & {
  setColorScheme: (colorScheme: ColorScheme) => void
  setRadius: (radius: RadiusSize) => void
  setCustomRadius: (radius: number) => void
  setUseCustomRadius: (use: boolean) => void
  resetToDefaults: () => void
}

const initialState: AppearanceProviderState = {
  ...getDefaultConfig(),
  setColorScheme: () => null,
  setRadius: () => null,
  setCustomRadius: () => null,
  setUseCustomRadius: () => null,
  resetToDefaults: () => null,
}

const AppearanceProviderContext = createContext<AppearanceProviderState>(initialState)

export function AppearanceProvider({ children, ...props }: AppearanceProviderProps) {
  const { theme } = useTheme()
  
  // 从 localStorage 加载配置
  const [config, setConfig] = useState<AppConfig>(() => {
    console.log('Loading app config from localStorage...')
    return loadAppConfig()
  })

  // 当主题或配置变化时应用设置
  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    console.log('Applying app config:', config, 'isDark:', isDark)
    applyAppConfig(config, isDark)
  }, [config, theme])

  // 设置颜色方案
  const setColorScheme = (colorScheme: ColorScheme) => {
    const newConfig = { ...config, colorScheme }
    setConfig(newConfig)
    saveAppConfig(newConfig)
    console.log('Color scheme changed to:', colorScheme)
  }

  // 设置圆角
  const setRadius = (radius: RadiusSize) => {
    const newConfig = { ...config, radius, useCustomRadius: false }
    setConfig(newConfig)
    saveAppConfig(newConfig)
    console.log('Radius changed to:', radius)
  }

  // 设置自定义圆角
  const setCustomRadius = (customRadius: number) => {
    const newConfig = { ...config, customRadius }
    setConfig(newConfig)
    saveAppConfig(newConfig)
    console.log('Custom radius changed to:', customRadius)
  }

  // 设置是否使用自定义圆角
  const setUseCustomRadius = (useCustomRadius: boolean) => {
    const newConfig = { ...config, useCustomRadius }
    setConfig(newConfig)
    saveAppConfig(newConfig)
    console.log('Use custom radius changed to:', useCustomRadius)
  }

  // 重置为默认设置
  const resetToDefaults = () => {
    const defaultConfig = getDefaultConfig()
    setConfig(defaultConfig)
    saveAppConfig(defaultConfig)
    console.log('Reset to default config')
  }

  const value: AppearanceProviderState = {
    ...config,
    setColorScheme,
    setRadius,
    setCustomRadius,
    setUseCustomRadius,
    resetToDefaults,
  }

  return (
    <AppearanceProviderContext.Provider {...props} value={value}>
      {children}
    </AppearanceProviderContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAppearance = () => {
  const context = useContext(AppearanceProviderContext)

  if (context === undefined)
    throw new Error('useAppearance must be used within an AppearanceProvider')

  return context
}