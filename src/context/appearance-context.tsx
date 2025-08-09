import { createContext, useContext, useEffect, useState } from 'react'
import { useTheme } from '@/context/theme-context'
import type { ColorScheme } from '@/config/color-schemes'
import { getColorSchemeVars, defaultColorScheme } from '@/config/color-schemes'
import type { RadiusSize } from '@/config/radius-settings'
import { getRadiusVars, defaultRadius } from '@/config/radius-settings'

// 企业级外观系统的高级类型定义
export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type SpacingDensity = 'compact' | 'normal' | 'comfortable'
export type InterfaceWidth = 'narrow' | 'normal' | 'wide' | 'ultra-wide'
export type SidebarPosition = 'left' | 'right'
export type PageTransition = 'none' | 'fade' | 'slide' | 'slide-up' | 'zoom' | 'blur-fade'

// 默认值定义
export const defaultFontSize: FontSize = 'md'
export const defaultSpacingDensity: SpacingDensity = 'normal'
export const defaultInterfaceWidth: InterfaceWidth = 'normal'
export const defaultSidebarPosition: SidebarPosition = 'left'
export const defaultPageTransition: PageTransition = 'fade'

// 企业级工具函数
export const sliderValueToRadius = (value: number): string => `${value / 16}rem`

export const getFontSizeVars = (size: FontSize) => {
  const sizeMap = {
    xs: '0.75rem',
    sm: '0.875rem', 
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem'
  }
  return {
    '--font-size-base': sizeMap[size],
    '--font-size-sm': `calc(${sizeMap[size]} * 0.875)`,
    '--font-size-lg': `calc(${sizeMap[size]} * 1.125)`
  }
}

export const getSpacingDensityVars = (density: SpacingDensity) => {
  const densityMap = {
    compact: '0.75',
    normal: '1', 
    comfortable: '1.25'
  }
  const multiplier = densityMap[density]
  return {
    '--spacing-unit': `calc(0.5rem * ${multiplier})`,
    '--spacing-xs': `calc(0.25rem * ${multiplier})`,
    '--spacing-sm': `calc(0.5rem * ${multiplier})`,
    '--spacing-md': `calc(1rem * ${multiplier})`,
    '--spacing-lg': `calc(1.5rem * ${multiplier})`,
    '--spacing-xl': `calc(2rem * ${multiplier})`
  }
}

export const getInterfaceWidthVars = (width: InterfaceWidth) => {
  const widthMap = {
    narrow: '1200px',
    normal: '1400px',
    wide: '1600px',
    'ultra-wide': '1800px'
  }
  return {
    '--interface-max-width': widthMap[width],
    '--container-padding': width === 'narrow' ? '1rem' : '2rem'
  }
}

export const getPageTransitionVars = (transition: PageTransition) => {
  const transitionConfigs = {
    none: {
      duration: '0ms',
      timing: 'ease',
      transform: 'none'
    },
    fade: {
      duration: '500ms',
      timing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      transform: 'opacity'
    },
    slide: {
      duration: '600ms',
      timing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      transform: 'translateX'
    },
    'slide-up': {
      duration: '550ms',
      timing: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
      transform: 'translateY'
    },
    zoom: {
      duration: '450ms',
      timing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      transform: 'scale'
    },
    'blur-fade': {
      duration: '600ms',
      timing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      transform: 'blur-opacity'
    }
  }
  const config = transitionConfigs[transition] || transitionConfigs.fade
  return {
    '--page-transition-duration': config.duration,
    '--page-transition-timing': config.timing,
    '--page-transition-transform': config.transform,
    '--page-transition-type': transition
  }
}

export interface AppearanceSettings {
  colorScheme: ColorScheme
  radius: RadiusSize
  customRadius: number // 滑动条值
  fontSize: FontSize
  spacingDensity: SpacingDensity
  interfaceWidth: InterfaceWidth
  sidebarPosition: SidebarPosition
  pageTransition: PageTransition
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
  setPageTransition: (transition: PageTransition) => void
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
  pageTransition: defaultPageTransition,
  useCustomRadius: false,
  setColorScheme: () => null,
  setRadius: () => null,
  setCustomRadius: () => null,
  setFontSize: () => null,
  setSpacingDensity: () => null,
  setInterfaceWidth: () => null,
  setSidebarPosition: () => null,
  setPageTransition: () => null,
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
  pageTransition: 'appearance-page-transition',
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
  
  const [pageTransition, _setPageTransition] = useState<PageTransition>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}${STORAGE_KEYS.pageTransition}`)
    return (stored as PageTransition) || defaultPageTransition
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
    
    // 页面切换动画变量
    const transitionVars = getPageTransitionVars(pageTransition)
    
    // 应用所有变量
    const allVars = {
      ...colorVars,
      ...radiusVars,
      ...fontSizeVars,
      ...spacingVars,
      ...widthVars,
      ...transitionVars,
    }
    
    Object.entries(allVars).forEach(([key, value]) => {
      root.style.setProperty(key, value as string)
    })
    
    // 侧边栏位置类名
    root.classList.toggle('sidebar-right', sidebarPosition === 'right')
    root.classList.toggle('sidebar-left', sidebarPosition === 'left')
    
  }, [colorScheme, radius, customRadius, useCustomRadius, fontSize, spacingDensity, interfaceWidth, sidebarPosition, pageTransition, theme])

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

  const setPageTransition = (newTransition: PageTransition) => {
    localStorage.setItem(`${storageKeyPrefix}${STORAGE_KEYS.pageTransition}`, newTransition)
    _setPageTransition(newTransition)
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
    _setPageTransition(defaultPageTransition)
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
    pageTransition,
    useCustomRadius,
    setColorScheme,
    setRadius,
    setCustomRadius,
    setFontSize,
    setSpacingDensity,
    setInterfaceWidth,
    setSidebarPosition,
    setPageTransition,
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