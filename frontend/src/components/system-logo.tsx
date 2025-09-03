import { useState, useEffect } from 'react'
import { useSystemLogo, preloadSystemLogo } from '@/hooks/useSystemLogo'
import { cn } from '@/utils/utils'

interface SystemLogoProps {
  className?: string
  width?: number | string
  height?: number | string
  alt?: string
  fallbackSrc?: string
  priority?: boolean // 是否优先加载
}

/**
 * 系统Logo组件
 * 自动获取并显示当前系统配置的Logo
 */
export function SystemLogo({
  className,
  width = 'auto',
  height = 'auto',
  alt = 'System Logo',
  fallbackSrc = '/placeholder-logo.svg',
  priority = false,
}: SystemLogoProps) {
  const { logo, loading } = useSystemLogo()
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // 预加载Logo
  useEffect(() => {
    if (priority && logo.url) {
      preloadSystemLogo(logo.url).catch(() => {
        setImageError(true)
      })
    }
  }, [logo.url, priority])

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true)
  }

  // 处理图片加载成功
  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  // 确定要显示的图片源
  const imageSrc = imageError ? fallbackSrc : logo.url

  return (
    <div className={cn('relative', className)}>
      {/* 加载状态 */}
      {loading && !imageLoaded && (
        <div 
          className="flex items-center justify-center bg-muted/50 rounded animate-pulse"
          style={{ width, height }}
        >
          <div className="w-8 h-8 bg-muted rounded" />
        </div>
      )}

      {/* Logo图片 */}
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'object-contain transition-opacity duration-200',
          loading && !imageLoaded ? 'opacity-0 absolute' : 'opacity-100'
        )}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
      />

      {/* 错误状态显示 */}
      {imageError && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
          Logo不可用
        </div>
      )}
    </div>
  )
}

/**
 * 简化的Logo组件，用于Header等小尺寸显示
 */
export function SystemLogoSmall({ className, ...props }: Omit<SystemLogoProps, 'width' | 'height'>) {
  return (
    <SystemLogo
      className={cn('w-8 h-8', className)}
      width={32}
      height={32}
      priority
      {...props}
    />
  )
}

/**
 * 大尺寸Logo组件，用于登录页面等
 */
export function SystemLogoLarge({ className, ...props }: Omit<SystemLogoProps, 'width' | 'height'>) {
  return (
    <SystemLogo
      className={cn('w-auto max-w-sm', className)}
      width={301}
      height={301}
      priority
      {...props}
    />
  )
}