/**
 * 知识管理组件统一导出
 */

export { KnowledgeGraph } from './KnowledgeGraph'
export { GraphControls } from './GraphControls'
export { NodeDetails } from './NodeDetails'
export { GraphLegend } from './GraphLegend'

// 导入组件用于默认导出
import { KnowledgeGraph } from './KnowledgeGraph'
import { GraphControls } from './GraphControls'
import { NodeDetails } from './NodeDetails'
import { GraphLegend } from './GraphLegend'

export default {
  KnowledgeGraph,
  GraphControls, 
  NodeDetails,
  GraphLegend,
}