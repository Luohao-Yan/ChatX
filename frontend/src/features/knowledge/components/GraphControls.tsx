/**
 * 知识图谱控制面板组件
 * 包含搜索、筛选、统计等功能
 */

import { useState } from 'react'
import { IconSearch, IconFilter, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import type { KnowledgeNodeType, GraphFilterState } from '../types'

interface GraphControlsProps {
  filterState: GraphFilterState
  stats: {
    totalNodes: number
    totalLinks: number
    filteredNodes: number
    filteredLinks: number
    nodeTypes: number
  }
  onSearchChange: (query: string) => void
  onNodeTypeChange: (types: KnowledgeNodeType[]) => void
  onClearFilters: () => void
  loading?: boolean
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  filterState,
  stats,
  onSearchChange,
  onNodeTypeChange,
  onClearFilters,
  loading = false
}) => {
  const [searchValue, setSearchValue] = useState(filterState.searchQuery)

  // 节点类型选项
  const nodeTypeOptions = [
    { value: 'document', label: '文档' },
    { value: 'concept', label: '概念' },
    { value: 'person', label: '人员' },
    { value: 'organization', label: '组织' },
    { value: 'department', label: '部门' },
    { value: 'topic', label: '主题' },
    { value: 'tag', label: '标签' },
    { value: 'website', label: '网页' },
    { value: 'wechat_article', label: '微信文章' }
  ]

  const handleSearch = (value: string) => {
    setSearchValue(value)
    onSearchChange(value)
  }

  const handleNodeTypeFilter = (value: string) => {
    if (value === 'all') {
      onNodeTypeChange([])
    } else {
      onNodeTypeChange([value as KnowledgeNodeType])
    }
  }

  const hasFilters = filterState.searchQuery || filterState.selectedNodeTypes.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <IconFilter className="mr-2 h-5 w-5" />
          筛选与控制
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          {/* 搜索框 */}
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium mb-2 block">搜索知识点</label>
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="输入关键词搜索节点..."
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
              {searchValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => handleSearch('')}
                >
                  <IconX className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* 节点类型筛选 */}
          <div className="w-full md:w-48">
            <label className="text-sm font-medium mb-2 block">节点类型</label>
            <Select 
              value={filterState.selectedNodeTypes[0] || 'all'} 
              onValueChange={handleNodeTypeFilter}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择节点类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {nodeTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 清除筛选 */}
          <Button 
            variant="outline" 
            onClick={onClearFilters}
            disabled={!hasFilters || loading}
            className="w-full md:w-auto"
          >
            清除筛选
          </Button>
        </div>

        {/* 统计信息 */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <Badge variant="outline">
            总节点: {stats.totalNodes}
          </Badge>
          <Badge variant="outline">
            总连接: {stats.totalLinks}
          </Badge>
          <Badge variant="outline">
            显示节点: {stats.filteredNodes}
          </Badge>
          <Badge variant="outline">
            显示连接: {stats.filteredLinks}
          </Badge>
          <Badge variant="outline">
            节点类型: {stats.nodeTypes}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default GraphControls