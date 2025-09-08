/**
 * 知识图谱API服务
 * 与后端知识图谱API接口对应
 */

import { http } from '../http'
import type {
  KnowledgeGraphData,
  KnowledgeGraphRequest,
  KnowledgeGraphResponse,
  KnowledgeNode,
  KnowledgeNodeType,
  Organization,
  OrganizationCreateRequest,
  OrganizationUpdateRequest,
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  KnowledgeSearchParams,
} from '@/features/knowledge/types'

// ==================== 额外类型定义 ====================

export interface KnowledgeSearchRequest {
  query: string
  node_types?: KnowledgeNodeType[]
  limit?: number
}

export interface KnowledgeSearchResponse {
  nodes: KnowledgeNode[]
  total: number
}

export interface NodeRelationsRequest {
  node_id: string
  depth?: number
}

export interface NodeRelationsResponse {
  center_node: KnowledgeNode
  related_data: KnowledgeGraphData
}

export interface KnowledgeGraphStats {
  total_nodes: number
  total_links: number
  node_types: { type: KnowledgeNodeType; count: number }[]
}

// ==================== 知识图谱API ====================
export class KnowledgeGraphAPI {
  private static readonly BASE_PATH = '/v1/knowledge'

  /**
   * 获取知识图谱数据
   */
  static async getGraph(params?: KnowledgeGraphRequest): Promise<KnowledgeGraphData> {
    const queryParams = new URLSearchParams()
    
    if (params?.nodeTypes) {
      params.nodeTypes.forEach(type => queryParams.append('node_types', type))
    }
    if (params?.searchQuery) {
      queryParams.append('search_query', params.searchQuery)
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString())
    }

    const url = `${this.BASE_PATH}/graph${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await http.get<KnowledgeGraphResponse>(url)
    return response.data.data
  }

  /**
   * 搜索知识节点
   */
  static async searchNodes(params: KnowledgeSearchParams): Promise<KnowledgeSearchResponse> {
    const queryParams = new URLSearchParams()
    
    if (params.query) {
      queryParams.append('query', params.query)
    }
    if (params.nodeTypes) {
      params.nodeTypes.forEach(type => queryParams.append('node_types', type))
    }
    if (params.pageSize) {
      queryParams.append('limit', params.pageSize.toString())
    }

    const response = await http.get<KnowledgeSearchResponse>(
      `${this.BASE_PATH}/graph/search?${queryParams.toString()}`
    )
    return response.data
  }

  /**
   * 获取节点关系网络
   */
  static async getNodeRelations(nodeId: string, depth: number = 1): Promise<NodeRelationsResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('depth', depth.toString())

    const response = await http.get<NodeRelationsResponse>(
      `${this.BASE_PATH}/graph/nodes/${nodeId}/relations?${queryParams.toString()}`
    )
    return response.data
  }

  /**
   * 获取知识图谱统计信息
   */
  static async getGraphStats(): Promise<KnowledgeGraphStats> {
    const response = await http.get<KnowledgeGraphStats>(`${this.BASE_PATH}/graph/stats`)
    return response.data
  }

  /**
   * 获取节点详情 (已弃用，使用 getNodeRelations 替代)
   */
  static async getNodeDetails(nodeId: string): Promise<any> {
    const response = await http.get(`${this.BASE_PATH}/nodes/${nodeId}`)
    return response.data
  }
}

// ==================== 组织机构API ====================
export class OrganizationAPI {
  private static readonly BASE_PATH = '/v1/knowledge/organizations'

  /**
   * 获取组织机构列表
   */
  static async getList(): Promise<Organization[]> {
    const response = await http.get<Organization[]>(this.BASE_PATH)
    return response.data
  }

  /**
   * 获取组织机构树形结构
   */
  static async getTree(): Promise<Organization[]> {
    const response = await http.get<Organization[]>(`${this.BASE_PATH}/tree`)
    return response.data
  }

  /**
   * 创建组织机构
   */
  static async create(data: OrganizationCreateRequest): Promise<Organization> {
    const response = await http.post<Organization>(this.BASE_PATH, data)
    return response.data
  }

  /**
   * 更新组织机构
   */
  static async update(id: string, data: OrganizationUpdateRequest): Promise<Organization> {
    const response = await http.put<Organization>(`${this.BASE_PATH}/${id}`, data)
    return response.data
  }

  /**
   * 删除组织机构
   */
  static async delete(id: string): Promise<void> {
    await http.delete(`${this.BASE_PATH}/${id}`)
  }

  /**
   * 获取组织机构详情
   */
  static async getById(id: string): Promise<Organization> {
    const response = await http.get<Organization>(`${this.BASE_PATH}/${id}`)
    return response.data
  }
}

// ==================== 部门管理API ====================
export class DepartmentAPI {
  private static readonly BASE_PATH = '/v1/knowledge/departments'

  /**
   * 获取部门列表
   */
  static async getList(organizationId?: string): Promise<Department[]> {
    const response = await http.get<Department[]>(this.BASE_PATH, {
      params: { organizationId }
    })
    return response.data
  }

  /**
   * 获取部门树形结构
   */
  static async getTree(organizationId?: string): Promise<Department[]> {
    const response = await http.get<Department[]>(`${this.BASE_PATH}/tree`, {
      params: { organizationId }
    })
    return response.data
  }

  /**
   * 创建部门
   */
  static async create(data: DepartmentCreateRequest): Promise<Department> {
    const response = await http.post<Department>(this.BASE_PATH, data)
    return response.data
  }

  /**
   * 更新部门
   */
  static async update(id: string, data: DepartmentUpdateRequest): Promise<Department> {
    const response = await http.put<Department>(`${this.BASE_PATH}/${id}`, data)
    return response.data
  }

  /**
   * 删除部门
   */
  static async delete(id: string): Promise<void> {
    await http.delete(`${this.BASE_PATH}/${id}`)
  }

  /**
   * 获取部门详情
   */
  static async getById(id: string): Promise<Department> {
    const response = await http.get<Department>(`${this.BASE_PATH}/${id}`)
    return response.data
  }

  /**
   * 获取部门统计信息
   */
  static async getStats(id: string): Promise<any> {
    const response = await http.get(`${this.BASE_PATH}/${id}/stats`)
    return response.data
  }
}

export default {
  KnowledgeGraphAPI,
  OrganizationAPI,
  DepartmentAPI,
}