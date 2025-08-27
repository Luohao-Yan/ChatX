/**
 * 图谱图例组件
 * 显示节点类型说明和使用提示
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGraphTheme } from '@/hooks/use-graph-theme'
import type { KnowledgeNodeType } from '../types'

interface GraphLegendProps {
  availableTypes?: KnowledgeNodeType[]
  className?: string
}

export const GraphLegend: React.FC<GraphLegendProps> = ({
  availableTypes,
  className = ""
}) => {
  const theme = useGraphTheme()

  // 节点类型选项
  const nodeTypeOptions = [
    { value: 'document' as KnowledgeNodeType, label: '文档' },
    { value: 'concept' as KnowledgeNodeType, label: '概念' },
    { value: 'person' as KnowledgeNodeType, label: '人员' },
    { value: 'organization' as KnowledgeNodeType, label: '组织' },
    { value: 'department' as KnowledgeNodeType, label: '部门' },
    { value: 'topic' as KnowledgeNodeType, label: '主题' },
    { value: 'tag' as KnowledgeNodeType, label: '标签' },
    { value: 'website' as KnowledgeNodeType, label: '网页' },
    { value: 'wechat_article' as KnowledgeNodeType, label: '微信文章' }
  ]

  // 筛选可用的节点类型
  const displayTypes = availableTypes 
    ? nodeTypeOptions.filter(option => availableTypes.includes(option.value))
    : nodeTypeOptions

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>图例说明</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 节点类型图例 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {displayTypes.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full border flex-shrink-0"
                style={{ 
                  backgroundColor: theme.nodeColors[option.value] || '#6b7280'
                }}
              />
              <span className="text-sm">{option.label}</span>
            </div>
          ))}
        </div>

        {/* 操作说明 */}
        <div className="text-sm text-muted-foreground space-y-2">
          <h4 className="font-medium text-foreground mb-2">操作说明：</h4>
          <ul className="space-y-1 pl-4">
            <li className="relative">
              <span className="absolute -left-3">•</span>
              点击节点查看详细信息
            </li>
            <li className="relative">
              <span className="absolute -left-3">•</span>
              拖拽节点调整位置
            </li>
            <li className="relative">
              <span className="absolute -left-3">•</span>
              使用鼠标滚轮缩放图谱
            </li>
            <li className="relative">
              <span className="absolute -left-3">•</span>
              右上角控制面板可进行缩放和重置操作
            </li>
            <li className="relative">
              <span className="absolute -left-3">•</span>
              双击节点可查看相关关系（如果支持）
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default GraphLegend