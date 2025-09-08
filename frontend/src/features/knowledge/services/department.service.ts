/**
 * 部门管理领域服务
 * 封装部门相关的业务逻辑
 */

import { DepartmentAPI } from '@/services/api/knowledge'
import type {
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
} from '../types'

/**
 * 部门管理领域服务类
 */
export class DepartmentService {
  
  /**
   * 获取部门列表
   */
  static async getDepartments(organizationId?: string): Promise<Department[]> {
    try {
      const result = await DepartmentAPI.getList(organizationId)
      if (!Array.isArray(result)) {
        console.warn('Departments API returned non-array:', result)
        return []
      }
      return result
    } catch (error) {
      console.error('Failed to load departments:', error)
      // 返回空数组而不是抛出错误，避免无限重试
      return []
    }
  }

  /**
   * 获取部门树形结构
   */
  static async getDepartmentTree(organizationId?: string): Promise<Department[]> {
    try {
      const result = await DepartmentAPI.getTree(organizationId)
      if (!Array.isArray(result)) {
        console.warn('Department tree API returned non-array:', result)
        return []
      }
      return result
    } catch (error) {
      console.error('Failed to load department tree:', error)
      // 返回空数组而不是抛出错误，避免无限重试
      return []
    }
  }

  /**
   * 创建部门
   */
  static async createDepartment(data: DepartmentCreateRequest): Promise<Department> {
    try {
      return await DepartmentAPI.create(data)
    } catch (error) {
      console.error('Failed to create department:', error)
      throw new Error('创建部门失败')
    }
  }

  /**
   * 更新部门
   */
  static async updateDepartment(id: string, data: DepartmentUpdateRequest): Promise<Department> {
    try {
      return await DepartmentAPI.update(id, data)
    } catch (error) {
      console.error('Failed to update department:', error)
      throw new Error('更新部门失败')
    }
  }

  /**
   * 删除部门
   */
  static async deleteDepartment(id: string): Promise<void> {
    try {
      await DepartmentAPI.delete(id)
    } catch (error) {
      console.error('Failed to delete department:', error)
      throw new Error('删除部门失败')
    }
  }

  /**
   * 获取部门详情
   */
  static async getDepartmentById(id: string): Promise<Department> {
    try {
      return await DepartmentAPI.getById(id)
    } catch (error) {
      console.error('Failed to get department:', error)
      throw new Error('获取部门详情失败')
    }
  }

  /**
   * 构建部门树形结构
   */
  static buildDepartmentTree(departments: Department[]): Department[] {
    const deptMap = new Map<string, Department>()
    const rootDepts: Department[] = []

    // 创建映射和添加children数组
    departments.forEach(dept => {
      deptMap.set(dept.id, { ...dept, children: [] })
    })

    // 构建树形结构
    deptMap.forEach(dept => {
      if (dept.parentId && deptMap.has(dept.parentId)) {
        const parent = deptMap.get(dept.parentId)!
        parent.children!.push(dept)
      } else {
        rootDepts.push(dept)
      }
    })

    return rootDepts
  }

  /**
   * 扁平化部门树
   */
  static flattenDepartmentTree(departments: Department[]): (Department & { level?: number })[] {
    const result: (Department & { level?: number })[] = []
    
    const flatten = (depts: Department[], level: number = 0) => {
      depts.forEach(dept => {
        result.push({ ...dept, level })
        if (dept.children && dept.children.length > 0) {
          flatten(dept.children, level + 1)
        }
      })
    }
    
    flatten(departments)
    return result
  }

  /**
   * 计算部门总成员数（包含子部门）
   */
  static calculateTotalMembers(department: Department): number {
    let total = department.memberCount || 0
    
    if (department.children) {
      department.children.forEach(child => {
        total += this.calculateTotalMembers(child)
      })
    }
    
    return total
  }

  /**
   * 验证部门数据
   */
  static validateDepartmentData(data: DepartmentCreateRequest): string[] {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('部门名称不能为空')
    }

    if (data.name && data.name.trim().length > 100) {
      errors.push('部门名称不能超过100个字符')
    }

    if (!data.organizationId || data.organizationId.trim().length === 0) {
      errors.push('必须指定所属组织')
    }

    if (data.description && data.description.length > 500) {
      errors.push('部门描述不能超过500个字符')
    }

    return errors
  }

  /**
   * 检查部门是否可以删除
   */
  static canDeleteDepartment(dept: Department, allDepts: Department[]): boolean {
    // 检查是否有子部门
    const hasChildren = allDepts.some(d => d.parentId === dept.id)
    // 检查是否有成员（这里简化处理，实际应该查询成员表）
    const hasMembers = dept.memberCount > 0
    
    return !hasChildren && !hasMembers
  }

  /**
   * 获取部门层级路径
   */
  static getDepartmentPath(deptId: string, departments: Department[]): Department[] {
    const deptMap = new Map(departments.map(dept => [dept.id, dept]))
    const path: Department[] = []
    
    let currentDept = deptMap.get(deptId)
    while (currentDept) {
      path.unshift(currentDept)
      currentDept = currentDept.parentId ? deptMap.get(currentDept.parentId) : undefined
    }
    
    return path
  }

  /**
   * 获取部门下所有子部门ID
   */
  static getAllChildDepartmentIds(deptId: string, departments: Department[]): string[] {
    const childIds: string[] = []
    
    const collectChildIds = (parentId: string) => {
      departments.forEach(dept => {
        if (dept.parentId === parentId) {
          childIds.push(dept.id)
          collectChildIds(dept.id) // 递归收集子部门
        }
      })
    }
    
    collectChildIds(deptId)
    return childIds
  }

  /**
   * 检查部门循环依赖
   */
  static checkCircularDependency(deptId: string, parentId: string, departments: Department[]): boolean {
    if (deptId === parentId) {
      return true
    }
    
    const childIds = this.getAllChildDepartmentIds(deptId, departments)
    return childIds.includes(parentId)
  }
}

export default DepartmentService