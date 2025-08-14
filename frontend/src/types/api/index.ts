// API相关类型定义
import { PaginationParams, PaginationResponse, ApiResponse, ApiError } from '../common'

// 请求配置类型
export interface RequestConfig {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  params?: Record<string, any>
  data?: any
  withCredentials?: boolean
}

// HTTP方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// API端点类型
export interface ApiEndpoint {
  method: HttpMethod
  url: string
  config?: RequestConfig
}

// 认证相关API类型
export interface AuthTokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface LoginRequest {
  email: string
  password: string
  remember_me?: boolean
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  full_name?: string
  terms_accepted: boolean
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
  verification_code: string
  new_password: string
}

// 聊天相关API类型
export interface CreateConversationRequest {
  title?: string
  type: 'ai' | 'user'
  participants?: number[]
}

export interface SendMessageRequest {
  conversation_id: number
  content: string
  content_type?: 'text' | 'markdown'
  reply_to_id?: number
  attachments?: File[]
}

export interface UpdateConversationRequest {
  title?: string
  is_archived?: boolean
  is_pinned?: boolean
  metadata?: Record<string, any>
}

// 文档相关API类型
export interface UploadDocumentRequest {
  file: File
  category_id?: number
  tags?: string[]
  description?: string
}

export interface CreateCategoryRequest {
  name: string
  description?: string
  parent_id?: number
  color?: string
}

export interface SearchDocumentsRequest extends PaginationParams {
  query: string
  category_id?: number
  file_type?: string
  date_from?: string
  date_to?: string
  tags?: string[]
}

// 知识图谱相关API类型
export interface CreateKnowledgeNodeRequest {
  name: string
  type: string
  description?: string
  properties?: Record<string, any>
  parent_id?: number
}

export interface CreateKnowledgeRelationRequest {
  from_node_id: number
  to_node_id: number
  relation_type: string
  properties?: Record<string, any>
}

// 用户管理相关API类型
export interface UpdateUserRequest {
  username?: string
  full_name?: string
  email?: string
  phone?: string
  bio?: string
  avatar?: File
}

export interface CreateUserRequest {
  email: string
  username: string
  password: string
  full_name?: string
  roles?: string[]
  is_active?: boolean
}

// 任务管理相关API类型
export interface CreateTaskRequest {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  assigned_to?: number
  tags?: string[]
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high'
  due_date?: string
  assigned_to?: number
  tags?: string[]
}

// 通用查询参数类型
export type ListParams<T = any> = PaginationParams & Partial<T>

// API响应类型别名
export type ApiResponseType<T> = Promise<ApiResponse<T>>
export type PaginatedApiResponse<T> = Promise<ApiResponse<PaginationResponse<T>>>

// 错误类型
export type ApiErrorType = ApiError & {
  status?: number
  statusText?: string
}