import { createContext, useContext, useEffect, useState } from 'react'
import { useTheme } from '@/context/theme-context'
import { 
  loadAppConfig, 
  saveAppConfig, 
  applyAppConfig, 
  type AppConfig 
} from '@/lib/app-config'
import type { ColorScheme } from '@/config/color-schemes-simple'
import type { RadiusSize } from '@/config/radius-settings'

export interface AppearanceSettings {
  colorScheme: ColorScheme
  radius: RadiusSize
  customRadius: number // 滑动条值
  fontSize: FontSize
  spacingDensity: SpacingDensity
  interfaceWidth: InterfaceWidth
  sidebarPosition: SidebarPosition
  animationSpeed: AnimationSpeed
  useCustomRadius: boolean // 是否使用自定义圆角
}

type AppearanceProviderProps = {
  children: React.ReactNode
  storageKeyPrefix?: string
}

type AppearanceProviderState = AppearanceSettings & {
  setColorScheme: (colorScheme: ColorScheme) => void
  setRadius: (radius: RadiusSize) => void
  setCustomRadius: (radius: number) => void
  setFontSize: (fontSize: FontSize) => void
  setSpacingDensity: (density: SpacingDensity) => void
  setInterfaceWidth: (width: InterfaceWidth) => void
  setSidebarPosition: (position: SidebarPosition) => void
  setAnimationSpeed: (speed: AnimationSpeed) => void
  setUseCustomRadius: (use: boolean) => void
  resetToDefaults: () => void
}

const initialState: AppearanceProviderState = {
  colorScheme: defaultColorScheme,
  radius: defaultRadius,
  customRadius: 10, // 对应0.625rem
  fontSize: defaultFontSize,
  spacingDensity: defaultSpacingDensity,
  interfaceWidth: defaultInterfaceWidth,
  sidebarPosition: defaultSidebarPosition,
  animationSpeed: defaultAnimationSpeed,
  useCustomRadius: false,
  setColorScheme: () => null,
  setRadius: () => null,
  setCustomRadius: () => null,
  setFontSize: () => null,
  setSpacingDensity: () => null,
  setInterfaceWidth: () => null,
  setSidebarPosition: () => null,
  setAnimationSpeed: () => null,
  setUseCustomRadius: () => null,
  resetToDefaults: () => null,
}

const AppearanceProviderContext = createContext<AppearanceProviderState>(initialState)

const STORAGE_KEYS = {
  colorScheme: 'appearance-color-scheme',
  radius: 'appearance-radius',
  customRadius: 'appearance-custom-radius',
  fontSize: 'appearance-font-size',
  spacingDensity: 'appearance-spacing-density',
  interfaceWidth: 'appearance-interface-width',
  sidebarPosition: 'appearance-sidebar-position',
  animationSpeed: 'appearance-animation-speed',
  useCustomRadius: 'appearance-use-custom-radius',
}

export function AppearanceProvider({
  children,
  storageKeyPrefix = '',
  ...props
}: AppearanceProviderProps) {
  const { theme } = useTheme()
  
  const [colorScheme, _setColorScheme] = useState<ColorScheme>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.colorScheme}`)
    return (stored as ColorScheme) || defaultColorScheme
  })
  
  const [radius, _setRadius] = useState<RadiusSize>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.radius}`)
    return (stored as RadiusSize) || defaultRadius
  })
  
  const [customRadius, _setCustomRadius] = useState<number>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.customRadius}`)
    return stored ? parseInt(stored) : 10
  })
  
  const [fontSize, _setFontSize] = useState<FontSize>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.fontSize}`)
    return (stored as FontSize) || defaultFontSize
  })
  
  const [spacingDensity, _setSpacingDensity] = useState<SpacingDensity>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.spacingDensity}`)
    return (stored as SpacingDensity) || defaultSpacingDensity
  })
  
  const [interfaceWidth, _setInterfaceWidth] = useState<InterfaceWidth>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.interfaceWidth}`)
    return (stored as InterfaceWidth) || defaultInterfaceWidth
  })
  
  const [sidebarPosition, _setSidebarPosition] = useState<SidebarPosition>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.sidebarPosition}`)
    return (stored as SidebarPosition) || defaultSidebarPosition
  })
  
  const [animationSpeed, _setAnimationSpeed] = useState<AnimationSpeed>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.animationSpeed}`)
    return (stored as AnimationSpeed) || defaultAnimationSpeed
  })
  
  const [useCustomRadius, _setUseCustomRadius] = useState<boolean>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.useCustomRadius}`)
    return stored === 'true'
  })

  // 应用所有CSS变量
  useEffect(() => {
    const root = window.document.documentElement
    
    // 颜色方案变量
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    const colorVars = getColorSchemeVars(colorScheme, isDark)
    
    // 圆角变量
    const radiusVars = useCustomRadius 
      ? { '--radius': sliderValueToRadius(customRadius) }
      : getRadiusVars(radius)
    
    // 字体大小变量
    const fontSizeVars = getFontSizeVars(fontSize)
    
    // 间距密度变量
    const spacingVars = getSpacingDensityVars(spacingDensity)
    
    // 界面宽度变量
    const widthVars = getInterfaceWidthVars(interfaceWidth)
    
    // 动画速度变量
    const animationVars = getAnimationSpeedVars(animationSpeed)
    
    // 应用所有变量
    const allVars = {
      ...colorVars,
      ...radiusVars,
      ...fontSizeVars,
      ...spacingVars,
      ...widthVars,
      ...animationVars,
    }
    
    Object.entries(allVars).forEach(([key, value]) => {
      root.style.setProperty(key, value as string)
    })
    
    // 侧边栏位置类名
    root.classList.toggle('sidebar-right', sidebarPosition === 'right')
    root.classList.toggle('sidebar-left', sidebarPosition === 'left')
    
  }, [colorScheme, radius, customRadius, useCustomRadius, fontSize, spacingDensity, interfaceWidth, sidebarPosition, animationSpeed, theme])

  // 设置函数
  const setColorScheme = (newColorScheme: ColorScheme) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.colorScheme}`, newColorScheme)
    _setColorScheme(newColorScheme)
  }

  const setRadius = (newRadius: RadiusSize) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.radius}`, newRadius)
    _setRadius(newRadius)
  }

  const setCustomRadius = (newCustomRadius: number) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.customRadius}`, newCustomRadius.toString())
    _setCustomRadius(newCustomRadius)
  }

  const setFontSize = (newFontSize: FontSize) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.fontSize}`, newFontSize)
    _setFontSize(newFontSize)
  }

  const setSpacingDensity = (newDensity: SpacingDensity) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.spacingDensity}`, newDensity)
    _setSpacingDensity(newDensity)
  }

  const setInterfaceWidth = (newWidth: InterfaceWidth) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.interfaceWidth}`, newWidth)
    _setInterfaceWidth(newWidth)
  }

  const setSidebarPosition = (newPosition: SidebarPosition) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.sidebarPosition}`, newPosition)
    _setSidebarPosition(newPosition)
  }

  const setAnimationSpeed = (newSpeed: AnimationSpeed) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.animationSpeed}`, newSpeed)
    _setAnimationSpeed(newSpeed)
  }

  const setUseCustomRadius = (use: boolean) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.useCustomRadius}`, use.toString())
    _setUseCustomRadius(use)
  }

  const resetToDefaults = () => {
    // 清除localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(`${storageKeyPrefix}${key}`)
    })
    
    // 重置状态
    _setColorScheme(defaultColorScheme)
    _setRadius(defaultRadius)
    _setCustomRadius(10)
    _setFontSize(defaultFontSize)
    _setSpacingDensity(defaultSpacingDensity)
    _setInterfaceWidth(defaultInterfaceWidth)
    _setSidebarPosition(defaultSidebarPosition)
    _setAnimationSpeed(defaultAnimationSpeed)
    _setUseCustomRadius(false)
  }

  const value = {
    colorScheme,
    radius,
    customRadius,
    fontSize,
    spacingDensity,
    interfaceWidth,
    sidebarPosition,
    animationSpeed,
    useCustomRadius,
    setColorScheme,
    setRadius,
    setCustomRadius,
    setFontSize,
    setSpacingDensity,
    setInterfaceWidth,
    setSidebarPosition,
    setAnimationSpeed,
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