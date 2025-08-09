import type { TFunction } from 'i18next'

// 字体大小设置
export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface FontSizeOption {
  value: FontSize
  label: string
  description: string
  scale: number // 相对于基础字体大小的倍数
}

export const fontSizeOptions: FontSizeOption[] = [
  {
    value: 'xs',
    label: 'settings.appearance.fontSize.xs',
    description: 'settings.appearance.fontSize.xsDescription',
    scale: 0.875, // 14px
  },
  {
    value: 'sm',
    label: 'settings.appearance.fontSize.sm',
    description: 'settings.appearance.fontSize.smDescription',
    scale: 0.9375, // 15px
  },
  {
    value: 'md',
    label: 'settings.appearance.fontSize.md',
    description: 'settings.appearance.fontSize.mdDescription',
    scale: 1, // 16px (默认)
  },
  {
    value: 'lg',
    label: 'settings.appearance.fontSize.lg',
    description: 'settings.appearance.fontSize.lgDescription',
    scale: 1.125, // 18px
  },
  {
    value: 'xl',
    label: 'settings.appearance.fontSize.xl',
    description: 'settings.appearance.fontSize.xlDescription',
    scale: 1.25, // 20px
  },
]

// 间距密度设置
export type SpacingDensity = 'compact' | 'comfortable' | 'spacious'

export interface SpacingDensityOption {
  value: SpacingDensity
  label: string
  description: string
  scale: number // 相对于默认间距的倍数
}

export const spacingDensityOptions: SpacingDensityOption[] = [
  {
    value: 'compact',
    label: 'settings.appearance.spacing.compact',
    description: 'settings.appearance.spacing.compactDescription',
    scale: 0.75,
  },
  {
    value: 'comfortable',
    label: 'settings.appearance.spacing.comfortable',
    description: 'settings.appearance.spacing.comfortableDescription',
    scale: 1, // 默认
  },
  {
    value: 'spacious',
    label: 'settings.appearance.spacing.spacious',
    description: 'settings.appearance.spacing.spaciousDescription',
    scale: 1.25,
  },
]

// 界面宽度设置
export type InterfaceWidth = 'narrow' | 'standard' | 'wide' | 'full'

export interface InterfaceWidthOption {
  value: InterfaceWidth
  label: string
  description: string
  maxWidth: string
}

export const interfaceWidthOptions: InterfaceWidthOption[] = [
  {
    value: 'narrow',
    label: 'settings.appearance.width.narrow',
    description: 'settings.appearance.width.narrowDescription',
    maxWidth: '1024px', // max-w-4xl
  },
  {
    value: 'standard',
    label: 'settings.appearance.width.standard',
    description: 'settings.appearance.width.standardDescription',
    maxWidth: '1280px', // max-w-6xl
  },
  {
    value: 'wide',
    label: 'settings.appearance.width.wide',
    description: 'settings.appearance.width.wideDescription',
    maxWidth: '1536px', // max-w-7xl
  },
  {
    value: 'full',
    label: 'settings.appearance.width.full',
    description: 'settings.appearance.width.fullDescription',
    maxWidth: '100%', // max-w-full
  },
]

// 侧边栏位置设置
export type SidebarPosition = 'left' | 'right'

export interface SidebarPositionOption {
  value: SidebarPosition
  label: string
  description: string
}

export const sidebarPositionOptions: SidebarPositionOption[] = [
  {
    value: 'left',
    label: 'settings.appearance.sidebar.left',
    description: 'settings.appearance.sidebar.leftDescription',
  },
  {
    value: 'right',
    label: 'settings.appearance.sidebar.right',
    description: 'settings.appearance.sidebar.rightDescription',
  },
]

// 动画设置
export type AnimationSpeed = 'none' | 'slow' | 'normal' | 'fast'

export interface AnimationSpeedOption {
  value: AnimationSpeed
  label: string
  description: string
  duration: string
}

export const animationSpeedOptions: AnimationSpeedOption[] = [
  {
    value: 'none',
    label: 'settings.appearance.animation.none',
    description: 'settings.appearance.animation.noneDescription',
    duration: '0ms',
  },
  {
    value: 'slow',
    label: 'settings.appearance.animation.slow',
    description: 'settings.appearance.animation.slowDescription',
    duration: '500ms',
  },
  {
    value: 'normal',
    label: 'settings.appearance.animation.normal',
    description: 'settings.appearance.animation.normalDescription',
    duration: '300ms',
  },
  {
    value: 'fast',
    label: 'settings.appearance.animation.fast',
    description: 'settings.appearance.animation.fastDescription',
    duration: '150ms',
  },
]

// 获取所有选项的翻译版本
export const getFontSizeOptions = (t: TFunction) => 
  fontSizeOptions.map(option => ({
    ...option,
    label: t(option.label),
    description: t(option.description),
  }))

export const getSpacingDensityOptions = (t: TFunction) => 
  spacingDensityOptions.map(option => ({
    ...option,
    label: t(option.label),
    description: t(option.description),
  }))

export const getInterfaceWidthOptions = (t: TFunction) => 
  interfaceWidthOptions.map(option => ({
    ...option,
    label: t(option.label),
    description: t(option.description),
  }))

export const getSidebarPositionOptions = (t: TFunction) => 
  sidebarPositionOptions.map(option => ({
    ...option,
    label: t(option.label),
    description: t(option.description),
  }))

export const getAnimationSpeedOptions = (t: TFunction) => 
  animationSpeedOptions.map(option => ({
    ...option,
    label: t(option.label),
    description: t(option.description),
  }))

// 默认值
export const defaultFontSize: FontSize = 'md'
export const defaultSpacingDensity: SpacingDensity = 'comfortable'
export const defaultInterfaceWidth: InterfaceWidth = 'standard'
export const defaultSidebarPosition: SidebarPosition = 'left'
export const defaultAnimationSpeed: AnimationSpeed = 'normal'

// 获取字体大小CSS变量
export const getFontSizeVars = (fontSize: FontSize) => {
  const option = fontSizeOptions.find(f => f.value === fontSize)
  if (!option) return {}
  
  return {
    '--font-size-scale': option.scale.toString(),
  }
}

// 获取间距密度CSS变量
export const getSpacingDensityVars = (density: SpacingDensity) => {
  const option = spacingDensityOptions.find(d => d.value === density)
  if (!option) return {}
  
  return {
    '--spacing-scale': option.scale.toString(),
  }
}

// 获取界面宽度CSS变量
export const getInterfaceWidthVars = (width: InterfaceWidth) => {
  const option = interfaceWidthOptions.find(w => w.value === width)
  if (!option) return {}
  
  return {
    '--interface-max-width': option.maxWidth,
  }
}

// 获取动画速度CSS变量
export const getAnimationSpeedVars = (speed: AnimationSpeed) => {
  const option = animationSpeedOptions.find(s => s.value === speed)
  if (!option) return {}
  
  return {
    '--animation-duration': option.duration,
  }
}