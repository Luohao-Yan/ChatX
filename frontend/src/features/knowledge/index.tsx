/**
 * 知识管理模块统一导出
 * 按照DDD原则组织的知识管理功能
 */

// 组件导出
export * from './components'

// Hooks导出
export * from './hooks'

// 类型导出
export * from './types'

// 默认导出
import { KnowledgeGraph, GraphControls, NodeDetails, GraphLegend } from './components'
import { useKnowledgeGraph, useOrganizations, useDepartments } from './hooks'

export default {
  // 组件
  KnowledgeGraph,
  GraphControls,
  NodeDetails,
  GraphLegend,
  
  // Hooks
  useKnowledgeGraph,
  useOrganizations,
  useDepartments,
}