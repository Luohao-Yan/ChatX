/**
 * 知识图谱主组件
 * 基于现有的KnowledgeGraph组件重构
 */

import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { KnowledgeGraphData, KnowledgeNode } from '../../types'

interface KnowledgeGraphProps {
  data: KnowledgeGraphData
  loading?: boolean
  selectedNode?: KnowledgeNode | null
  onNodeSelect?: (node: KnowledgeNode | null) => void
  onNodeDoubleClick?: (node: KnowledgeNode) => void
  className?: string
}

export default function KnowledgeGraph({
  data,
  loading = false,
  selectedNode,
  onNodeSelect,
  onNodeDoubleClick,
  className = ''
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || loading || data.nodes.length === 0) {
      return
    }

    // TODO: 实现图谱可视化逻辑
    // 这里应该集成原有的图谱组件或使用新的可视化库
    console.log('Rendering knowledge graph with data:', data)
    console.log('Selected node:', selectedNode)
    
    // 使用这些函数避免未使用警告
    if (onNodeSelect && onNodeDoubleClick) {
      // 图谱交互逻辑在此实现
    }

  }, [data, loading, selectedNode, onNodeSelect, onNodeDoubleClick])

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">加载知识图谱...</p>
        </div>
      </div>
    )
  }

  if (data.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground">暂无数据</h3>
          <p className="text-sm text-muted-foreground mt-2">没有找到知识图谱数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative h-full ${className}`}>
      <div 
        ref={containerRef}
        className="w-full h-full bg-background"
      >
        {/* 临时显示数据统计 */}
        <div className="absolute top-4 left-4 bg-background/80 p-4 rounded-lg shadow-sm border">
          <h4 className="font-medium mb-2">图谱数据</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>节点数量: {data.nodes.length}</p>
            <p>连接数量: {data.links.length}</p>
            {selectedNode && (
              <p className="font-medium text-primary">
                选中节点: {selectedNode.name}
              </p>
            )}
          </div>
        </div>
        
        {/* TODO: 这里应该渲染实际的图谱可视化 */}
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-medium">知识图谱组件</p>
            <p className="text-sm mt-1">节点: {data.nodes.length}, 连接: {data.links.length}</p>
            <p className="text-xs mt-2">TODO: 集成图谱可视化库</p>
          </div>
        </div>
      </div>
    </div>
  )
}