/**
 * Organization Data Management Hook
 * 组织数据管理应用层逻辑
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Organization, organizationAPI } from '@/services/api/organization'
import { Tenant } from '@/services/api/tenants'
import { OrganizationStats, OrganizationTreeNode } from '@/types/organization.types'

interface UseOrganizationDataProps {
  currentTenantInfo: Tenant | null
  isSuperAdmin: boolean
}

export function useOrganizationData({ currentTenantInfo, isSuperAdmin }: UseOrganizationDataProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // 获取组织数据
  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true)
      const params: { search?: string; tenant_id?: string } = { search: searchQuery }
      if (isSuperAdmin && currentTenantInfo) {
        params.tenant_id = currentTenantInfo.id
      }
      const data = await organizationAPI.getOrganizations(params)
      setOrganizations(data)
    } catch (_error) {
      toast.error('获取组织列表失败')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, isSuperAdmin, currentTenantInfo])

  // 组织数据改变时重新获取
  useEffect(() => {
    if (currentTenantInfo || !isSuperAdmin) {
      fetchOrganizations()
    }
  }, [fetchOrganizations, currentTenantInfo, isSuperAdmin])

  // 搜索功能
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrganizations()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, fetchOrganizations])

  // 构建层级树结构
  const organizationTree = useMemo(() => {
    const buildOrganizationTree = (organizations: Organization[], parentId: string | null = null): OrganizationTreeNode[] => {
      const children = organizations
        .filter(org => (org.parent_id || null) === parentId)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .map(org => ({
          ...org,
          children: buildOrganizationTree(organizations, org.id),
          expanded: true
        }))
      
      return children
    }

    return buildOrganizationTree(organizations)
  }, [organizations])

  // 计算统计信息
  const stats = useMemo((): OrganizationStats => {
    const totalOrganizations = organizations.length
    const departmentCount = organizations.filter(org => org.level === 1).length
    const teamCount = organizations.filter(org => org.level > 1).length
    const totalMembers = organizations.reduce((sum, org) => sum + (org.member_count || 0), 0)

    return {
      totalOrganizations,
      departmentCount,
      teamCount,
      totalMembers
    }
  }, [organizations])

  // 删除组织
  const deleteOrganization = useCallback(async (org: Organization) => {
    try {
      await organizationAPI.deleteOrganization(org.id)
      setOrganizations(prev => prev.filter(o => o.id !== org.id))
      toast.success(`组织 "${org.name}" 已移至回收站`)
      
      // 延迟刷新确保后端数据同步
      setTimeout(() => {
        fetchOrganizations()
      }, 500)
    } catch (error: any) {
      console.error('删除组织失败:', error)
      
      let errorMessage = '删除组织失败'
      
      // 根据HTTP状态码和错误信息提供更具体的错误提示
      if (error?.response?.status === 400) {
        const detail = error.response.data?.detail || ''
        console.log('后端错误详情:', detail)
        
        if (detail.includes('权限') || detail.includes('permission') || detail.includes('没有权限')) {
          errorMessage = `权限不足：您不是该组织的管理员。\n\n要删除组织，您需要：\n• 是系统超级管理员，或\n• 是该组织的管理员\n\n请联系系统管理员分配权限。`
        } else if (detail.includes('不存在')) {
          errorMessage = '组织不存在或已被删除'
        } else if (detail.includes('子组织') || detail.includes('children')) {
          errorMessage = '无法删除：该组织下还有子组织，请先删除或移动子组织'
        } else if (detail.includes('成员') || detail.includes('members')) {
          errorMessage = '无法删除：该组织下还有成员，请先移除所有成员'
        } else {
          errorMessage = `删除失败：${detail}\n\n可能的原因：\n• 权限不足\n• 组织下有子组织或成员\n• 组织正在被使用`
        }
      } else if (error?.response?.status === 403) {
        errorMessage = '权限不足：您没有删除此组织的权限，请联系管理员'
      } else if (error?.response?.status === 404) {
        errorMessage = '组织不存在或已被删除'
      } else if (error?.message) {
        errorMessage = `网络错误：${error.message}`
      }
      
      // 使用多行错误消息
      toast.error(errorMessage, {
        duration: 8000, // 显示8秒让用户有时间阅读
      })
      throw error
    }
  }, [fetchOrganizations])

  return {
    organizations,
    organizationTree,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    fetchOrganizations,
    deleteOrganization
  }
}