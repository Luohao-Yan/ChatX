import type { TFunction } from 'i18next'

export type RadiusSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface RadiusOption {
  value: RadiusSize
  label: string
  description: string
  radius: string
  preview: {
    borderRadius: string
  }
}

export const radiusOptions: RadiusOption[] = [
  {
    value: 'none',
    label: 'settings.appearance.radius.none',
    description: 'settings.appearance.radius.noneDescription',
    radius: '0rem',
    preview: {
      borderRadius: '0rem',
    },
  },
  {
    value: 'sm',
    label: 'settings.appearance.radius.sm',
    description: 'settings.appearance.radius.smDescription',
    radius: '0.25rem',
    preview: {
      borderRadius: '0.25rem',
    },
  },
  {
    value: 'md',
    label: 'settings.appearance.radius.md',
    description: 'settings.appearance.radius.mdDescription',
    radius: '0.5rem',
    preview: {
      borderRadius: '0.5rem',
    },
  },
  {
    value: 'lg',
    label: 'settings.appearance.radius.lg',
    description: 'settings.appearance.radius.lgDescription',
    radius: '0.625rem',
    preview: {
      borderRadius: '0.625rem',
    },
  },
  {
    value: 'xl',
    label: 'settings.appearance.radius.xl',
    description: 'settings.appearance.radius.xlDescription',
    radius: '0.875rem',
    preview: {
      borderRadius: '0.875rem',
    },
  },
  {
    value: 'full',
    label: 'settings.appearance.radius.full',
    description: 'settings.appearance.radius.fullDescription',
    radius: '1.25rem',
    preview: {
      borderRadius: '1.25rem',
    },
  },
]

export const getRadiusOptions = (t: TFunction) => 
  radiusOptions.map(option => ({
    ...option,
    label: t(option.label),
    description: t(option.description),
  }))

export const defaultRadius: RadiusSize = 'lg'

// 获取圆角的CSS变量
export const getRadiusVars = (radius: RadiusSize) => {
  const option = radiusOptions.find(r => r.value === radius)
  if (!option) return {}
  
  const baseRadius = option.radius
  
  return {
    '--radius': baseRadius,
    '--radius-sm': `calc(${baseRadius} - 4px)`,
    '--radius-md': `calc(${baseRadius} - 2px)`,
    '--radius-lg': baseRadius,
    '--radius-xl': `calc(${baseRadius} + 4px)`,
  }
}

// 圆角滑动条设置
export interface RadiusSliderConfig {
  min: number
  max: number
  step: number
  defaultValue: number
  unit: string
}

export const radiusSliderConfig: RadiusSliderConfig = {
  min: 0,
  max: 20,
  step: 1,
  defaultValue: 10, // 对应0.625rem (lg)
  unit: 'px',
}

// 将滑动条值转换为rem
export const sliderValueToRadius = (value: number): string => {
  return `${value / 16}rem` // 16px = 1rem
}

// 将rem值转换为滑动条值
export const radiusToSliderValue = (radius: string): number => {
  const match = radius.match(/^([\d.]+)rem$/)
  if (!match) return radiusSliderConfig.defaultValue
  return Math.round(parseFloat(match[1]) * 16)
}