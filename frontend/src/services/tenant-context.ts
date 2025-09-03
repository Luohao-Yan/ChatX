/**
 * 租户上下文管理器
 * 用于超级管理员切换租户时，管理目标租户上下文
 */

export class TenantContextManager {
  private static instance: TenantContextManager
  private targetTenantId: string | null = null

  static getInstance(): TenantContextManager {
    if (!TenantContextManager.instance) {
      TenantContextManager.instance = new TenantContextManager()
    }
    return TenantContextManager.instance
  }

  /**
   * 设置目标租户ID（超级管理员切换租户时使用）
   */
  setTargetTenantId(tenantId: string | null): void {
    this.targetTenantId = tenantId
    console.log('[TenantContext] 设置目标租户ID:', tenantId)
  }

  /**
   * 获取目标租户ID
   */
  getTargetTenantId(): string | null {
    return this.targetTenantId
  }

  /**
   * 清除目标租户ID
   */
  clearTargetTenantId(): void {
    this.targetTenantId = null
    console.log('[TenantContext] 清除目标租户ID')
  }

  /**
   * 检查是否设置了目标租户
   */
  hasTargetTenant(): boolean {
    return this.targetTenantId !== null
  }
}

// 导出单例实例
export const tenantContext = TenantContextManager.getInstance()