/**
 * 系统配置API服务
 * 与其他API服务保持一致的组织结构
 */

import { http } from '../http'

// ==================== 类型定义 ====================

export interface SystemLogo {
  id: string
  name: string
  url: string
  type: 'default' | 'custom'
  isActive: boolean
  uploadedAt?: string
  size?: number
  fileType?: string
  thumbnailUrl?: string
}

export interface SystemConfig {
  id: string
  key: string
  value: any
  description?: string
  category: string
  isPublic: boolean
  updatedAt: string
  updatedBy: string
}

export interface LogoUploadRequest {
  file: File
  name?: string
  description?: string
}

export interface LogoUploadResponse {
  id: string
  name: string
  url: string
  thumbnailUrl?: string
  size: number
  fileType: string
  uploadedAt: string
}

export interface SystemConfigUpdateRequest {
  key: string
  value: any
  description?: string
}

export interface SystemConfigBatchUpdateRequest {
  configs: SystemConfigUpdateRequest[]
}

// ==================== API服务类 ====================

export class SystemConfigAPI {
  private static readonly BASE_PATH = '/v1/system/config'
  private static readonly LOGO_PATH = '/v1/system/logos'

  /**
   * 获取系统配置列表
   */
  static async getConfigs(params?: {
    category?: string
    isPublic?: boolean
    keys?: string[]
  }): Promise<SystemConfig[]> {
    const response = await http.get<SystemConfig[]>(this.BASE_PATH, { params })
    return response.data
  }

  /**
   * 获取单个系统配置
   */
  static async getConfig(key: string): Promise<SystemConfig> {
    const response = await http.get<SystemConfig>(`${this.BASE_PATH}/${key}`)
    return response.data
  }

  /**
   * 更新系统配置
   */
  static async updateConfig(key: string, data: Partial<SystemConfigUpdateRequest>): Promise<SystemConfig> {
    const response = await http.put<SystemConfig>(`${this.BASE_PATH}/${key}`, data)
    return response.data
  }

  /**
   * 批量更新系统配置
   */
  static async batchUpdateConfigs(data: SystemConfigBatchUpdateRequest): Promise<SystemConfig[]> {
    const response = await http.post<SystemConfig[]>(`${this.BASE_PATH}/batch`, data)
    return response.data
  }

  /**
   * 获取系统图标列表
   */
  static async getLogos(): Promise<SystemLogo[]> {
    const response = await http.get<SystemLogo[]>(this.LOGO_PATH)
    return response.data
  }

  /**
   * 上传系统图标
   */
  static async uploadLogo(data: LogoUploadRequest): Promise<LogoUploadResponse> {
    const formData = new FormData()
    formData.append('file', data.file)
    
    if (data.name) {
      formData.append('name', data.name)
    }
    
    if (data.description) {
      formData.append('description', data.description)
    }

    const response = await http.post<LogoUploadResponse>(
      this.LOGO_PATH, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  /**
   * 设置当前系统图标
   */
  static async setActiveLogo(logoId: string): Promise<void> {
    await http.post<void>(`${this.LOGO_PATH}/${logoId}/activate`)
  }

  /**
   * 删除自定义图标
   */
  static async deleteLogo(logoId: string): Promise<void> {
    await http.delete<void>(`${this.LOGO_PATH}/${logoId}`)
  }

  /**
   * 获取当前活跃的系统图标
   */
  static async getActiveLogo(): Promise<SystemLogo> {
    const response = await http.get<SystemLogo>(`${this.LOGO_PATH}/active`)
    return response.data
  }

  /**
   * 重置为默认图标
   */
  static async resetToDefaultLogo(): Promise<void> {
    await http.post<void>(`${this.LOGO_PATH}/reset-default`)
  }

  /**
   * 获取系统信息
   */
  static async getSystemInfo(): Promise<{
    version: string
    buildTime: string
    environment: string
    uptime: number
    resources: {
      cpu: number
      memory: number
      disk: number
    }
  }> {
    const response = await http.get('/v1/system/info')
    return response.data
  }

  /**
   * 清理临时文件
   */
  static async cleanupTempFiles(): Promise<{
    deletedCount: number
    freedSpace: number
  }> {
    const response = await http.post('/v1/system/cleanup')
    return response.data
  }

  /**
   * 导出系统配置
   */
  static async exportConfig(): Promise<Blob> {
    const response = await http.get(`${this.BASE_PATH}/export`, {
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * 导入系统配置
   */
  static async importConfig(file: File): Promise<{
    imported: number
    skipped: number
    errors: string[]
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await http.post(`${this.BASE_PATH}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }
}

export default SystemConfigAPI

// ==================== 常用配置键常量 ====================

export const SYSTEM_CONFIG_KEYS = {
  // 系统外观
  SYSTEM_LOGO: 'system.logo.current',
  SYSTEM_NAME: 'system.name',
  SYSTEM_DESCRIPTION: 'system.description',
  THEME_PRIMARY_COLOR: 'theme.primary_color',
  THEME_DARK_MODE_DEFAULT: 'theme.dark_mode_default',

  // 功能开关
  FEATURE_USER_REGISTRATION: 'feature.user_registration',
  FEATURE_FILE_UPLOAD: 'feature.file_upload',
  FEATURE_EMAIL_VERIFICATION: 'feature.email_verification',

  // 安全设置
  SECURITY_SESSION_TIMEOUT: 'security.session_timeout',
  SECURITY_MAX_LOGIN_ATTEMPTS: 'security.max_login_attempts',
  SECURITY_PASSWORD_MIN_LENGTH: 'security.password_min_length',

  // 文件上传限制
  FILE_MAX_SIZE: 'file.max_size',
  FILE_ALLOWED_TYPES: 'file.allowed_types',
  FILE_STORAGE_PATH: 'file.storage_path',

  // 邮件配置
  EMAIL_SMTP_HOST: 'email.smtp_host',
  EMAIL_SMTP_PORT: 'email.smtp_port',
  EMAIL_FROM_ADDRESS: 'email.from_address',

  // 其他
  SYSTEM_TIMEZONE: 'system.timezone',
  SYSTEM_LANGUAGE: 'system.language',
  MAINTENANCE_MODE: 'system.maintenance_mode',
} as const

export type SystemConfigKey = typeof SYSTEM_CONFIG_KEYS[keyof typeof SYSTEM_CONFIG_KEYS]