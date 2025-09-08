/**
 * 知识图谱数据管理Hook
 * 封装图谱数据获取、搜索、筛选等逻辑
 */

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KnowledgeGraphService, type GraphStats, type GraphFilterOptions } from '../services'
import type {
  KnowledgeGraphData,
  KnowledgeNode,
  KnowledgeNodeType,
  KnowledgeSearchParams,
  GraphFilterState,
} from '../types'

export interface UseKnowledgeGraphOptions {
  initialSearchParams?: KnowledgeSearchParams
  autoLoad?: boolean
}

export interface UseKnowledgeGraphResult {
  // 数据状态
  graphData: KnowledgeGraphData
  filteredData: KnowledgeGraphData
  loading: boolean
  error: Error | null
  
  // 筛选状态
  filterState: GraphFilterState
  
  // 选中节点
  selectedNode: KnowledgeNode | null
  
  // 统计信息
  stats: GraphStats
  
  // 操作方法
  loadGraphData: () => Promise<void>
  searchNodes: (query: string) => Promise<void>
  setSearchQuery: (query: string) => void
  setNodeTypeFilter: (types: KnowledgeNodeType[]) => void
  setSelectedNode: (node: KnowledgeNode | null) => void
  clearFilters: () => void
  refreshData: () => void
}

export const useKnowledgeGraph = (
  options: UseKnowledgeGraphOptions = {}
): UseKnowledgeGraphResult => {
  const { initialSearchParams = {}, autoLoad = true } = options
  const queryClient = useQueryClient()

  // 状态管理
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  const [filterState, setFilterState] = useState<GraphFilterState>({
    searchQuery: initialSearchParams.query || '',
    selectedNodeTypes: initialSearchParams.nodeTypes || [],
    selectedOrganization: initialSearchParams.organizationId,
    selectedDepartment: initialSearchParams.departmentId,
  })

  // 获取图谱数据
  const {
    data: graphData = { nodes: [], links: [] },
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['knowledge-graph'],
    queryFn: () => KnowledgeGraphService.getGraphData(),
    enabled: autoLoad,
  })

  // 搜索节点
  const searchMutation = useMutation({
    mutationFn: (params: KnowledgeSearchParams) => KnowledgeGraphService.searchNodes(params),
    onSuccess: (nodes) => {
      // 构建搜索结果的图谱数据
      const searchGraphData = { nodes, links: [] }
      queryClient.setQueryData(['knowledge-graph'], searchGraphData)
      toast.success('搜索完成')
    },
    onError: () => {
      toast.error('搜索失败')
    }
  })

  // 应用筛选逻辑 - 使用领域服务处理
  const filteredData = useMemo(() => {
    const filters: GraphFilterOptions = {
      searchQuery: filterState.searchQuery,
      nodeTypes: filterState.selectedNodeTypes,
      organizationId: filterState.selectedOrganization,
      departmentId: filterState.selectedDepartment,
    }
    return KnowledgeGraphService.applyFilters(graphData, filters)
  }, [graphData, filterState])

  // 移除useEffect，filteredData现在由useMemo自动计算

  // 操作方法
  const loadGraphData = useCallback(async () => {
    try {
      await refetch()
      toast.success('知识图谱加载成功')
    } catch (_error) {
      toast.error('加载知识图谱失败')
    }
  }, [refetch])

  const { mutateAsync: searchMutateAsync } = searchMutation

  const searchNodes = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFilterState(prev => ({ ...prev, searchQuery: '' }))
      return
    }

    setFilterState(prev => ({ ...prev, searchQuery: query }))
    
    try {
      await searchMutateAsync({
        query,
        nodeTypes: filterState.selectedNodeTypes,
        organizationId: filterState.selectedOrganization,
        departmentId: filterState.selectedDepartment,
      })
    } catch (_error) {
      // Error already handled in mutation
    }
  }, [searchMutateAsync])

  const setSearchQuery = useCallback((query: string) => {
    setFilterState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  const setNodeTypeFilter = useCallback((types: KnowledgeNodeType[]) => {
    setFilterState(prev => ({ ...prev, selectedNodeTypes: types }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilterState({
      searchQuery: '',
      selectedNodeTypes: [],
      selectedOrganization: undefined,
      selectedDepartment: undefined,
    })
    setSelectedNode(null)
  }, [])

  const refreshData = useCallback(() => {
    refetch()
  }, [refetch])

  // 计算统计信息 - 使用领域服务计算
  const stats = useMemo(() => 
    KnowledgeGraphService.calculateStats(graphData, filteredData),
    [graphData, filteredData]
  )

  return {
    graphData,
    filteredData,
    loading: loading || searchMutation.isPending,
    error: error as Error | null,
    filterState,
    selectedNode,
    stats,
    loadGraphData,
    searchNodes,
    setSearchQuery,
    setNodeTypeFilter,
    setSelectedNode,
    clearFilters,
    refreshData,
  }
}