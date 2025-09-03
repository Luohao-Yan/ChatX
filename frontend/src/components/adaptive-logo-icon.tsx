import { useEffect, useState } from 'react'
import { cn } from '@/utils/utils'

interface AdaptiveLogoIconProps {
  className?: string
  size?: number
}

/**
 * 纯图标版本的主题自适应Logo组件
 * 专门用于侧边栏等小尺寸场景
 */
export function AdaptiveLogoIcon({ 
  className, 
  size = 16
}: AdaptiveLogoIconProps) {
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

  // 美观的品牌配色，增强视觉效果
  const brandColors = {
    primary: '#4F46E5',     // 品牌蓝色
    secondary: '#06B6D4',   // 青蓝色
    accent: '#10B981',      // 绿色
    background: isDark ? '#1E293B' : '#FFFFFF', // 背景色
    text: isDark ? '#F1F5F9' : '#334155'        // 文字色
  }

  const logoSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 背景渐变圆形提升品质感 -->
      <defs>
        <linearGradient id="bgGradient-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${brandColors.primary};stop-opacity:0.1"/>
          <stop offset="100%" style="stop-color:${brandColors.secondary};stop-opacity:0.05"/>
        </linearGradient>
      </defs>
      
      <circle cx="24" cy="24" r="22" fill="url(#bgGradient-${size})" stroke="${brandColors.primary}" stroke-width="0.5" opacity="0.3"/>
      
      <!-- 主对话框气泡 - 更大更美观 -->
      <g transform="translate(24, 24)">
        <path 
          d="M-10 -7 C-12 -7 -14 -5 -14 -3 L-14 4 C-14 6 -12 8 -10 8 L-4 8 L0 13 L4 8 L10 8 C12 8 14 6 14 4 L14 -3 C14 -5 12 -7 10 -7 Z" 
          fill="${brandColors.background}" 
          stroke="${brandColors.primary}"
          stroke-width="1.5"
          opacity="0.95">
        </path>
        
        <!-- 品牌色消息条 - 更精致 -->
        <g opacity="0.9">
          <rect x="-9" y="-4" width="11" height="2" rx="1" fill="${brandColors.primary}" opacity="0.9"/>
          <rect x="-9" y="-1.5" width="14" height="2" rx="1" fill="${brandColors.secondary}" opacity="0.8"/>
          <rect x="-9" y="1" width="7" height="2" rx="1" fill="${brandColors.accent}" opacity="0.7"/>
        </g>
      </g>
      
      <!-- 次要对话框 - 简化但保持美观 -->
      <g transform="translate(36, 12)">
        <path 
          d="M-5 -3.5 C-6 -3.5 -7 -2.5 -7 -1.5 L-7 2.5 C-7 3.5 -6 4.5 -5 4.5 L-2 4.5 L0 7 L2 4.5 L5 4.5 C6 4.5 7 3.5 7 2.5 L7 -1.5 C7 -2.5 6 -3.5 5 -3.5 Z" 
          fill="${brandColors.background}" 
          stroke="${brandColors.secondary}"
          stroke-width="1"
          opacity="0.85">
        </path>
        
        <!-- 精致的消息点 -->
        <g opacity="0.8">
          <rect x="-4" y="-1" width="5" height="1.2" rx="0.6" fill="${brandColors.accent}" opacity="0.8"/>
          <rect x="-4" y="1" width="3.5" height="1.2" rx="0.6" fill="${brandColors.primary}" opacity="0.7"/>
        </g>
      </g>
    </svg>
  `

  return (
    <div 
      className={cn("inline-flex", className)}
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  )
}

export default AdaptiveLogoIcon