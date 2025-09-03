/**
 * 知识图谱数据管理Hook
 * 封装图谱数据获取、搜索、筛选等逻辑
 */

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KnowledgeGraphAPI } from '@/services/api/knowledge'
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
  stats: {
    totalNodes: number
    totalLinks: number
    filteredNodes: number
    filteredLinks: number
    nodeTypes: number
  }
  
  // 操作方法
  loadGraphData: () => Promise<void>
  searchNodes: (query: string) => Promise<void>
  applyFilters: () => void
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
  const [filteredData, setFilteredData] = useState<KnowledgeGraphData>({ nodes: [], links: [] })
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
    queryFn: () => KnowledgeGraphAPI.getGraph(),
    enabled: autoLoad,
  })

  // 搜索节点
  const searchMutation = useMutation({
    mutationFn: (params: KnowledgeSearchParams) => KnowledgeGraphAPI.searchNodes(params),
    onSuccess: (data) => {
      queryClient.setQueryData(['knowledge-graph'], data)
      toast.success('搜索完成')
    },
    onError: () => {
      toast.error('搜索失败')
    }
  })

  // 应用筛选逻辑
  const applyFilters = useCallback(() => {
    let filteredNodes = graphData.nodes

    // 按搜索查询筛选
    if (filterState.searchQuery.trim()) {
      const query = filterState.searchQuery.toLowerCase()
      filteredNodes = filteredNodes.filter(node =>
        node.name.toLowerCase().includes(query) ||
        (node.description && node.description.toLowerCase().includes(query))
      )
    }

    // 按节点类型筛选
    if (filterState.selectedNodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        filterState.selectedNodeTypes.includes(node.type)
      )
    }

    // 按组织筛选
    if (filterState.selectedOrganization) {
      filteredNodes = filteredNodes.filter(node =>
        node.properties?.organizationId === filterState.selectedOrganization
      )
    }

    // 按部门筛选
    if (filterState.selectedDepartment) {
      filteredNodes = filteredNodes.filter(node =>
        node.properties?.departmentId === filterState.selectedDepartment
      )
    }

    // 筛选相关连接
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id))
    const filteredLinks = graphData.links.filter(link =>
      filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
    )

    setFilteredData({
      nodes: filteredNodes,
      links: filteredLinks
    })
  }, [graphData, filterState])

  // 监听数据和筛选条件变化
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

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
  }, [searchMutateAsync, filterState])

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

  // 计算统计信息
  const stats = {
    totalNodes: graphData.nodes.length,
    totalLinks: graphData.links.length,
    filteredNodes: filteredData.nodes.length,
    filteredLinks: filteredData.links.length,
    nodeTypes: [...new Set(graphData.nodes.map(n => n.type))].length
  }

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
    applyFilters,
    setSearchQuery,
    setNodeTypeFilter,
    setSelectedNode,
    clearFilters,
    refreshData,
  }
}