/**
 * 企业级统一HTTP请求模块
 * 集成token管理、拦截器、错误处理等企业级功能
 * 替代axios，提供更优雅的API设计
 */

// 参数类型定义
type ParamValue = string | number | boolean | null | undefined

// 请求体类型定义 - 支持所有常见的请求体类型
// 在实际使用中，对象类型会被 JSON.stringify 转换
type RequestBody = BodyInit | object | null | undefined

// 请求配置接口
export interface RequestConfig extends RequestInit {
  url: string
  params?: Record<string, ParamValue>
  timeout?: number
  retry?: number
  retryDelay?: number
  // 支持外部传入的 AbortController
  abortController?: AbortController
}

// 响应接口
export interface ApiResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Headers
}

// 错误接口 - 兼容axios错误格式
export interface ApiError extends Error {
  status?: number
  response?: {
    status: number
    statusText: string
    data: unknown
    headers: Headers
  }
  data?: unknown
}

// 兼容axios的RequestError
export class RequestError extends Error implements ApiError {
  public status?: number
  public response?: {
    status: number
    statusText: string
    data: unknown
    headers: Headers
  }
  public data?: unknown

  constructor(message: string, status?: number, response?: Response, data?: unknown) {
    super(message)
    this.name = 'RequestError'
    this.status = status
    this.data = data
    
    if (response) {
      this.response = {
        status: response.status,
        statusText: response.statusText,
        data: data,
        headers: response.headers,
      }
    }
  }
}

// 为了向后兼容，导出AxiosError别名
export { RequestError as AxiosError }

// 拦截器接口
export interface RequestInterceptor {
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  onRequestError?: (error: Error) => Error | Promise<Error>
}

export interface ResponseInterceptor {
  onResponse?: <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>
  onResponseError?: (error: ApiError) => ApiError | Promise<ApiError>
}

// Token管理器
export class TokenManager {
  private static instance: TokenManager
  private tokenProvider: (() => string | null) | null = null
  private refreshTokenProvider: (() => Promise<string | null>) | null = null

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  // 设置token获取函数
  setTokenProvider(provider: () => string | null): void {
    this.tokenProvider = provider
  }

  // 设置刷新token的函数
  setRefreshTokenProvider(provider: () => Promise<string | null>): void {
    this.refreshTokenProvider = provider
  }

  // 获取token
  getToken(): string | null {
    if (this.tokenProvider) {
      return this.tokenProvider()
    }
    return null
  }

  // 刷新token
  async refreshToken(): Promise<string | null> {
    if (this.refreshTokenProvider) {
      return await this.refreshTokenProvider()
    }
    return null
  }

  // 清除token
  clearToken(): void {
    // 由具体的storage实现
    if (this.tokenProvider) {
      // 通知token provider清除token
    }
  }
}

class HttpClient {
  private baseURL: string = ''
  private defaultConfig: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  }
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  constructor(config?: { baseURL?: string; timeout?: number }) {
    if (config?.baseURL) {
      this.baseURL = config.baseURL.replace(/\/$/, '')
    }
  }

  // 设置基础URL
  setBaseURL(url: string) {
    this.baseURL = url.replace(/\/$/, '')
  }

  // 设置默认请求头
  setDefaultHeaders(headers: Record<string, string>) {
    this.defaultConfig.headers = {
      ...this.defaultConfig.headers,
      ...headers,
    }
  }

  // 添加请求拦截器
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
  }

  // 添加响应拦截器
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
  }

  // 构建完整URL
  private buildURL(url: string, params?: Record<string, ParamValue>): string {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`
    
    if (!params) return fullURL

    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })

    const paramString = searchParams.toString()
    return paramString ? `${fullURL}${fullURL.includes('?') ? '&' : '?'}${paramString}` : fullURL
  }


  // 重试逻辑
  private async retryRequest<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    maxRetries: number,
    delay: number
  ): Promise<ApiResponse<T>> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        if (attempt === maxRetries) {
          throw error
        }
        
        // 只有在特定错误情况下才重试
        const shouldRetry = 
          error instanceof Error && 
          (error.message.includes('timeout') || 
           error.message.includes('network') ||
           (error as ApiError).status === 0 ||
           ((error as ApiError).status && (error as ApiError).status! >= 500))

        if (!shouldRetry) {
          throw error
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)))
      }
    }
    
    throw new Error('Max retries exceeded')
  }

  // 应用请求拦截器
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let finalConfig = config

    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onRequest) {
        try {
          finalConfig = await interceptor.onRequest(finalConfig)
        } catch (error) {
          if (interceptor.onRequestError) {
            throw await interceptor.onRequestError(error as Error)
          }
          throw error
        }
      }
    }

    return finalConfig
  }

  // 应用响应拦截器
  private async applyResponseInterceptors<T>(response: ApiResponse<T>): Promise<ApiResponse<T>> {
    let finalResponse = response

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponse) {
        try {
          finalResponse = await interceptor.onResponse(finalResponse)
        } catch (error) {
          if (interceptor.onResponseError) {
            throw await interceptor.onResponseError(error as ApiError)
          }
          throw error
        }
      }
    }

    return finalResponse
  }

  // 应用响应错误拦截器
  private async applyResponseErrorInterceptors(error: ApiError): Promise<never> {
    let finalError = error

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponseError) {
        try {
          finalError = await interceptor.onResponseError(finalError)
        } catch (newError) {
          finalError = newError as ApiError
        }
      }
    }

    throw finalError
  }

  // 核心请求方法
  async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    try {
      // 应用请求拦截器
      const processedConfig = await this.applyRequestInterceptors(config)
      
      const {
        url,
        params,
        timeout = 10000,
        retry = 0,
        retryDelay = 1000,
        abortController,
        ...fetchConfig
      } = processedConfig

      // 构建请求URL
      const requestURL = this.buildURL(url, params)

      // 创建或使用现有的 AbortController
      const controller = abortController || new AbortController()

      // 合并配置
      const finalConfig: RequestInit = {
        ...this.defaultConfig,
        ...fetchConfig,
        signal: controller.signal,
        headers: {
          ...this.defaultConfig.headers,
          ...fetchConfig.headers,
        },
      }

      // 处理请求体
      if (finalConfig.body && typeof finalConfig.body === 'object' && !(finalConfig.body instanceof FormData)) {
        finalConfig.body = JSON.stringify(finalConfig.body)
      }

      // 定义请求函数
      const makeRequest = async (): Promise<ApiResponse<T>> => {
        // 设置超时自动取消
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort()
          }
        }, timeout)

        try {
          const response = await fetch(requestURL, finalConfig)
          clearTimeout(timeoutId)

          if (!response.ok) {
            let errorData: unknown
            try {
              errorData = await response.json()
            } catch {
              try {
                errorData = await response.text()
              } catch {
                errorData = null
              }
            }
            
            // 使用RequestError提供更好的错误信息
            const error = new RequestError(
              `HTTP Error: ${response.status} ${response.statusText}`,
              response.status,
              response,
              errorData
            )
            
            throw error
          }

          let data: T
          try {
            const text = await response.text()
            data = text ? JSON.parse(text) : ({} as T)
          } catch {
            data = {} as T
          }

          const apiResponse: ApiResponse<T> = {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          }

          return this.applyResponseInterceptors(apiResponse)
        } catch (fetchError) {
          clearTimeout(timeoutId)
          
          // 处理取消请求的错误
          if (controller.signal.aborted) {
            const abortError = new RequestError('Request was aborted', 0)
            throw abortError
          }
          
          throw fetchError
        }
      }

      // 执行请求（带重试）
      if (retry > 0) {
        return await this.retryRequest(makeRequest, retry, retryDelay)
      } else {
        return await makeRequest()
      }

    } catch (error) {
      return this.applyResponseErrorInterceptors(error as ApiError)
    }
  }

  // 便捷方法
  async get<T = unknown>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' })
  }

  async post<T = unknown>(url: string, data?: RequestBody, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', body: data as BodyInit })
  }

  async put<T = unknown>(url: string, data?: RequestBody, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', body: data as BodyInit })
  }

  async patch<T = unknown>(url: string, data?: RequestBody, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', body: data as BodyInit })
  }

  async delete<T = unknown>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' })
  }

  // 流式请求方法
  async stream(config: RequestConfig): Promise<ReadableStream<Uint8Array> | null> {
    try {
      // 应用请求拦截器
      const processedConfig = await this.applyRequestInterceptors(config)
      
      const {
        url,
        params,
        timeout = 30000, // 流式请求使用更长的超时时间
        abortController,
        ...fetchConfig
      } = processedConfig

      // 构建请求URL
      const requestURL = this.buildURL(url, params)

      // 创建或使用现有的 AbortController
      const controller = abortController || new AbortController()

      // 合并配置
      const finalConfig: RequestInit = {
        ...this.defaultConfig,
        ...fetchConfig,
        signal: controller.signal,
        headers: {
          ...this.defaultConfig.headers,
          ...fetchConfig.headers,
        },
      }

      // 处理请求体
      if (finalConfig.body && typeof finalConfig.body === 'object' && !(finalConfig.body instanceof FormData)) {
        finalConfig.body = JSON.stringify(finalConfig.body)
      }

      // 设置超时自动取消
      const timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort()
        }
      }, timeout)

      try {
        const response = await fetch(requestURL, finalConfig)
        clearTimeout(timeoutId)

        if (!response.ok) {
          const error = new RequestError(
            `HTTP Error: ${response.status} ${response.statusText}`,
            response.status,
            response
          )
          throw error
        }

        return response.body
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        // 处理取消请求的错误
        if (controller.signal.aborted) {
          const abortError = new RequestError('Stream request was aborted', 0)
          throw abortError
        }
        
        throw fetchError
      }

    } catch (error) {
      await this.applyResponseErrorInterceptors(error as ApiError)
      return null
    }
  }

  // 流式POST请求（常用于Server-Sent Events或流式API）
  async postStream(url: string, data?: RequestBody, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<ReadableStream<Uint8Array> | null> {
    return this.stream({ ...config, url, method: 'POST', body: data as BodyInit })
  }
}

// 可取消请求的便捷函数
export interface CancellableRequest<T> {
  promise: Promise<ApiResponse<T>>
  abort: () => void
}

export function createCancellableRequest<T>(
  requestFn: (controller: AbortController) => Promise<ApiResponse<T>>
): CancellableRequest<T> {
  const controller = new AbortController()
  
  return {
    promise: requestFn(controller),
    abort: () => controller.abort()
  }
}

// 流式请求工具函数
export interface StreamReader {
  reader: ReadableStreamDefaultReader<Uint8Array>
  abort: () => void
}

// 创建文本流读取器（用于SSE等）
export function createTextStreamReader(
  stream: ReadableStream<Uint8Array>,
  controller?: AbortController
): {
  readText: () => AsyncGenerator<string, void, undefined>
  abort: () => void
} {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  const abortController = controller || new AbortController()
  
  return {
    readText: async function* (): AsyncGenerator<string, void, undefined> {
      try {
        while (true) {
          if (abortController.signal.aborted) {
            break
          }
          
          const { done, value } = await reader.read()
          if (done) break
          
          const text = decoder.decode(value, { stream: true })
          if (text) {
            yield text
          }
        }
      } finally {
        reader.releaseLock()
      }
    },
    abort: () => {
      abortController.abort()
      reader.cancel()
    }
  }
}

// Server-Sent Events 辅助函数
export function createSSEReader(
  stream: ReadableStream<Uint8Array>
): {
  readEvents: () => AsyncGenerator<{ event?: string; data: string; id?: string }, void, undefined>
  abort: () => void
} {
  const textReader = createTextStreamReader(stream)
  
  return {
    readEvents: async function* () {
      let buffer = ''
      
      for await (const chunk of textReader.readText()) {
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后一个可能不完整的行
        
        let event: { event?: string; data: string; id?: string } | null = null
        
        for (const line of lines) {
          const trimmed = line.trim()
          
          if (trimmed === '') {
            // 空行表示事件结束
            if (event && event.data) {
              yield event
              event = null
            }
          } else if (trimmed.startsWith('data: ')) {
            if (!event) event = { data: '' }
            event.data += trimmed.substring(6) + '\n'
          } else if (trimmed.startsWith('event: ')) {
            if (!event) event = { data: '' }
            event.event = trimmed.substring(7)
          } else if (trimmed.startsWith('id: ')) {
            if (!event) event = { data: '' }
            event.id = trimmed.substring(4)
          }
        }
      }
    },
    abort: textReader.abort
  }
}

// 创建默认实例
export const http = new HttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000,
})

// 创建全局token管理器实例
export const tokenManager = TokenManager.getInstance()

// 企业级自动配置：token自动注入
http.addRequestInterceptor({
  onRequest: async (config) => {
    // 自动添加认证token
    const token = tokenManager.getToken()
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
    return config
  },
})

// 企业级认证错误处理：检测401但不自动刷新（避免与authStore冲突）
http.addResponseInterceptor({
  onResponseError: async (error) => {
    // 检测到401错误，通知authStore处理，避免在HTTP层重复刷新token
    if (error.status === 401) {
      console.log('🚨 [HTTP] Detected 401 error, notifying authStore')
      
      // 通知authStore有401错误，让它决定是否需要刷新token
      window.dispatchEvent(new CustomEvent('auth:token_invalid', { 
        detail: { 
          error: error,
          timestamp: Date.now()
        }
      }))
    }

    // 直接抛出错误，让authStore的API调用逻辑处理
    throw error
  },
})

// 初始化token管理器（使用auth-utils的storage）
const initializeTokenManager = async () => {
  try {
    // 动态导入auth-utils以避免循环依赖
    const { storage } = await import('./auth-utils')
    
    tokenManager.setTokenProvider(() => storage.getAccessToken())
    // 简化token刷新逻辑：只负责提供token，刷新逻辑完全交给authStore
    tokenManager.setRefreshTokenProvider(async () => {
      // tokenManager不直接刷新token，避免循环依赖
      // 刷新逻辑完全由authStore控制
      console.log('⚠️ [TOKEN_MANAGER] Refresh requested but delegated to authStore')
      return null
    })
  } catch (error) {
    console.warn('Token manager initialization failed:', error)
  }
}

// 自动初始化
initializeTokenManager()

// 创建自定义实例的工厂函数
export const createHttpClient = (config?: { baseURL?: string; timeout?: number }) => {
  return new HttpClient(config)
}

// 导出类型和实例
export { HttpClient }
export default http