/**
 * Tenant Management Hook
 * 租户管理应用层逻辑
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Tenant, tenantAPI } from '@/services/api/tenants'
import { useAuth } from '@/stores/auth'

export function useTenantManagement() {
  const { userInfo: currentUser } = useAuth()
  const [currentTenantInfo, setCurrentTenantInfo] = useState<Tenant | null>(null)
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = useState(false)

  // 检查是否是超级管理员
  const isSuperAdmin = currentUser?.is_superuser || 
    currentUser?.roles?.includes('super_admin') || 
    currentUser?.roles?.includes('system_admin')

  // 获取可用租户列表
  const fetchAvailableTenants = useCallback(async () => {
    try {
      setLoadingTenants(true)
      const tenantsList = await tenantAPI.getTenants()
      setAvailableTenants(tenantsList)
      
      // 只在还没有租户信息时才自动设置
      if (tenantsList.length > 0 && !currentTenantInfo) {
        // 优先查找当前用户的租户
        const currentUserTenant = tenantsList.find(tenant => tenant.id === currentUser?.current_tenant_id)
        if (currentUserTenant) {
          setCurrentTenantInfo(currentUserTenant)
        } else {
          // 如果找不到当前用户租户，选择第一个可用租户
          setCurrentTenantInfo(tenantsList[0])
        }
      }
    } catch (_error) {
      toast.error('获取租户列表失败')
    } finally {
      setLoadingTenants(false)
    }
  }, [currentTenantInfo, currentUser?.current_tenant_id])

  // 处理租户切换
  const handleTenantSwitch = useCallback(async (tenant: Tenant) => {
    setCurrentTenantInfo(tenant)
    return tenant
  }, [])

  // 初始化租户数据
  useEffect(() => {
    if (isSuperAdmin) {
      fetchAvailableTenants()
    } else {
      // 对于非超级管理员，使用当前用户的租户信息
      if (currentUser?.current_tenant_id) {
        setCurrentTenantInfo({
          id: currentUser.current_tenant_id,
          name: '当前租户',
          display_name: '当前租户'
        } as Tenant)
      }
    }
  }, [isSuperAdmin, fetchAvailableTenants, currentUser?.current_tenant_id])

  return {
    currentTenantInfo,
    availableTenants,
    loadingTenants,
    isSuperAdmin,
    handleTenantSwitch,
    fetchAvailableTenants
  }
}