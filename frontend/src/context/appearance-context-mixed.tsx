import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useTheme } from '@/context/theme-context'
import { 
  loadAppConfig, 
  saveAppConfig, 
  applyAppConfig, 
  getDefaultConfig,
  type AppConfig 
} from '@/utils/app-config'
import type { ColorScheme } from '@/config/color-schemes'
import type { RadiusSize } from '@/config/radius-settings'

type AppearanceProviderProps = {
  children: React.ReactNode
}

type AppearanceProviderState = AppConfig & {
  // Temporary state for color scheme and radius (not persisted until manual save)
  tempColorScheme: ColorScheme | null
  tempRadius: RadiusSize | null
  tempCustomRadius: number | null
  tempUseCustomRadius: boolean | null
  
  // Actions
  setColorScheme: (colorScheme: ColorScheme) => void // Temporary change
  setRadius: (radius: RadiusSize) => void // Temporary change
  setCustomRadius: (radius: number) => void // Temporary change
  setUseCustomRadius: (use: boolean) => void // Temporary change
  
  // Manual save for color scheme and radius
  saveColorAndRadiusSettings: () => void
  resetToDefaults: () => void
  
  // State queries
  hasUnsavedChanges: boolean
}

const initialState: AppearanceProviderState = {
  ...getDefaultConfig(),
  tempColorScheme: null,
  tempRadius: null,
  tempCustomRadius: null,
  tempUseCustomRadius: null,
  setColorScheme: () => null,
  setRadius: () => null,
  setCustomRadius: () => null,
  setUseCustomRadius: () => null,
  saveColorAndRadiusSettings: () => null,
  resetToDefaults: () => null,
  hasUnsavedChanges: false,
}

const AppearanceProviderContext = createContext<AppearanceProviderState>(initialState)

export function AppearanceProvider({ children, ...props }: AppearanceProviderProps) {
  const { theme } = useTheme()
  
  // Persisted configuration from localStorage
  const [persistedConfig, setPersistedConfig] = useState<AppConfig>(() => {
    console.log('Loading persisted app config from localStorage...')
    return loadAppConfig()
  })
  
  // Temporary state for color scheme and radius only
  const [tempState, setTempState] = useState<{
    colorScheme: ColorScheme | null
    radius: RadiusSize | null
    customRadius: number | null
    useCustomRadius: boolean | null
  }>({
    colorScheme: null,
    radius: null,
    customRadius: null,
    useCustomRadius: null,
  })

  // Compute effective configuration (temp overrides persisted for color/radius)
  const effectiveConfig: AppConfig = {
    colorScheme: tempState.colorScheme ?? persistedConfig.colorScheme,
    radius: tempState.radius ?? persistedConfig.radius,
    customRadius: tempState.customRadius ?? persistedConfig.customRadius,
    useCustomRadius: tempState.useCustomRadius ?? persistedConfig.useCustomRadius,
  }

  // Check if there are unsaved color/radius changes
  const hasUnsavedChanges = 
    tempState.colorScheme !== null ||
    tempState.radius !== null ||
    tempState.customRadius !== null ||
    tempState.useCustomRadius !== null

  // Apply CSS when theme or effective config changes
  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    console.log('Applying effective app config:', effectiveConfig, 'isDark:', isDark)
    applyAppConfig(effectiveConfig, isDark)
  }, [effectiveConfig, theme])

  // Temporary setters for color scheme and radius (don't persist)
  const setColorScheme = useCallback((colorScheme: ColorScheme) => {
    setTempState(prev => ({ ...prev, colorScheme }))
    console.log('Color scheme temporarily changed to:', colorScheme)
  }, [])

  const setRadius = useCallback((radius: RadiusSize) => {
    setTempState(prev => ({ ...prev, radius, useCustomRadius: false }))
    console.log('Radius temporarily changed to:', radius)
  }, [])

  const setCustomRadius = useCallback((customRadius: number) => {
    setTempState(prev => ({ ...prev, customRadius }))
    console.log('Custom radius temporarily changed to:', customRadius)
  }, [])

  const setUseCustomRadius = useCallback((useCustomRadius: boolean) => {
    setTempState(prev => ({ ...prev, useCustomRadius }))
    console.log('Use custom radius temporarily changed to:', useCustomRadius)
  }, [])

  // Save color scheme and radius settings to localStorage
  const saveColorAndRadiusSettings = useCallback(() => {
    const newConfig = effectiveConfig
    setPersistedConfig(newConfig)
    saveAppConfig(newConfig)
    // Clear temporary state
    setTempState({
      colorScheme: null,
      radius: null,
      customRadius: null,
      useCustomRadius: null,
    })
    console.log('Color and radius settings saved to localStorage:', newConfig)
  }, [effectiveConfig])

  // Reset to default state and save
  const resetToDefaults = useCallback(() => {
    const defaultConfig = getDefaultConfig()
    setPersistedConfig(defaultConfig)
    saveAppConfig(defaultConfig)
    setTempState({
      colorScheme: null,
      radius: null,
      customRadius: null,
      useCustomRadius: null,
    })
    console.log('Reset to default configuration and saved')
  }, [])

  const value: AppearanceProviderState = {
    // Current effective values
    ...effectiveConfig,
    
    // Temporary state for UI display
    tempColorScheme: tempState.colorScheme,
    tempRadius: tempState.radius,
    tempCustomRadius: tempState.customRadius,
    tempUseCustomRadius: tempState.useCustomRadius,
    
    // Actions
    setColorScheme,
    setRadius,
    setCustomRadius,
    setUseCustomRadius,
    saveColorAndRadiusSettings,
    resetToDefaults,
    
    // State
    hasUnsavedChanges,
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