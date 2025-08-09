export type ColorScheme = 'default' | 'emerald' | 'blue' | 'indigo' | 'purple' | 'red' | 'orange'

export interface ColorSchemeOption {
  value: ColorScheme
  label: string
  colors: {
    primary: string
    primaryDark: string
    accent?: string
    accentDark?: string
  }
}

export const colorSchemes: ColorSchemeOption[] = [
  {
    value: 'default',
    label: '默认灰色',
    colors: {
      primary: 'oklch(0.208 0.042 265.755)',
      primaryDark: 'oklch(0.929 0.013 255.508)',
      accent: 'oklch(0.968 0.007 247.896)',
      accentDark: 'oklch(0.279 0.041 260.031)',
    },
  },
  {
    value: 'emerald',
    label: '翠绿色',
    colors: {
      primary: 'oklch(0.546 0.145 142.495)',
      primaryDark: 'oklch(0.729 0.146 142.495)',
    },
  },
  {
    value: 'blue',
    label: '蔚蓝色',
    colors: {
      primary: 'oklch(0.570 0.191 239.410)',
      primaryDark: 'oklch(0.720 0.150 239.410)',
    },
  },
  {
    value: 'indigo',
    label: '靛青色',
    colors: {
      primary: 'oklch(0.548 0.228 275.775)',
      primaryDark: 'oklch(0.720 0.180 275.775)',
    },
  },
  {
    value: 'purple',
    label: '紫罗兰',
    colors: {
      primary: 'oklch(0.571 0.191 307.665)',
      primaryDark: 'oklch(0.727 0.150 307.665)',
    },
  },
  {
    value: 'red',
    label: '朱红色',
    colors: {
      primary: 'oklch(0.577 0.245 27.325)',
      primaryDark: 'oklch(0.704 0.191 22.216)',
    },
  },
  {
    value: 'orange',
    label: '橙黄色',
    colors: {
      primary: 'oklch(0.646 0.222 41.116)',
      primaryDark: 'oklch(0.769 0.188 70.080)',
    },
  },
]

export const defaultColorScheme: ColorScheme = 'default'