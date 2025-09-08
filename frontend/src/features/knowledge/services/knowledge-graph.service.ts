/**
 * 知识图谱领域服务
 * 封装知识图谱相关的业务逻辑，提供给应用服务层使用
 */

import { KnowledgeGraphAPI } from '@/services/api/knowledge'
import {
  KnowledgeGraphData,
  KnowledgeNode,
  KnowledgeNodeType,
  KnowledgeLinkType,
  KnowledgeSearchParams,
} from '../types'

export interface GraphStats {
  totalNodes: number
  totalLinks: number
  filteredNodes: number
  filteredLinks: number
  nodeTypes: number
}

export interface GraphFilterOptions {
  searchQuery?: string
  nodeTypes?: KnowledgeNodeType[]
  organizationId?: string
  departmentId?: string
}

/**
 * 知识图谱领域服务类
 * 处理图谱数据的获取、过滤、搜索等业务逻辑
 */
export class KnowledgeGraphService {
  
  /**
   * 获取完整的知识图谱数据
   */
  static async getGraphData(): Promise<KnowledgeGraphData> {
    try {
      return await KnowledgeGraphAPI.getGraph()
    } catch (error) {
      console.error('Failed to load graph data:', error)
      throw new Error('知识图谱加载失败')
    }
  }

  /**
   * 搜索知识节点
   */
  static async searchNodes(params: KnowledgeSearchParams): Promise<KnowledgeNode[]> {
    try {
      const result = await KnowledgeGraphAPI.searchNodes(params)
      return result.nodes
    } catch (error) {
      console.error('Failed to search nodes:', error)
      throw new Error('节点搜索失败')
    }
  }

  /**
   * 获取节点关联图谱
   */
  static async getNodeRelations(nodeId: string, depth: number = 1): Promise<KnowledgeGraphData> {
    try {
      const result = await KnowledgeGraphAPI.getNodeRelations(nodeId, depth)
      return result.related_data
    } catch (error) {
      console.error('Failed to get node relations:', error)
      throw new Error('节点关系获取失败')
    }
  }

  /**
   * 应用本地过滤器到图谱数据
   */
  static applyFilters(
    graphData: KnowledgeGraphData,
    filters: GraphFilterOptions
  ): KnowledgeGraphData {
    let filteredNodes = [...graphData.nodes]

    // 搜索查询过滤
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase()
      filteredNodes = filteredNodes.filter(node =>
        node.name.toLowerCase().includes(query) ||
        (node.description && node.description.toLowerCase().includes(query))
      )
    }

    // 节点类型过滤
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        filters.nodeTypes!.includes(node.type)
      )
    }

    // 组织过滤
    if (filters.organizationId) {
      filteredNodes = filteredNodes.filter(node =>
        node.properties?.organizationId === filters.organizationId
      )
    }

    // 部门过滤
    if (filters.departmentId) {
      filteredNodes = filteredNodes.filter(node =>
        node.properties?.departmentId === filters.departmentId
      )
    }

    // 过滤相关连接
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id))
    const filteredLinks = graphData.links.filter(link =>
      filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
    )

    return {
      nodes: filteredNodes,
      links: filteredLinks
    }
  }

  /**
   * 计算图谱统计信息
   */
  static calculateStats(
    originalData: KnowledgeGraphData,
    filteredData: KnowledgeGraphData
  ): GraphStats {
    const nodeTypeSet = new Set(originalData.nodes.map(n => n.type))
    
    return {
      totalNodes: originalData.nodes.length,
      totalLinks: originalData.links.length,
      filteredNodes: filteredData.nodes.length,
      filteredLinks: filteredData.links.length,
      nodeTypes: nodeTypeSet.size,
    }
  }

  /**
   * 获取节点类型显示名称
   */
  static getNodeTypeDisplayName(type: KnowledgeNodeType): string {
    const typeNames: Record<KnowledgeNodeType, string> = {
      [KnowledgeNodeType.DOCUMENT]: '文档',
      [KnowledgeNodeType.CONCEPT]: '概念',
      [KnowledgeNodeType.PERSON]: '人员',
      [KnowledgeNodeType.ORGANIZATION]: '组织',
      [KnowledgeNodeType.DEPARTMENT]: '部门',
      [KnowledgeNodeType.TOPIC]: '主题',
      [KnowledgeNodeType.TAG]: '标签',
      [KnowledgeNodeType.WEBSITE]: '网站',
      [KnowledgeNodeType.WECHAT_ARTICLE]: '微信文章',
    }
    return typeNames[type] || type
  }

  /**
   * 获取链接类型显示名称
   */
  static getLinkTypeDisplayName(type: KnowledgeLinkType): string {
    const linkNames: Record<KnowledgeLinkType, string> = {
      [KnowledgeLinkType.RELATED_TO]: '相关',
      [KnowledgeLinkType.BELONGS_TO]: '属于',
      [KnowledgeLinkType.CONTAINS]: '包含',
      [KnowledgeLinkType.REFERENCES]: '引用',
      [KnowledgeLinkType.SIMILAR_TO]: '相似',
      [KnowledgeLinkType.CREATED_BY]: '创建者',
      [KnowledgeLinkType.TAGGED_WITH]: '标记',
      [KnowledgeLinkType.PART_OF]: '部分',
    }
    return linkNames[type] || type
  }

  /**
   * 获取节点颜色主题
   */
  static getNodeColor(type: KnowledgeNodeType): string {
    const colorMap: Record<KnowledgeNodeType, string> = {
      [KnowledgeNodeType.DOCUMENT]: '#3b82f6',      // blue
      [KnowledgeNodeType.CONCEPT]: '#10b981',       // emerald
      [KnowledgeNodeType.PERSON]: '#f59e0b',        // amber
      [KnowledgeNodeType.ORGANIZATION]: '#ef4444',  // red
      [KnowledgeNodeType.DEPARTMENT]: '#8b5cf6',    // violet
      [KnowledgeNodeType.TOPIC]: '#06b6d4',         // cyan
      [KnowledgeNodeType.TAG]: '#84cc16',           // lime
      [KnowledgeNodeType.WEBSITE]: '#f97316',       // orange
      [KnowledgeNodeType.WECHAT_ARTICLE]: '#22c55e', // green
    }
    return colorMap[type] || '#6b7280' // gray as default
  }
}

export default KnowledgeGraphService