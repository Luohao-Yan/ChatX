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
  // Temporary state (not persisted until save)
  tempColorScheme: ColorScheme | null
  tempRadius: RadiusSize | null
  tempCustomRadius: number | null
  tempUseCustomRadius: boolean | null
  
  // State management functions
  setColorScheme: (colorScheme: ColorScheme) => void
  setRadius: (radius: RadiusSize) => void
  setCustomRadius: (radius: number) => void
  setUseCustomRadius: (use: boolean) => void
  
  // Persistence functions
  saveSettings: () => void
  resetToSaved: () => void
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
  saveSettings: () => null,
  resetToSaved: () => null,
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
  
  // Temporary state for immediate UI changes
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

  // Compute effective configuration (temp overrides persisted)
  const effectiveConfig: AppConfig = {
    colorScheme: tempState.colorScheme ?? persistedConfig.colorScheme,
    radius: tempState.radius ?? persistedConfig.radius,
    customRadius: tempState.customRadius ?? persistedConfig.customRadius,
    useCustomRadius: tempState.useCustomRadius ?? persistedConfig.useCustomRadius,
  }

  // Check if there are unsaved changes
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

  // Temporary setters (don't persist)
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

  // Save current effective config to localStorage
  const saveSettings = useCallback(() => {
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
    console.log('Settings saved to localStorage:', newConfig)
  }, [effectiveConfig])

  // Reset to saved state (discard temp changes)
  const resetToSaved = useCallback(() => {
    setTempState({
      colorScheme: null,
      radius: null,
      customRadius: null,
      useCustomRadius: null,
    })
    console.log('Reset to saved configuration')
  }, [])

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
    saveSettings,
    resetToSaved,
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