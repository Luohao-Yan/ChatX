/**
 * 应用初始化组件
 * 处理应用启动时的初始化逻辑
 */

import React, { useEffect, useState } from 'react'
import { useAutoLogin } from '@/hooks/use-auth'
import { authLogger } from '@/lib/logger'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AppInitializerProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AppInitializer({ children, fallback }: AppInitializerProps) {
  const { isChecking: isAutoLoginChecking } = useAutoLogin()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        authLogger.info('App initialization started')
        
        // 这里可以添加其他初始化逻辑
        // 例如：加载用户偏好设置、主题配置等
        
        // 模拟一些初始化时间
        await new Promise(resolve => setTimeout(resolve, 500))
        
        authLogger.info('App initialization completed')
        setIsInitialized(true)
        
      } catch (error) {
        authLogger.error('App initialization failed', error instanceof Error ? error : new Error(String(error)))
        setIsInitialized(true) // 即使失败也要继续
      }
    }

    if (!isAutoLoginChecking) {
      initializeApp()
    }
  }, [isAutoLoginChecking])

  // 如果还在自动登录检查或应用初始化中，显示加载状态
  if (isAutoLoginChecking || !isInitialized) {
    return fallback || <DefaultLoadingFallback />
  }

  return <>{children}</>
}

// 默认加载状态组件
function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">ChatX</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            正在初始化应用...
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 自定义加载状态组件
interface CustomLoadingProps {
  title?: string
  message?: string
  children?: React.ReactNode
}

export function CustomLoading({ 
  title = 'ChatX', 
  message = '正在加载...', 
  children 
}: CustomLoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            {message}
          </div>
          {children || (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}