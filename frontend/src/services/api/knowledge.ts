/**
 * 知识管理API服务
 * 与其他API服务保持一致的组织结构
 */

import { http } from '../http'
import type {
  KnowledgeGraphData,
  KnowledgeGraphRequest,
  KnowledgeGraphResponse,
  Organization,
  OrganizationCreateRequest,
  OrganizationUpdateRequest,
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  KnowledgeSearchParams,
} from '@/features/knowledge/types'

// ==================== 知识图谱API ====================
export class KnowledgeGraphAPI {
  private static readonly BASE_PATH = '/v1/knowledge'

  /**
   * 获取知识图谱数据
   */
  static async getGraph(params?: KnowledgeGraphRequest): Promise<KnowledgeGraphData> {
    const response = await http.get<KnowledgeGraphResponse>(`${this.BASE_PATH}/graph`, { 
      params 
    })
    return response.data.data
  }

  /**
   * 搜索知识节点
   */
  static async searchNodes(params: KnowledgeSearchParams): Promise<KnowledgeGraphData> {
    const response = await http.get<{nodes: any[], total: number}>(`${this.BASE_PATH}/graph/search`, {
      params
    })
    // 搜索API返回的是SearchResponse，需要转换为GraphData格式
    return {
      nodes: response.data.nodes || [],
      links: []
    }
  }

  /**
   * 获取节点详情
   */
  static async getNodeDetails(nodeId: string): Promise<any> {
    const response = await http.get(`${this.BASE_PATH}/nodes/${nodeId}`)
    return response.data
  }

  /**
   * 获取节点关联信息
   */
  static async getNodeRelations(nodeId: string): Promise<KnowledgeGraphData> {
    const response = await http.get<KnowledgeGraphResponse>(`${this.BASE_PATH}/nodes/${nodeId}/relations`)
    return response.data.data
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