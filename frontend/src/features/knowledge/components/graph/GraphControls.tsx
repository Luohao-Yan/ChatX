/**
 * 图谱控制面板组件
 * 提供搜索、过滤、统计等功能
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { IconSearch, IconRefresh, IconX } from '@tabler/icons-react'
import { KnowledgeNodeType, type GraphFilterState } from '../../types'
import { KnowledgeGraphService, type GraphStats } from '../../services'

interface GraphControlsProps {
  filterState: GraphFilterState
  stats: GraphStats
  loading?: boolean
  onSearch: (query: string) => void
  onNodeTypeFilter: (types: KnowledgeNodeType[]) => void
  onClearFilters: () => void
  onRefresh: () => void
}

export default function GraphControls({
  filterState,
  stats,
  loading = false,
  onSearch,
  onNodeTypeFilter,
  onClearFilters,
  onRefresh
}: GraphControlsProps) {
  const [searchQuery, setSearchQuery] = useState(filterState.searchQuery)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
  }

  const handleNodeTypeToggle = (type: KnowledgeNodeType) => {
    const currentTypes = filterState.selectedNodeTypes
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    onNodeTypeFilter(newTypes)
  }

  const nodeTypes = Object.values(KnowledgeNodeType)

  return (
    <div className="h-full flex flex-col">
      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 space-y-4">
          {/* Search */}
          <div>
            <h3 className="font-medium mb-3">搜索</h3>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <Input
                placeholder="搜索知识节点..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" size="icon" disabled={loading}>
                <IconSearch size={16} />
              </Button>
            </form>
          </div>

          {/* Stats */}
          <div>
            <h3 className="font-medium mb-3">统计信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">总节点数</span>
                <span className="font-medium">{stats.totalNodes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">显示节点</span>
                <span className="font-medium">{stats.filteredNodes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">总连接数</span>
                <span className="font-medium">{stats.totalLinks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">显示连接</span>
                <span className="font-medium">{stats.filteredLinks}</span>
              </div>
            </div>
          </div>

          {/* Node Type Filters - 2列布局 */}
          <div>
            <h3 className="font-medium mb-3">节点类型</h3>
            <div className="grid grid-cols-2 gap-2">
              {nodeTypes.map(type => {
                const isSelected = filterState.selectedNodeTypes.includes(type)
                const displayName = KnowledgeGraphService.getNodeTypeDisplayName(type)
                const color = KnowledgeGraphService.getNodeColor(type)
                
                return (
                  <button
                    key={type}
                    onClick={() => handleNodeTypeToggle(type)}
                    className={`flex items-center space-x-1.5 p-2 rounded-md transition-colors text-left ${
                      isSelected 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs truncate">{displayName}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Filters */}
          {(filterState.searchQuery || filterState.selectedNodeTypes.length > 0) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">已选过滤器</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  disabled={loading}
                >
                  <IconX size={14} className="mr-1" />
                  清除
                </Button>
              </div>
              
              <div className="space-y-2">
                {filterState.searchQuery && (
                  <Badge variant="secondary" className="text-xs">
                    搜索: {filterState.searchQuery}
                  </Badge>
                )}
                {filterState.selectedNodeTypes.map(type => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {KnowledgeGraphService.getNodeTypeDisplayName(type)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 固定在底部的操作按钮 */}
      <div className="border-t border-border p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="w-full"
        >
          <IconRefresh size={14} className="mr-1" />
          刷新数据
        </Button>
      </div>
    </div>
  )
}