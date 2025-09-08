/**
 * 企业级日志服务
 * 支持多级别日志、结构化数据、远程上报等功能
 */

// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// 日志接口
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: unknown
  error?: Error
  userId?: string
  sessionId?: string
  requestId?: string
  source: string
  stack?: string
}

// 日志配置
export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  maxBufferSize: number
  flushInterval: number
  enableStackTrace: boolean
  enableUserContext: boolean
}

// 默认配置
const DEFAULT_CONFIG: LoggerConfig = {
  level: import.meta.env.DEV ? LogLevel.WARN : LogLevel.INFO, // 提高日志级别，减少调试信息
  enableConsole: import.meta.env.DEV,
  enableRemote: import.meta.env.PROD,
  remoteEndpoint: '/api/logs',
  maxBufferSize: 100,
  flushInterval: 30000, // 30秒
  enableStackTrace: true,
  enableUserContext: true,
}

// 日志级别名称映射
const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
}

// 企业级日志器类
export class Logger {
  private config: LoggerConfig
  private buffer: LogEntry[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private userContext: { userId?: string; sessionId?: string } = {}

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    if (this.config.enableRemote) {
      this.startAutoFlush()
    }

    // 监听页面卸载，确保日志上报
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush()
      })
    }
  }

  // 设置用户上下文
  setUserContext(userId?: string, sessionId?: string): void {
    this.userContext = { userId, sessionId }
  }

  // 清除用户上下文
  clearUserContext(): void {
    this.userContext = {}
  }

  // Debug级别日志
  debug(message: string, data?: unknown, source = 'app'): void {
    this.log(LogLevel.DEBUG, message, data, undefined, source)
  }

  // Info级别日志
  info(message: string, data?: unknown, source = 'app'): void {
    this.log(LogLevel.INFO, message, data, undefined, source)
  }

  // Warning级别日志
  warn(message: string, data?: unknown, source = 'app'): void {
    this.log(LogLevel.WARN, message, data, undefined, source)
  }

  // Error级别日志
  error(message: string, error?: Error, data?: unknown, source = 'app'): void {
    this.log(LogLevel.ERROR, message, data, error, source)
  }

  // Fatal级别日志
  fatal(message: string, error?: Error, data?: unknown, source = 'app'): void {
    this.log(LogLevel.FATAL, message, data, error, source)
  }

  // 核心日志方法
  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    error?: Error,
    source = 'app'
  ): void {
    // 检查日志级别
    if (level < this.config.level) {
      return
    }

    // 创建日志条目
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error,
      source,
      ...this.userContext,
    }

    // 添加堆栈信息
    if (this.config.enableStackTrace && (error || level >= LogLevel.ERROR)) {
      entry.stack = error?.stack || new Error().stack
    }

    // 控制台输出（开发环境）
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }

    // 添加到缓冲区（生产环境远程上报）
    if (this.config.enableRemote) {
      this.addToBuffer(entry)
    }
  }

  // 控制台输出
  private logToConsole(entry: LogEntry): void {
    const levelName = LEVEL_NAMES[entry.level]
    const timestamp = new Date(entry.timestamp).toLocaleTimeString()
    const prefix = `[${timestamp}] [${levelName}] [${entry.source}]`

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`%c${prefix}`, 'color: #6B7280', entry.message, entry.data)
        break
      case LogLevel.INFO:
        console.info(`%c${prefix}`, 'color: #3B82F6', entry.message, entry.data)
        break
      case LogLevel.WARN:
        console.warn(`%c${prefix}`, 'color: #F59E0B', entry.message, entry.data)
        break
      case LogLevel.ERROR:
        console.error(`%c${prefix}`, 'color: #EF4444', entry.message, entry.data, entry.error)
        break
      case LogLevel.FATAL:
        console.error(`%c${prefix}`, 'color: #DC2626; font-weight: bold', entry.message, entry.data, entry.error)
        break
    }
  }

  // 添加到缓冲区
  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry)

    // 检查缓冲区大小
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush()
    }
  }

  // 开始自动刷新
  private startAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  // 刷新日志到远程服务器
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return
    }

    const logs = [...this.buffer]
    this.buffer = []

    try {
      if (this.config.remoteEndpoint) {
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs }),
        })
      }
    } catch (error) {
      // 如果远程上报失败，将日志重新加入缓冲区
      this.buffer.unshift(...logs)

      // 在开发环境显示上报失败信息
      if (import.meta.env.DEV) {
        console.warn('Failed to flush logs to remote endpoint:', error)
      }
    }
  }

  // 销毁日志器
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // 最后一次刷新
    this.flush()
  }

  // 更新配置
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }

    if (this.config.enableRemote && !this.flushTimer) {
      this.startAutoFlush()
    } else if (!this.config.enableRemote && this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  // 获取缓冲区状态
  getBufferStatus(): { size: number; maxSize: number } {
    return {
      size: this.buffer.length,
      maxSize: this.config.maxBufferSize,
    }
  }
}

// 创建全局日志器实例
export const logger = new Logger()

// 针对认证模块的专用日志器
export const authLogger = {
  debug: (message: string, data?: unknown) => logger.debug(message, data, 'auth'),
  info: (message: string, data?: unknown) => logger.info(message, data, 'auth'),
  warn: (message: string, data?: unknown) => logger.warn(message, data, 'auth'),
  error: (message: string, error?: Error, data?: unknown) => logger.error(message, error, data, 'auth'),
  fatal: (message: string, error?: Error, data?: unknown) => logger.fatal(message, error, data, 'auth'),
}

// API请求专用日志器
export const apiLogger = {
  debug: (message: string, data?: unknown) => logger.debug(message, data, 'api'),
  info: (message: string, data?: unknown) => logger.info(message, data, 'api'),
  warn: (message: string, data?: unknown) => logger.warn(message, data, 'api'),
  error: (message: string, error?: Error, data?: unknown) => logger.error(message, error, data, 'api'),
  fatal: (message: string, error?: Error, data?: unknown) => logger.fatal(message, error, data, 'api'),
}

// 用户行为日志器
export const userLogger = {
  debug: (message: string, data?: unknown) => logger.debug(message, data, 'user'),
  info: (message: string, data?: unknown) => logger.info(message, data, 'user'),
  warn: (message: string, data?: unknown) => logger.warn(message, data, 'user'),
  error: (message: string, error?: Error, data?: unknown) => logger.error(message, error, data, 'user'),
  fatal: (message: string, error?: Error, data?: unknown) => logger.fatal(message, error, data, 'user'),
}

// 性能日志器
export const perfLogger = {
  debug: (message: string, data?: unknown) => logger.debug(message, data, 'performance'),
  info: (message: string, data?: unknown) => logger.info(message, data, 'performance'),
  warn: (message: string, data?: unknown) => logger.warn(message, data, 'performance'),
  error: (message: string, error?: Error, data?: unknown) => logger.error(message, error, data, 'performance'),
  fatal: (message: string, error?: Error, data?: unknown) => logger.fatal(message, error, data, 'performance'),
}

// 便捷的性能监控工具
export class PerformanceTracker {
  private startTime: number
  private name: string

  constructor(name: string) {
    this.name = name
    this.startTime = performance.now()
    perfLogger.debug(`Performance tracking started: ${name}`)
  }

  end(data?: Record<string, unknown>): number {
    const duration = performance.now() - this.startTime
    perfLogger.info(`Performance tracking ended: ${this.name}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...(data || {}),
    })
    return duration
  }
}

// 导出工具函数
export const createPerformanceTracker = (name: string) => new PerformanceTracker(name)

// 错误边界日志记录
export const logErrorBoundary = (error: Error, errorInfo: { componentStack?: string }) => {
  logger.fatal('React Error Boundary caught an error', error, {
    componentStack: errorInfo.componentStack,
  })
}

// 未捕获的错误和Promise拒绝处理
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.fatal('Uncaught error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.fatal('Unhandled promise rejection', undefined, {
      reason: event.reason,
    })
  })
}

export default logger