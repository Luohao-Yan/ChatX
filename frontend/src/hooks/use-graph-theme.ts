import { useTheme } from '@/context/theme-context'
import { useMemo, useEffect, useState } from 'react'
import { loadAppConfig } from '@/lib/app-config'
import { getColorSchemeVars } from '@/config/color-schemes'

export interface GraphTheme {
  backgroundColor: string
  textColor: string
  primaryColor: string
  accentColor: string
  nodeColors: {
    document: string
    concept: string
    person: string
    organization: string
    department: string
    topic: string
    tag: string
    website: string
    wechat_article: string
  }
  linkColor: string
  borderColor: string
  chartColors: {
    chart1: string
    chart2: string
    chart3: string
    chart4: string
    chart5: string
  }
}

/**
 * ECharts图谱主题hook - 完全集成系统主题色方案
 * 支持明暗主题切换和用户自定义主题色
 */
export const useGraphTheme = (): GraphTheme => {
  const { theme } = useTheme()
  const [colorScheme, setColorScheme] = useState(() => loadAppConfig().colorScheme)
  
  // 监听主题色方案变化
  useEffect(() => {
    const handleStorageChange = () => {
      const config = loadAppConfig()
      setColorScheme(config.colorScheme)
    }
    
    // 监听localStorage变化
    window.addEventListener('storage', handleStorageChange)
    
    // 监听自定义事件（当应用内修改配置时）
    window.addEventListener('app-config-changed', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('app-config-changed', handleStorageChange)
    }
  }, [])
  
  return useMemo(() => {
    const isDark = theme === 'dark' || 
      (theme === 'system' && window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches)

    // 获取当前主题色方案的颜色变量
    const colorVars = getColorSchemeVars(colorScheme, isDark)

    // 获取CSS变量的实际颜色值
    const getCSSVar = (varName: string, fallback: string) => {
      if (typeof window === 'undefined') return fallback
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName)
      return value.trim() || fallback
    }

    return {
      backgroundColor: getCSSVar('--background', colorVars['--background'] || (isDark ? '#0f172a' : '#ffffff')),
      textColor: getCSSVar('--foreground', colorVars['--foreground'] || (isDark ? '#f8fafc' : '#1e293b')),
      primaryColor: getCSSVar('--primary', colorVars['--primary'] || '#3b82f6'),
      accentColor: getCSSVar('--accent', colorVars['--accent'] || '#6b7280'),
      nodeColors: {
        // 精心设计的高对比度色彩方案
        document: isDark ? '#60a5fa' : '#1d4ed8',        // 蓝色 - 文档
        concept: isDark ? '#a78bfa' : '#7c3aed',         // 紫色 - 概念  
        person: isDark ? '#34d399' : '#059669',          // 绿色 - 人员
        organization: isDark ? '#fbbf24' : '#d97706',    // 橙色 - 组织
        department: isDark ? '#38bdf8' : '#0284c7',      // 天蓝色 - 部门
        topic: isDark ? '#f87171' : '#dc2626',           // 红色 - 主题
        tag: isDark ? '#a3e635' : '#65a30d',             // 青柠色 - 标签
        website: isDark ? '#fb7185' : '#e11d48',         // 玫瑰色 - 网页
        wechat_article: isDark ? '#c084fc' : '#9333ea'   // 淡紫色 - 微信文章
      },
      linkColor: getCSSVar('--muted-foreground', colorVars['--muted-foreground'] || (isDark ? '#64748b' : '#94a3b8')),
      borderColor: getCSSVar('--border', colorVars['--border'] || (isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0')),
      chartColors: {
        chart1: getCSSVar('--chart-1', colorVars['--chart-1'] || '#3b82f6'),
        chart2: getCSSVar('--chart-2', colorVars['--chart-2'] || '#8b5cf6'),
        chart3: getCSSVar('--chart-3', colorVars['--chart-3'] || '#10b981'),
        chart4: getCSSVar('--chart-4', colorVars['--chart-4'] || '#f59e0b'),
        chart5: getCSSVar('--chart-5', colorVars['--chart-5'] || '#ef4444')
      }
    }
  }, [theme, colorScheme])
}