/**
 * 组织管理领域服务
 * 封装组织机构相关的业务逻辑
 */

import { OrganizationAPI } from '@/services/api/knowledge'
import {
  Organization,
  OrganizationCreateRequest,
  OrganizationUpdateRequest,
  OrganizationType,
} from '../types'

/**
 * 组织管理领域服务类
 */
export class OrganizationService {
  
  /**
   * 获取组织机构列表
   */
  static async getOrganizations(): Promise<Organization[]> {
    try {
      const result = await OrganizationAPI.getList()
      if (!Array.isArray(result)) {
        console.warn('Organizations API returned non-array:', result)
        return []
      }
      return result
    } catch (error) {
      console.error('Failed to load organizations:', error)
      // 返回空数组而不是抛出错误，避免无限重试
      return []
    }
  }

  /**
   * 获取组织机构树形结构
   */
  static async getOrganizationTree(): Promise<Organization[]> {
    try {
      const result = await OrganizationAPI.getTree()
      if (!Array.isArray(result)) {
        console.warn('Organization tree API returned non-array:', result)
        return []
      }
      return result
    } catch (error) {
      console.error('Failed to load organization tree:', error)
      // 返回空数组而不是抛出错误，避免无限重试
      return []
    }
  }

  /**
   * 创建组织机构
   */
  static async createOrganization(data: OrganizationCreateRequest): Promise<Organization> {
    try {
      const result = await OrganizationAPI.create(data)
      return result
    } catch (error) {
      console.error('Failed to create organization:', error)
      throw new Error('创建组织机构失败')
    }
  }

  /**
   * 更新组织机构
   */
  static async updateOrganization(id: string, data: OrganizationUpdateRequest): Promise<Organization> {
    try {
      return await OrganizationAPI.update(id, data)
    } catch (error) {
      console.error('Failed to update organization:', error)
      throw new Error('更新组织机构失败')
    }
  }

  /**
   * 删除组织机构
   */
  static async deleteOrganization(id: string): Promise<void> {
    try {
      await OrganizationAPI.delete(id)
    } catch (error) {
      console.error('Failed to delete organization:', error)
      throw new Error('删除组织机构失败')
    }
  }

  /**
   * 获取组织机构详情
   */
  static async getOrganizationById(id: string): Promise<Organization> {
    try {
      return await OrganizationAPI.getById(id)
    } catch (error) {
      console.error('Failed to get organization:', error)
      throw new Error('获取组织机构详情失败')
    }
  }

  /**
   * 构建组织机构树形结构
   */
  static buildOrganizationTree(organizations: Organization[]): Organization[] {
    const orgMap = new Map<string, Organization>()
    const rootOrgs: Organization[] = []

    // 创建映射和添加children数组
    organizations.forEach(org => {
      orgMap.set(org.id, { ...org, children: [] })
    })

    // 构建树形结构
    orgMap.forEach(org => {
      if (org.parentId && orgMap.has(org.parentId)) {
        const parent = orgMap.get(org.parentId)!
        parent.children!.push(org)
      } else {
        rootOrgs.push(org)
      }
    })

    return rootOrgs
  }

  /**
   * 扁平化组织树
   */
  static flattenOrganizationTree(organizations: Organization[]): (Organization & { level?: number })[] {
    const result: (Organization & { level?: number })[] = []
    
    const flatten = (orgs: Organization[], level: number = 0) => {
      orgs.forEach(org => {
        result.push({ ...org, level })
        if (org.children && org.children.length > 0) {
          flatten(org.children, level + 1)
        }
      })
    }
    
    flatten(organizations)
    return result
  }

  /**
   * 获取组织类型显示名称
   */
  static getOrganizationTypeDisplayName(type: OrganizationType): string {
    const typeNames: Record<OrganizationType, string> = {
      [OrganizationType.COMPANY]: '公司',
      [OrganizationType.DEPARTMENT]: '部门',
      [OrganizationType.TEAM]: '团队',
      [OrganizationType.GROUP]: '小组',
    }
    return typeNames[type] || type
  }

  /**
   * 验证组织数据
   */
  static validateOrganizationData(data: OrganizationCreateRequest): string[] {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('组织名称不能为空')
    }

    if (data.name && data.name.trim().length > 100) {
      errors.push('组织名称不能超过100个字符')
    }

    if (data.description && data.description.length > 500) {
      errors.push('组织描述不能超过500个字符')
    }

    if (!Object.values(OrganizationType).includes(data.type)) {
      errors.push('无效的组织类型')
    }

    return errors
  }

  /**
   * 检查组织是否可以删除
   */
  static canDeleteOrganization(org: Organization, allOrgs: Organization[]): boolean {
    // 检查是否有子组织
    const hasChildren = allOrgs.some(o => o.parentId === org.id)
    return !hasChildren
  }

  /**
   * 获取组织层级路径
   */
  static getOrganizationPath(orgId: string, organizations: Organization[]): Organization[] {
    const orgMap = new Map(organizations.map(org => [org.id, org]))
    const path: Organization[] = []
    
    let currentOrg = orgMap.get(orgId)
    while (currentOrg) {
      path.unshift(currentOrg)
      currentOrg = currentOrg.parentId ? orgMap.get(currentOrg.parentId) : undefined
    }
    
    return path
  }
}

export default OrganizationService