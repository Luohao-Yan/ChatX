/**
 * 部门管理Hook
 * 封装部门数据的CRUD操作
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DepartmentService } from '../services'
import type {
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
} from '../types'

export interface UseDepartmentsOptions {
  organizationId?: string
}

export interface UseDepartmentsResult {
  // 数据状态
  departments: Department[]
  departmentTree: Department[]
  loading: boolean
  error: Error | null
  
  // 操作方法
  createDepartment: (data: DepartmentCreateRequest) => Promise<Department>
  updateDepartment: (id: string, data: DepartmentUpdateRequest) => Promise<Department>
  deleteDepartment: (id: string) => Promise<void>
  getDepartment: (id: string) => Promise<Department>
  getDepartmentStats: (id: string) => Promise<any>
  refreshData: () => void
}

export const useDepartments = (options: UseDepartmentsOptions = {}): UseDepartmentsResult => {
  const { organizationId } = options
  const queryClient = useQueryClient()

  // 获取部门列表
  const {
    data: departments = [],
    isLoading: listLoading,
    error: listError,
    refetch: refetchList
  } = useQuery({
    queryKey: ['departments', organizationId],
    queryFn: () => DepartmentService.getDepartments(organizationId),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // 获取部门树
  const {
    data: departmentTree = [],
    isLoading: treeLoading,
    error: treeError,
    refetch: refetchTree
  } = useQuery({
    queryKey: ['departments-tree', organizationId],
    queryFn: () => DepartmentService.getDepartmentTree(organizationId),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // 创建部门
  const createMutation = useMutation({
    mutationFn: DepartmentService.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      queryClient.invalidateQueries({ queryKey: ['departments-tree'] })
      toast.success('部门创建成功')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || '创建失败'
      toast.error(errorMessage)
    }
  })

  // 更新部门
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentUpdateRequest }) =>
      DepartmentService.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      queryClient.invalidateQueries({ queryKey: ['departments-tree'] })
      toast.success('部门更新成功')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || '更新失败'
      toast.error(errorMessage)
    }
  })

  // 删除部门
  const deleteMutation = useMutation({
    mutationFn: DepartmentService.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      queryClient.invalidateQueries({ queryKey: ['departments-tree'] })
      toast.success('部门删除成功')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || '删除失败'
      toast.error(errorMessage)
    }
  })

  // 获取单个部门详情
  const getDepartment = async (id: string): Promise<Department> => {
    try {
      return await DepartmentService.getDepartmentById(id)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || '获取部门详情失败'
      toast.error(errorMessage)
      throw error
    }
  }

  // 获取部门统计信息
  const getDepartmentStats = async (_id: string): Promise<any> => {
    try {
      // TODO: DepartmentService needs to implement getStats
      throw new Error('部门统计功能暂未实现')
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || '获取部门统计失败'
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
    departments,
    departmentTree,
    loading: listLoading || treeLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: (listError || treeError) as Error | null,
    createDepartment: createMutation.mutateAsync,
    updateDepartment: (id: string, data: DepartmentUpdateRequest) =>
      updateMutation.mutateAsync({ id, data }),
    deleteDepartment: deleteMutation.mutateAsync,
    getDepartment,
    getDepartmentStats,
    refreshData,
  }
}