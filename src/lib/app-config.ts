import { colorSchemes, defaultColorScheme, type ColorScheme } from '@/config/color-schemes-simple'
import { radiusOptions, defaultRadius, type RadiusSize, getRadiusVars } from '@/config/radius-settings'

// 应用配置键名
export const APP_CONFIG_KEYS = {
  COLOR_SCHEME: 'app-color-scheme',
  RADIUS: 'app-radius',
  CUSTOM_RADIUS: 'app-custom-radius',
  USE_CUSTOM_RADIUS: 'app-use-custom-radius',
} as const

// 应用配置接口
export interface AppConfig {
  colorScheme: ColorScheme
  radius: RadiusSize
  customRadius: number
  useCustomRadius: boolean
}

// 获取默认配置
export const getDefaultConfig = (): AppConfig => ({
  colorScheme: defaultColorScheme,
  radius: defaultRadius,
  customRadius: 10, // 对应0.625rem
  useCustomRadius: false,
})

// 从 localStorage 加载配置
export const loadAppConfig = (): AppConfig => {
  const defaultConfig = getDefaultConfig()
  
  try {
    return {
      colorScheme: (localStorage.getItem(APP_CONFIG_KEYS.COLOR_SCHEME) as ColorScheme) || defaultConfig.colorScheme,
      radius: (localStorage.getItem(APP_CONFIG_KEYS.RADIUS) as RadiusSize) || defaultConfig.radius,
      customRadius: parseInt(localStorage.getItem(APP_CONFIG_KEYS.CUSTOM_RADIUS) || '10'),
      useCustomRadius: localStorage.getItem(APP_CONFIG_KEYS.USE_CUSTOM_RADIUS) === 'true',
    }
  } catch (error) {
    console.warn('Failed to load app config from localStorage:', error)
    return defaultConfig
  }
}

// 保存配置到 localStorage
export const saveAppConfig = (config: AppConfig): void => {
  try {
    localStorage.setItem(APP_CONFIG_KEYS.COLOR_SCHEME, config.colorScheme)
    localStorage.setItem(APP_CONFIG_KEYS.RADIUS, config.radius)
    localStorage.setItem(APP_CONFIG_KEYS.CUSTOM_RADIUS, config.customRadius.toString())
    localStorage.setItem(APP_CONFIG_KEYS.USE_CUSTOM_RADIUS, config.useCustomRadius.toString())
  } catch (error) {
    console.warn('Failed to save app config to localStorage:', error)
  }
}

// 应用颜色方案到 DOM
export const applyColorScheme = (colorScheme: ColorScheme, isDark: boolean): void => {
  const scheme = colorSchemes.find(s => s.value === colorScheme)
  if (!scheme) return

  const root = document.documentElement
  const primaryColor = isDark ? scheme.colors.primaryDark : scheme.colors.primary
  
  // 更新主色调相关的CSS变量
  root.style.setProperty('--primary', primaryColor)
  root.style.setProperty('--ring', primaryColor)
  
  // 根据主色调计算其他相关颜色
  const alpha10 = primaryColor.replace(')', ' / 10%)')
  const alpha5 = primaryColor.replace(')', ' / 5%)')
  
  root.style.setProperty('--accent', isDark ? alpha10 : alpha5)
  
  console.log(`Applied color scheme: ${colorScheme} (${isDark ? 'dark' : 'light'})`)
}

// 应用圆角设置到 DOM
export const applyRadius = (radius: RadiusSize, customRadius?: number, useCustom?: boolean): void => {
  const root = document.documentElement
  
  if (useCustom && customRadius !== undefined) {
    // 使用自定义圆角
    const radiusValue = `${customRadius / 16}rem` // 转换为rem
    root.style.setProperty('--radius', radiusValue)
    console.log(`Applied custom radius: ${radiusValue}`)
  } else {
    // 使用预设圆角
    const radiusVars = getRadiusVars(radius)
    Object.entries(radiusVars).forEach(([key, value]) => {
      root.style.setProperty(key, value as string)
    })
    console.log(`Applied radius preset: ${radius}`)
  }
}

// 完整应用配置到 DOM
export const applyAppConfig = (config: AppConfig, isDark: boolean): void => {
  applyColorScheme(config.colorScheme, isDark)
  applyRadius(config.radius, config.customRadius, config.useCustomRadius)
}

// 初始化应用配置
export const initializeAppConfig = (isDark: boolean): AppConfig => {
  console.log('Initializing app config...')
  
  const config = loadAppConfig()
  applyAppConfig(config, isDark)
  
  console.log('App config initialized:', config)
  return config
}