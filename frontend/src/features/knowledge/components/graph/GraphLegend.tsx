/**
 * 图谱图例组件
 */

import { KnowledgeNodeType } from '../../types'
import { KnowledgeGraphService } from '../../services'

interface GraphLegendProps {
  className?: string
}

export default function GraphLegend({ className = '' }: GraphLegendProps) {
  const nodeTypes = Object.values(KnowledgeNodeType)

  return (
    <div className={`bg-background/90 border rounded-lg p-3 ${className}`}>
      <h4 className="font-medium text-sm mb-3">图例</h4>
      <div className="space-y-2">
        {nodeTypes.map(type => {
          const displayName = KnowledgeGraphService.getNodeTypeDisplayName(type)
          const color = KnowledgeGraphService.getNodeColor(type)
          
          return (
            <div key={type} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs">{displayName}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}