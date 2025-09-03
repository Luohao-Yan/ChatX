import { useEffect, useState } from 'react'

/**
 * 专为团队切换器设计的Logo图标
 * 适配32px容器，提供最佳的视觉效果
 */
export function TeamLogoIcon() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    })
    
    return () => observer.disconnect()
  }, [])

  // 专为32px容器优化的配色
  const colors = {
    primary: '#4F46E5',
    secondary: '#06B6D4', 
    accent: '#10B981',
    bubble: isDark ? 'none' : '#F8FAFC'  // 暗色模式无填充，亮色模式用浅色填充
  }

  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 主对话框 - 充分利用空间 */}
      <g transform="translate(16, 16)">
        <path 
          d="M-8 -6 C-9.5 -6 -11 -4.5 -11 -3 L-11 3 C-11 4.5 -9.5 6 -8 6 L-3 6 L0 9 L3 6 L8 6 C9.5 6 11 4.5 11 3 L11 -3 C11 -4.5 9.5 -6 8 -6 Z" 
          fill={colors.bubble}
          stroke={colors.primary}
          strokeWidth="1"
          opacity="0.95">
        </path>
        
        {/* 消息条 - 清晰可见 */}
        <g opacity="0.85">
          <rect x="-7" y="-3" width="8" height="1.5" rx="0.75" fill={colors.primary} opacity="0.9"/>
          <rect x="-7" y="-1" width="10" height="1.5" rx="0.75" fill={colors.secondary} opacity="0.8"/>
          <rect x="-7" y="1" width="6" height="1.5" rx="0.75" fill={colors.accent} opacity="0.7"/>
        </g>
      </g>
      
      {/* 小气泡 */}
      <g transform="translate(26, 10)">
        <path 
          d="M-3 -2 C-3.5 -2 -4 -1.5 -4 -1 L-4 1 C-4 1.5 -3.5 2 -3 2 L-1 2 L0 3 L1 2 L3 2 C3.5 2 4 1.5 4 1 L4 -1 C4 -1.5 3.5 -2 3 -2 Z" 
          fill={colors.bubble}
          stroke={colors.secondary}
          strokeWidth="0.8"
          opacity="0.8">
        </path>
        
        <rect x="-2" y="-0.5" width="3" height="0.8" rx="0.4" fill={colors.accent} opacity="0.7"/>
      </g>
    </svg>
  )
}

export default TeamLogoIcon