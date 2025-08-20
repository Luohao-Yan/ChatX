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

import React, { ReactNode, Suspense, useEffect, useRef, useCallback } from 'react'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const previousLocationRef = useRef(location.pathname)

  // 安全检查：如果动画类型不存在，降级到fade
  const safeTransition = pageTransition in enterpriseTransitions 
    ? pageTransition as keyof typeof enterpriseTransitions
    : 'fade'

  const transitionConfig = enterpriseTransitions[safeTransition]

  // 企业级焦点管理函数
  const safeFocusManagement = useCallback(() => {
    // 移除所有在aria-hidden元素内的焦点
    const removeHiddenFocus = () => {
      const hiddenElements = document.querySelectorAll('[aria-hidden="true"]')
      let hasFocusRemoval = false
      
      hiddenElements.forEach(hiddenEl => {
        const focusedInside = hiddenEl.querySelectorAll(':focus')
        if (focusedInside.length > 0) {
          hasFocusRemoval = true
          focusedInside.forEach(focused => {
            if (focused instanceof HTMLElement) {
              focused.blur()
            }
          })
        }
      })
      
      // 如果移除了焦点，确保不会造成焦点丢失
      if (hasFocusRemoval) {
        const safeTarget = document.querySelector(
          'main:not([aria-hidden="true"]) button:not([aria-hidden="true"]):not([disabled]), ' +
          'main:not([aria-hidden="true"]) input:not([aria-hidden="true"]):not([disabled]), ' +
          'main:not([aria-hidden="true"]) a[href]:not([aria-hidden="true"]), ' +
          'body'
        ) as HTMLElement
        
        if (safeTarget) {
          requestAnimationFrame(() => {
            safeTarget.focus()
          })
        }
      }
    }
    
    return removeHiddenFocus
  }, [])

  // 企业级焦点管理：主动预防aria-hidden冲突
  useEffect(() => {
    const removeHiddenFocus = safeFocusManagement()
    
    // 检测路由变化
    if (previousLocationRef.current !== location.pathname) {
      // 路由变化时，立即清理焦点
      removeHiddenFocus()
      previousLocationRef.current = location.pathname
    }
    
    // 全局焦点监听器
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      if (target) {
        const hiddenAncestor = target.closest('[aria-hidden="true"]')
        if (hiddenAncestor) {
          // 立即阻止事件并移除焦点
          event.preventDefault()
          event.stopImmediatePropagation()
          target.blur()
          
          // 寻找安全的焦点目标
          const safeTarget = document.querySelector(
            'main:not([aria-hidden="true"]) [tabindex]:not([tabindex="-1"]):not([aria-hidden="true"]), ' +
            'main:not([aria-hidden="true"]) button:not([disabled]):not([aria-hidden="true"]), ' +
            'main:not([aria-hidden="true"]) input:not([disabled]):not([aria-hidden="true"]), ' +
            'body'
          ) as HTMLElement
          
          if (safeTarget && safeTarget !== target) {
            requestAnimationFrame(() => safeTarget.focus())
          }
        }
      }
    }

    // 使用capture阶段监听，确保最早处理
    document.addEventListener('focusin', handleFocusIn, { capture: true, passive: false })
    
    // 监听aria-hidden属性变化
    const observer = new MutationObserver((mutations) => {
      let needsCleanup = false
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target as HTMLElement
          if (target.getAttribute('aria-hidden') === 'true') {
            needsCleanup = true
          }
        }
      })
      
      if (needsCleanup) {
        // 延迟执行，确保DOM更新完成
        requestAnimationFrame(removeHiddenFocus)
      }
    })
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-hidden'],
      subtree: true
    })
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn, { capture: true } as any)
      observer.disconnect()
    }
  }, [location.pathname, safeFocusManagement])

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
          onExitComplete={() => {
            // 退出动画完成后，确保没有遗留的焦点问题
            const hiddenElements = document.querySelectorAll('[aria-hidden="true"]')
            hiddenElements.forEach(el => {
              const focusedInside = el.querySelectorAll(':focus')
              focusedInside.forEach(focused => {
                if (focused instanceof HTMLElement) {
                  focused.blur()
                }
              })
            })
          }}
        >
          <motion.div
            ref={containerRef}
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
            onAnimationStart={() => {
              // 动画开始时清理焦点
              if (containerRef.current) {
                const removeHiddenFocus = safeFocusManagement()
                removeHiddenFocus()
              }
            }}
            onAnimationComplete={() => {
              // 动画完成后清理will-change，提升性能
              if (containerRef.current) {
                containerRef.current.style.willChange = 'auto'
              }
              
              // 再次确保焦点安全
              const removeHiddenFocus = safeFocusManagement()
              removeHiddenFocus()
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