import type { TFunction } from 'i18next'

export type ColorScheme = 'default' | 'emerald' | 'blue' | 'indigo' | 'purple' | 'red' | 'orange'

export interface ColorSchemeColors {
  light: {
    background: string
    foreground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    destructive: string
    border: string
    input: string
    ring: string
    chart: {
      chart1: string
      chart2: string
      chart3: string
      chart4: string
      chart5: string
    }
  }
  dark: {
    background: string
    foreground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    destructive: string
    border: string
    input: string
    ring: string
    chart: {
      chart1: string
      chart2: string
      chart3: string
      chart4: string
      chart5: string
    }
  }
}

export interface ColorSchemeOption {
  value: ColorScheme
  label: string
  description: string
  colors: ColorSchemeColors
}

export const colorSchemes: ColorSchemeOption[] = [
  {
    value: 'default',
    label: 'settings.appearance.colorScheme.default',
    description: 'settings.appearance.colorScheme.defaultDescription',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.129 0.042 264.695)',
        primary: 'oklch(0.208 0.042 265.755)',
        primaryForeground: 'oklch(0.984 0.003 247.858)',
        secondary: 'oklch(0.968 0.007 247.896)',
        secondaryForeground: 'oklch(0.208 0.042 265.755)',
        muted: 'oklch(0.968 0.007 247.896)',
        mutedForeground: 'oklch(0.554 0.046 257.417)',
        accent: 'oklch(0.968 0.007 247.896)',
        accentForeground: 'oklch(0.208 0.042 265.755)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.929 0.013 255.508)',
        input: 'oklch(0.929 0.013 255.508)',
        ring: 'oklch(0.704 0.04 256.788)',
        chart: {
          chart1: 'oklch(0.646 0.222 41.116)',
          chart2: 'oklch(0.6 0.118 184.704)',
          chart3: 'oklch(0.398 0.07 227.392)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.769 0.188 70.08)',
        },
      },
      dark: {
        background: 'oklch(0.129 0.042 264.695)',
        foreground: 'oklch(0.984 0.003 247.858)',
        primary: 'oklch(0.929 0.013 255.508)',
        primaryForeground: 'oklch(0.208 0.042 265.755)',
        secondary: 'oklch(0.279 0.041 260.031)',
        secondaryForeground: 'oklch(0.984 0.003 247.858)',
        muted: 'oklch(0.279 0.041 260.031)',
        mutedForeground: 'oklch(0.704 0.04 256.788)',
        accent: 'oklch(0.279 0.041 260.031)',
        accentForeground: 'oklch(0.984 0.003 247.858)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(1 0 0 / 10%)',
        input: 'oklch(1 0 0 / 15%)',
        ring: 'oklch(0.551 0.027 264.364)',
        chart: {
          chart1: 'oklch(0.488 0.243 264.376)',
          chart2: 'oklch(0.696 0.17 162.48)',
          chart3: 'oklch(0.769 0.188 70.08)',
          chart4: 'oklch(0.627 0.265 303.9)',
          chart5: 'oklch(0.645 0.246 16.439)',
        },
      },
    },
  },
  {
    value: 'emerald',
    label: 'settings.appearance.colorScheme.emerald',
    description: 'settings.appearance.colorScheme.emeraldDescription',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.129 0.042 264.695)',
        primary: 'oklch(0.546 0.145 142.495)',
        primaryForeground: 'oklch(0.984 0.003 247.858)',
        secondary: 'oklch(0.968 0.007 247.896)',
        secondaryForeground: 'oklch(0.208 0.042 265.755)',
        muted: 'oklch(0.968 0.007 247.896)',
        mutedForeground: 'oklch(0.554 0.046 257.417)',
        accent: 'oklch(0.929 0.025 142.495)',
        accentForeground: 'oklch(0.208 0.042 265.755)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.929 0.013 255.508)',
        input: 'oklch(0.929 0.013 255.508)',
        ring: 'oklch(0.546 0.145 142.495)',
        chart: {
          chart1: 'oklch(0.546 0.145 142.495)',
          chart2: 'oklch(0.729 0.146 142.495)',
          chart3: 'oklch(0.398 0.070 142.495)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.769 0.188 70.08)',
        },
      },
      dark: {
        background: 'oklch(0.129 0.042 264.695)',
        foreground: 'oklch(0.984 0.003 247.858)',
        primary: 'oklch(0.729 0.146 142.495)',
        primaryForeground: 'oklch(0.140 0.040 142.495)',
        secondary: 'oklch(0.279 0.041 260.031)',
        secondaryForeground: 'oklch(0.984 0.003 247.858)',
        muted: 'oklch(0.279 0.041 260.031)',
        mutedForeground: 'oklch(0.704 0.04 256.788)',
        accent: 'oklch(0.340 0.070 142.495)',
        accentForeground: 'oklch(0.984 0.003 247.858)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(1 0 0 / 10%)',
        input: 'oklch(1 0 0 / 15%)',
        ring: 'oklch(0.546 0.145 142.495)',
        chart: {
          chart1: 'oklch(0.729 0.146 142.495)',
          chart2: 'oklch(0.546 0.145 142.495)',
          chart3: 'oklch(0.398 0.070 142.495)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.769 0.188 70.08)',
        },
      },
    },
  },
  {
    value: 'blue',
    label: 'settings.appearance.colorScheme.blue',
    description: 'settings.appearance.colorScheme.blueDescription',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.129 0.042 264.695)',
        primary: 'oklch(0.570 0.191 239.410)',
        primaryForeground: 'oklch(0.984 0.003 247.858)',
        secondary: 'oklch(0.968 0.007 247.896)',
        secondaryForeground: 'oklch(0.208 0.042 265.755)',
        muted: 'oklch(0.968 0.007 247.896)',
        mutedForeground: 'oklch(0.554 0.046 257.417)',
        accent: 'oklch(0.929 0.025 239.410)',
        accentForeground: 'oklch(0.208 0.042 265.755)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.929 0.013 255.508)',
        input: 'oklch(0.929 0.013 255.508)',
        ring: 'oklch(0.570 0.191 239.410)',
        chart: {
          chart1: 'oklch(0.570 0.191 239.410)',
          chart2: 'oklch(0.720 0.150 239.410)',
          chart3: 'oklch(0.398 0.070 239.410)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.769 0.188 70.08)',
        },
      },
      dark: {
        background: 'oklch(0.129 0.042 264.695)',
        foreground: 'oklch(0.984 0.003 247.858)',
        primary: 'oklch(0.720 0.150 239.410)',
        primaryForeground: 'oklch(0.140 0.040 239.410)',
        secondary: 'oklch(0.279 0.041 260.031)',
        secondaryForeground: 'oklch(0.984 0.003 247.858)',
        muted: 'oklch(0.279 0.041 260.031)',
        mutedForeground: 'oklch(0.704 0.04 256.788)',
        accent: 'oklch(0.340 0.070 239.410)',
        accentForeground: 'oklch(0.984 0.003 247.858)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(1 0 0 / 10%)',
        input: 'oklch(1 0 0 / 15%)',
        ring: 'oklch(0.570 0.191 239.410)',
        chart: {
          chart1: 'oklch(0.720 0.150 239.410)',
          chart2: 'oklch(0.570 0.191 239.410)',
          chart3: 'oklch(0.398 0.070 239.410)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.769 0.188 70.08)',
        },
      },
    },
  },
  {
    value: 'purple',
    label: 'settings.appearance.colorScheme.purple',
    description: 'settings.appearance.colorScheme.purpleDescription',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.129 0.042 264.695)',
        primary: 'oklch(0.571 0.191 307.665)',
        primaryForeground: 'oklch(0.984 0.003 247.858)',
        secondary: 'oklch(0.968 0.007 247.896)',
        secondaryForeground: 'oklch(0.208 0.042 265.755)',
        muted: 'oklch(0.968 0.007 247.896)',
        mutedForeground: 'oklch(0.554 0.046 257.417)',
        accent: 'oklch(0.929 0.025 307.665)',
        accentForeground: 'oklch(0.208 0.042 265.755)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.929 0.013 255.508)',
        input: 'oklch(0.929 0.013 255.508)',
        ring: 'oklch(0.571 0.191 307.665)',
        chart: {
          chart1: 'oklch(0.571 0.191 307.665)',
          chart2: 'oklch(0.727 0.150 307.665)',
          chart3: 'oklch(0.398 0.070 307.665)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.769 0.188 70.08)',
        },
      },
      dark: {
        background: 'oklch(0.129 0.042 264.695)',
        foreground: 'oklch(0.984 0.003 247.858)',
        primary: 'oklch(0.727 0.150 307.665)',
        primaryForeground: 'oklch(0.140 0.040 307.665)',
        secondary: 'oklch(0.279 0.041 260.031)',
        secondaryForeground: 'oklch(0.984 0.003 247.858)',
        muted: 'oklch(0.279 0.041 260.031)',
        mutedForeground: 'oklch(0.704 0.04 256.788)',
        accent: 'oklch(0.340 0.070 307.665)',
        accentForeground: 'oklch(0.984 0.003 247.858)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(1 0 0 / 10%)',
        input: 'oklch(1 0 0 / 15%)',
        ring: 'oklch(0.571 0.191 307.665)',
        chart: {
          chart1: 'oklch(0.727 0.150 307.665)',
          chart2: 'oklch(0.571 0.191 307.665)',
          chart3: 'oklch(0.398 0.070 307.665)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.769 0.188 70.08)',
        },
      },
    },
  },
  {
    value: 'red',
    label: 'settings.appearance.colorScheme.red',
    description: 'settings.appearance.colorScheme.redDescription',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.129 0.042 264.695)',
        primary: 'oklch(0.577 0.245 27.325)',
        primaryForeground: 'oklch(0.984 0.003 247.858)',
        secondary: 'oklch(0.968 0.007 247.896)',
        secondaryForeground: 'oklch(0.208 0.042 265.755)',
        muted: 'oklch(0.968 0.007 247.896)',
        mutedForeground: 'oklch(0.554 0.046 257.417)',
        accent: 'oklch(0.929 0.025 27.325)',
        accentForeground: 'oklch(0.208 0.042 265.755)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.929 0.013 255.508)',
        input: 'oklch(0.929 0.013 255.508)',
        ring: 'oklch(0.577 0.245 27.325)',
        chart: {
          chart1: 'oklch(0.577 0.245 27.325)',
          chart2: 'oklch(0.704 0.191 22.216)',
          chart3: 'oklch(0.398 0.070 27.325)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.769 0.188 70.08)',
        },
      },
      dark: {
        background: 'oklch(0.129 0.042 264.695)',
        foreground: 'oklch(0.984 0.003 247.858)',
        primary: 'oklch(0.704 0.191 22.216)',
        primaryForeground: 'oklch(0.140 0.040 22.216)',
        secondary: 'oklch(0.279 0.041 260.031)',
        secondaryForeground: 'oklch(0.984 0.003 247.858)',
        muted: 'oklch(0.279 0.041 260.031)',
        mutedForeground: 'oklch(0.704 0.04 256.788)',
        accent: 'oklch(0.340 0.070 22.216)',
        accentForeground: 'oklch(0.984 0.003 247.858)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(1 0 0 / 10%)',
        input: 'oklch(1 0 0 / 15%)',
        ring: 'oklch(0.577 0.245 27.325)',
        chart: {
          chart1: 'oklch(0.704 0.191 22.216)',
          chart2: 'oklch(0.577 0.245 27.325)',
          chart3: 'oklch(0.398 0.070 27.325)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.769 0.188 70.08)',
        },
      },
    },
  },
  {
    value: 'orange',
    label: 'settings.appearance.colorScheme.orange',
    description: 'settings.appearance.colorScheme.orangeDescription',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.129 0.042 264.695)',
        primary: 'oklch(0.646 0.222 41.116)',
        primaryForeground: 'oklch(0.984 0.003 247.858)',
        secondary: 'oklch(0.968 0.007 247.896)',
        secondaryForeground: 'oklch(0.208 0.042 265.755)',
        muted: 'oklch(0.968 0.007 247.896)',
        mutedForeground: 'oklch(0.554 0.046 257.417)',
        accent: 'oklch(0.929 0.025 41.116)',
        accentForeground: 'oklch(0.208 0.042 265.755)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.929 0.013 255.508)',
        input: 'oklch(0.929 0.013 255.508)',
        ring: 'oklch(0.646 0.222 41.116)',
        chart: {
          chart1: 'oklch(0.646 0.222 41.116)',
          chart2: 'oklch(0.769 0.188 70.080)',
          chart3: 'oklch(0.398 0.070 41.116)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.577 0.245 27.325)',
        },
      },
      dark: {
        background: 'oklch(0.129 0.042 264.695)',
        foreground: 'oklch(0.984 0.003 247.858)',
        primary: 'oklch(0.769 0.188 70.080)',
        primaryForeground: 'oklch(0.140 0.040 70.080)',
        secondary: 'oklch(0.279 0.041 260.031)',
        secondaryForeground: 'oklch(0.984 0.003 247.858)',
        muted: 'oklch(0.279 0.041 260.031)',
        mutedForeground: 'oklch(0.704 0.04 256.788)',
        accent: 'oklch(0.340 0.070 70.080)',
        accentForeground: 'oklch(0.984 0.003 247.858)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(1 0 0 / 10%)',
        input: 'oklch(1 0 0 / 15%)',
        ring: 'oklch(0.646 0.222 41.116)',
        chart: {
          chart1: 'oklch(0.769 0.188 70.080)',
          chart2: 'oklch(0.646 0.222 41.116)',
          chart3: 'oklch(0.398 0.070 41.116)',
          chart4: 'oklch(0.828 0.189 84.429)',
          chart5: 'oklch(0.577 0.245 27.325)',
        },
      },
    },
  },
]

export const getColorSchemeOptions = (t: TFunction) => 
  colorSchemes.map(scheme => ({
    ...scheme,
    label: t(scheme.label),
    description: t(scheme.description),
  }))

export const defaultColorScheme: ColorScheme = 'default'

// 获取颜色方案的CSS变量
export const getColorSchemeVars = (scheme: ColorScheme, isDark: boolean) => {
  const colorScheme = colorSchemes.find(s => s.value === scheme)
  if (!colorScheme) return {}
  
  const colors = isDark ? colorScheme.colors.dark : colorScheme.colors.light
  
  return {
    '--background': colors.background,
    '--foreground': colors.foreground,
    '--primary': colors.primary,
    '--primary-foreground': colors.primaryForeground,
    '--secondary': colors.secondary,
    '--secondary-foreground': colors.secondaryForeground,
    '--muted': colors.muted,
    '--muted-foreground': colors.mutedForeground,
    '--accent': colors.accent,
    '--accent-foreground': colors.accentForeground,
    '--destructive': colors.destructive,
    '--border': colors.border,
    '--input': colors.input,
    '--ring': colors.ring,
    '--chart-1': colors.chart.chart1,
    '--chart-2': colors.chart.chart2,
    '--chart-3': colors.chart.chart3,
    '--chart-4': colors.chart.chart4,
    '--chart-5': colors.chart.chart5,
  }
}