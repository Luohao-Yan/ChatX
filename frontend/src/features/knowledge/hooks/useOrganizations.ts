/**
 * 组织机构管理Hook
 * 封装组织机构数据的CRUD操作
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { OrganizationAPI } from '@/services/api/knowledge'
import type {
  Organization,
  OrganizationCreateRequest,
  OrganizationUpdateRequest,
} from '../types'

export interface UseOrganizationsResult {
  // 数据状态
  organizations: Organization[]
  organizationTree: Organization[]
  loading: boolean
  error: Error | null
  
  // 操作方法
  createOrganization: (data: OrganizationCreateRequest) => Promise<Organization>
  updateOrganization: (id: string, data: OrganizationUpdateRequest) => Promise<Organization>
  deleteOrganization: (id: string) => Promise<void>
  getOrganization: (id: string) => Promise<Organization>
  refreshData: () => void
}

export const useOrganizations = (): UseOrganizationsResult => {
  const queryClient = useQueryClient()

  // 获取组织机构列表
  const {
    data: organizations = [],
    isLoading: listLoading,
    error: listError,
    refetch: refetchList
  } = useQuery({
    queryKey: ['organizations'],
    queryFn: OrganizationAPI.getList,
  })

  // 获取组织机构树
  const {
    data: organizationTree = [],
    isLoading: treeLoading,
    error: treeError,
    refetch: refetchTree
  } = useQuery({
    queryKey: ['organizations-tree'],
    queryFn: OrganizationAPI.getTree,
  })

  // 创建组织机构
  const createMutation = useMutation({
    mutationFn: OrganizationAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['organizations-tree'] })
      toast.success('组织机构创建成功')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || '创建失败'
      toast.error(errorMessage)
    }
  })

  // 更新组织机构
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrganizationUpdateRequest }) =>
      OrganizationAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['organizations-tree'] })
      toast.success('组织机构更新成功')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || '更新失败'
      toast.error(errorMessage)
    }
  })

  // 删除组织机构
  const deleteMutation = useMutation({
    mutationFn: OrganizationAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['organizations-tree'] })
      toast.success('组织机构删除成功')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || '删除失败'
      toast.error(errorMessage)
    }
  })

  // 获取单个组织机构详情
  const getOrganization = async (id: string): Promise<Organization> => {
    try {
      return await OrganizationAPI.getById(id)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || '获取组织机构详情失败'
      toast.error(errorMessage)
      throw error
    }
  }

  // 刷新数据
  const refreshData = () => {
    refetchList()
    refetchTree()
  }

  return {
    organizations,
    organizationTree,
    loading: listLoading || treeLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: (listError || treeError) as Error | null,
    createOrganization: createMutation.mutateAsync,
    updateOrganization: (id: string, data: OrganizationUpdateRequest) =>
      updateMutation.mutateAsync({ id, data }),
    deleteOrganization: deleteMutation.mutateAsync,
    getOrganization,
    refreshData,
  }
}