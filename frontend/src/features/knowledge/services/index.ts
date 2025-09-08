/**
 * 知识管理服务层统一导出
 * 领域服务层 - 封装业务逻辑
 */

export * from './knowledge-graph.service'
export * from './organization.service'  
export * from './department.service'

// 默认导出
export { default as KnowledgeGraphService } from './knowledge-graph.service'
export { default as OrganizationService } from './organization.service'
export { default as DepartmentService } from './department.service'