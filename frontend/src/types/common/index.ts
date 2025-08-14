// 通用类型定义

export interface BaseEntity {
  id: number
  created_at: string
  updated_at?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PaginationResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  code?: string
}

export interface ApiError {
  success: false
  message: string
  code?: string
  details?: unknown
}

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  description?: string
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  options?: SelectOption[]
  validation?: {
    pattern?: RegExp
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    custom?: (value: any) => boolean | string
  }
}

export interface TableColumn<T = any> {
  key: keyof T | string
  title: string
  width?: number | string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, record: T, index: number) => React.ReactNode
}

export interface FilterOption {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean'
  options?: SelectOption[]
  placeholder?: string
}

export type LoadingState = 'idle' | 'pending' | 'success' | 'error'

export type ThemeMode = 'light' | 'dark' | 'system'

export type Language = 'zh' | 'en'

// 事件处理器类型
export type EventHandler<T = any> = (data: T) => void | Promise<void>

// 状态更新器类型
export type StateUpdater<T> = (prevState: T) => T

// 异步函数类型
export type AsyncFunction<TArgs extends any[] = [], TReturn = void> = (
  ...args: TArgs
) => Promise<TReturn>