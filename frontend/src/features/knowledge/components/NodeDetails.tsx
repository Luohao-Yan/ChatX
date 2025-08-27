/**
 * 节点详情组件
 * 显示选中节点的详细信息
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconX } from '@tabler/icons-react'
import type { KnowledgeNode } from '../types'

interface NodeDetailsProps {
  node: KnowledgeNode
  onClose: () => void
  onViewRelations?: (node: KnowledgeNode) => void
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({
  node,
  onClose,
  onViewRelations
}) => {
  // 节点类型标签映射
  const typeLabels: Record<string, string> = {
    document: '文档',
    concept: '概念',
    person: '人员',
    organization: '组织',
    department: '部门',
    topic: '主题',
    tag: '标签',
    website: '网页',
    wechat_article: '微信文章'
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">节点详情</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <IconX className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 节点名称 */}
        <div>
          <span className="text-sm font-medium text-muted-foreground">名称</span>
          <div className="mt-1 text-base font-semibold">{node.name}</div>
        </div>

        {/* 节点类型 */}
        <div>
          <span className="text-sm font-medium text-muted-foreground">类型</span>
          <div className="mt-1">
            <Badge variant="outline" className="text-sm">
              {typeLabels[node.type] || node.type}
            </Badge>
          </div>
        </div>

        {/* 节点描述 */}
        {node.description && (
          <div>
            <span className="text-sm font-medium text-muted-foreground">描述</span>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {node.description}
            </p>
          </div>
        )}

        {/* 节点属性 */}
        {node.properties && Object.keys(node.properties).length > 0 && (
          <div>
            <span className="text-sm font-medium text-muted-foreground">属性</span>
            <div className="mt-2 space-y-2">
              {Object.entries(node.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between items-start text-sm">
                  <span className="text-muted-foreground font-medium min-w-0 flex-shrink-0 mr-3">
                    {key}:
                  </span>
                  <span className="text-right break-words">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          {onViewRelations && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewRelations(node)}
              className="flex-1"
            >
              查看关系
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
            className="flex-1"
          >
            关闭详情
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default NodeDetails