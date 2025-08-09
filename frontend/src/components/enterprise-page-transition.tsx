/**
 * Enterprise Page Transition Component
 * 企业级页面切换动画组件
 * 
 * 特点：
 * - 稳定可靠，优雅降级
 * - 性能优化，避免重排重绘
 * - 错误边界处理
 * - 可配置的企业级动画
 */

import React, { ReactNode, Suspense } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { useLocation } from '@tanstack/react-router'
import { useAppearance } from '@/context/appearance-context'

interface EnterprisePageTransitionProps {
  children: ReactNode
}

// 企业级动画配置 - 注重稳定性和性能
const enterpriseTransitions = {
  none: {
    initial: {},
    animate: {},
    exit: {},
    transition: { duration: 0 }
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { 
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1] // 企业级缓动曲线
    }
  },
  slide: {
    initial: { x: 24, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -24, opacity: 0 },
    transition: { 
      duration: 0.3,
      ease: [0.32, 0.72, 0, 1]
    }
  },
  'slide-up': {
    initial: { y: 32, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -16, opacity: 0 },
    transition: { 
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  zoom: {
    initial: { scale: 0.96, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.04, opacity: 0 },
    transition: { 
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  'blur-fade': {
    initial: { filter: 'blur(4px)', opacity: 0, scale: 0.98 },
    animate: { filter: 'blur(0px)', opacity: 1, scale: 1 },
    exit: { filter: 'blur(2px)', opacity: 0, scale: 1.02 },
    transition: { 
      duration: 0.4,
      ease: [0.23, 1, 0.32, 1]
    }
  }
} as const

// 错误边界组件
class AnimationErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[Enterprise Animation] Animation error, falling back to no animation:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || this.props.children
    }
    return this.props.children
  }
}

export function EnterprisePageTransition({ children }: EnterprisePageTransitionProps) {
  const location = useLocation()
  const { pageTransition } = useAppearance()

  // 安全检查：如果动画类型不存在，降级到fade
  const safeTransition = pageTransition in enterpriseTransitions 
    ? pageTransition as keyof typeof enterpriseTransitions
    : 'fade'

  const transitionConfig = enterpriseTransitions[safeTransition]

  // 如果是none模式，直接返回children，避免不必要的包装
  if (safeTransition === 'none') {
    return <>{children}</>
  }

  return (
    <AnimationErrorBoundary fallback={children}>
      <MotionConfig
        // 企业级全局配置
        reducedMotion="user" // 尊重用户的无障碍设置
        transition={{ duration: 0.25 }} // 默认过渡时间
      >
        <AnimatePresence
          mode="wait" // 等待退出动画完成再开始进入动画
          initial={false} // 初次加载不执行动画
        >
          <motion.div
            key={location.pathname} // 以路径为key，确保路由变化时触发动画
            initial={transitionConfig.initial}
            animate={transitionConfig.animate}
            exit={transitionConfig.exit}
            transition={transitionConfig.transition}
            style={{
              // 企业级性能优化
              willChange: 'transform, opacity, filter',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'translateZ(0)', // 强制硬件加速
            }}
            // 错误恢复机制
            onAnimationComplete={() => {
              // 动画完成后清理will-change，提升性能
              const element = document.querySelector('[data-enterprise-transition]') as HTMLElement
              if (element) {
                element.style.willChange = 'auto'
              }
            }}
            data-enterprise-transition={safeTransition}
          >
            <Suspense 
              fallback={
                <div className="flex items-center justify-center min-h-[200px]">
                  <div className="animate-pulse text-muted-foreground">加载中...</div>
                </div>
              }
            >
              {children}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </MotionConfig>
    </AnimationErrorBoundary>
  )
}

// 提供简单的API供其他组件使用
export { enterpriseTransitions }
export type EnterpriseTransitionType = keyof typeof enterpriseTransitions