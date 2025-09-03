import { useEffect, useState } from 'react'
import { cn } from '@/utils/utils'

interface AdaptiveLogoProps {
  className?: string
  size?: number
  showText?: boolean
  textClassName?: string
}

/**
 * 主题自适应的Logo组件
 * 根据当前主题自动调整聊天气泡的颜色，背景透明
 */
export function AdaptiveLogo({ 
  className, 
  size = 24, 
  showText = false,
  textClassName = "text-2xl font-semibold"
}: AdaptiveLogoProps) {
  const [isDark, setIsDark] = useState(false)

  // 检测主题变化
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    
    checkTheme()
    
    // 监听主题变化
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    })
    
    return () => observer.disconnect()
  }, [])

  // 根据主题调整颜色，增强对比度
  const bubbleColor = isDark ? '#4B5563' : '#ffffff' // dark:gray-600 : white
  const bubbleBorder = isDark ? 'rgba(156, 163, 175, 0.4)' : 'rgba(0, 0, 0, 0.15)' // 增强边框对比度
  const accentColor = isDark ? '#818CF8' : '#4F46E5' // indigo-400 : indigo-600
  const shadowIntensity = isDark ? '0.4' : '0.15' // 暗色模式下增强阴影

  const logoSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 高亮渐变 -->
        <linearGradient id="highlight-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(255,255,255,${isDark ? '0.2' : '0.3'})"/>
          <stop offset="100%" style="stop-color:rgba(255,255,255,${isDark ? '0.08' : '0.05'})"/>
        </linearGradient>
        
        <!-- 阴影滤镜 -->
        <filter id="shadow-${size}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,${shadowIntensity})"/>
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,${parseFloat(shadowIntensity) * 0.7})"/>
        </filter>
      </defs>
      
      <!-- 主对话框气泡 -->
      <g transform="translate(24, 24)" filter="url(#shadow-${size})">
        <!-- 主气泡背景 -->
        <path 
          d="M-12 -8 C-14 -8 -16 -6 -16 -4 L-16 4 C-16 6 -14 8 -12 8 L-4 8 L0 14 L4 8 L12 8 C14 8 16 6 16 4 L16 -4 C16 -6 14 -8 12 -8 Z" 
          fill="${bubbleColor}" 
          stroke="${bubbleBorder}"
          stroke-width="1"
          opacity="0.95">
          <animate attributeName="opacity" values="0.9;1;0.9" dur="4s" repeatCount="indefinite"/>
        </path>
        
        <!-- 玻璃质感高亮 -->
        <path 
          d="M-12 -8 C-14 -8 -16 -6 -16 -4 L-16 4 C-16 6 -14 8 -12 8 L-4 8 L0 14 L4 8 L12 8 C14 8 16 6 16 4 L16 -4 C16 -6 14 -8 12 -8 Z" 
          fill="url(#highlight-${size})"
          opacity="${isDark ? '0.5' : '0.4'}">
        </path>
        
        <!-- 消息内容条 - 增强亮度 -->
        <g opacity="${isDark ? '0.9' : '0.8'}">
          <rect x="-10" y="-4" width="12" height="2" rx="1" fill="${isDark ? '#6366F1' : '#4F46E5'}" opacity="0.95">
            <animate attributeName="fill" values="${isDark ? '#6366F1;#22D3EE;#34D399;#6366F1' : '#4F46E5;#06B6D4;#10B981;#4F46E5'}" dur="6s" repeatCount="indefinite"/>
          </rect>
          <rect x="-10" y="-1" width="16" height="2" rx="1" fill="${isDark ? '#22D3EE' : '#06B6D4'}" opacity="0.9">
            <animate attributeName="fill" values="${isDark ? '#22D3EE;#34D399;#FBBF24;#22D3EE' : '#06B6D4;#10B981;#F59E0B;#06B6D4'}" dur="6s" repeatCount="indefinite"/>
          </rect>
          <rect x="-10" y="2" width="8" height="2" rx="1" fill="${isDark ? '#34D399' : '#10B981'}" opacity="0.85">
            <animate attributeName="fill" values="${isDark ? '#34D399;#FBBF24;#F87171;#34D399' : '#10B981;#F59E0B;#EF4444;#10B981'}" dur="6s" repeatCount="indefinite"/>
          </rect>
        </g>
      </g>
      
      <!-- 次要对话框气泡 -->
      <g transform="translate(36, 12)" filter="url(#shadow-${size})">
        <path 
          d="M-6 -4 C-7 -4 -8 -3 -8 -2 L-8 2 C-8 3 -7 4 -6 4 L-2 4 L0 6 L2 4 L6 4 C7 4 8 3 8 2 L8 -2 C8 -3 7 -4 6 -4 Z" 
          fill="${bubbleColor}" 
          stroke="${bubbleBorder}"
          stroke-width="1"
          opacity="0.9">
          <animate attributeName="opacity" values="0.85;0.95;0.85" dur="5s" repeatCount="indefinite"/>
        </path>
        
        <!-- 高亮效果 -->
        <path 
          d="M-6 -4 C-7 -4 -8 -3 -8 -2 L-8 2 C-8 3 -7 4 -6 4 L-2 4 L0 6 L2 4 L6 4 C7 4 8 3 8 2 L8 -2 C8 -3 7 -4 6 -4 Z" 
          fill="url(#highlight-${size})"
          opacity="0.3">
        </path>
        
        <!-- 简单消息指示器 - 增强亮度 -->
        <g opacity="${isDark ? '0.85' : '0.7'}">
          <rect x="-4" y="-1" width="6" height="1" rx="0.5" fill="${isDark ? '#FBBF24' : '#F59E0B'}" opacity="0.95">
            <animate attributeName="fill" values="${isDark ? '#FBBF24;#F87171;#A78BFA;#FBBF24' : '#F59E0B;#EF4444;#8B5CF6;#F59E0B'}" dur="5s" repeatCount="indefinite"/>
          </rect>
          <rect x="-4" y="1" width="4" height="1" rx="0.5" fill="${isDark ? '#F87171' : '#EF4444'}" opacity="0.9">
            <animate attributeName="fill" values="${isDark ? '#F87171;#A78BFA;#FBBF24;#F87171' : '#EF4444;#8B5CF6;#F59E0B;#EF4444'}" dur="5s" repeatCount="indefinite"/>
          </rect>
        </g>
      </g>
      
      <!-- 装饰点 -->
      <circle cx="12" cy="36" r="2" fill="${accentColor}" opacity="0.3">
        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="42" cy="32" r="1.5" fill="${accentColor}" opacity="0.4">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `

  return (
    <div className={cn("flex items-center", className)}>
      <div 
        className="mr-3"
        dangerouslySetInnerHTML={{ __html: logoSvg }}
      />
      {showText && (
        <span className={cn("select-none", textClassName)}>
          ChatX
        </span>
      )}
    </div>
  )
}

export default AdaptiveLogo