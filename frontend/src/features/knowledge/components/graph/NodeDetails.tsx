/**
 * 节点详情面板组件
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconX, IconExternalLink } from '@tabler/icons-react'
import { KnowledgeGraphService } from '../../services'
import type { KnowledgeNode } from '../../types'

interface NodeDetailsProps {
  node: KnowledgeNode
  onClose: () => void
}

export default function NodeDetails({ node, onClose }: NodeDetailsProps) {
  const typeDisplayName = KnowledgeGraphService.getNodeTypeDisplayName(node.type)
  const nodeColor = KnowledgeGraphService.getNodeColor(node.type)

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: nodeColor }}
            />
            <Badge variant="secondary" className="text-xs">
              {typeDisplayName}
            </Badge>
          </div>
          <h3 className="font-semibold text-lg leading-tight break-words">
            {node.name}
          </h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0 ml-2">
          <IconX size={16} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Description */}
        {node.description && (
          <div>
            <h4 className="font-medium text-sm mb-2">描述</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {node.description}
            </p>
          </div>
        )}

        {/* Properties */}
        {node.properties && Object.keys(node.properties).length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">属性</h4>
            <div className="space-y-2">
              {Object.entries(node.properties).map(([key, value]) => (
                <div key={key} className="flex flex-col space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {key}
                  </span>
                  <span className="text-sm break-words">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div>
          <h4 className="font-medium text-sm mb-2">基本信息</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">节点ID</span>
              <span className="font-mono text-xs break-all">{node.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">类型</span>
              <span>{typeDisplayName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <Button variant="outline" size="sm" className="w-full">
          <IconExternalLink size={14} className="mr-2" />
          查看详情
        </Button>
        
        <div className="text-xs text-muted-foreground text-center">
          双击节点可展开关联节点
        </div>
      </div>
    </div>
  )
}