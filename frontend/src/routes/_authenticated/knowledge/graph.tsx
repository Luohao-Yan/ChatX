import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { 
  IconChartScatter3d, 
  IconSearch, 
  IconFilter, 
  IconRefresh,
  IconDownload,
  IconShare
} from '@tabler/icons-react'
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
import { KnowledgeGraph } from '@/components/knowledge-graph/knowledge-graph'
import { useCallback, useEffect, useState } from 'react'
import { useGraphTheme } from '@/hooks/use-graph-theme'
import { 
  KnowledgeGraphData, 
  KnowledgeNode, 
  KnowledgeNodeType,
} from '@/types/knowledge-graph'
import { fetchKnowledgeGraph, searchKnowledgeNodes } from '@/data/mock-knowledge-graph'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/knowledge/graph')({
  component: () => <KnowledgeGraphPage />,
})

function KnowledgeGraphPage() {
  const [graphData, setGraphData] = useState<KnowledgeGraphData>({ nodes: [], links: [] })
  const [filteredData, setFilteredData] = useState<KnowledgeGraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<KnowledgeNodeType[]>([])
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  const graphTheme = useGraphTheme()

  const topNav = [
    {
      title: '知识图谱',
      href: '/knowledge/graph',
      isActive: true,
    },
  ]

  // 加载图谱数据
  const loadGraphData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchKnowledgeGraph()
      setGraphData(data)
      toast.success('知识图谱加载成功')
    } catch (_error) {
      toast.error('加载知识图谱失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 应用筛选
  const applyFilters = useCallback(() => {
    let filteredNodes = graphData.nodes

    // 按搜索查询筛选
    if (searchQuery.trim()) {
      filteredNodes = filteredNodes.filter(node =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // 按节点类型筛选
    if (selectedNodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        selectedNodeTypes.includes(node.type)
      )
    }

    // 筛选相关连接
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id))
    const filteredLinks = graphData.links.filter(link =>
      filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
    )

    setFilteredData({
      nodes: filteredNodes,
      links: filteredLinks
    })
  }, [graphData.nodes, graphData.links, searchQuery, selectedNodeTypes])

  useEffect(() => {
    loadGraphData()
  }, [loadGraphData])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (query.trim()) {
      try {
        await searchKnowledgeNodes(query)
        // 这里可以高亮搜索结果
      } catch (_error) {
        // Handle search error silently
      }
    }
  }

  const handleNodeClick = (node: KnowledgeNode) => {
    setSelectedNode(node)
    toast.info(`选中节点: ${node.name}`)
  }

  const refreshGraph = () => {
    loadGraphData()
  }

  const exportGraph = () => {
    // 导出图谱数据
    const dataStr = JSON.stringify(filteredData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `knowledge-graph-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('图谱数据已导出')
  }

  const shareGraph = () => {
    // 分享图谱（可以生成分享链接）
    if (navigator.share) {
      navigator.share({
        title: '知识图谱',
        text: '查看我的知识图谱',
        url: window.location.href
      })
    } else {
      // 复制链接到剪贴板
      navigator.clipboard.writeText(window.location.href)
      toast.success('图谱链接已复制到剪贴板')
    }
  }

  // 节点类型选项
  const nodeTypeOptions = Object.values(KnowledgeNodeType).map(type => ({
    value: type,
    label: {
      document: '文档',
      concept: '概念',
      person: '人员',
      organization: '组织',
      department: '部门',
      topic: '主题',
      tag: '标签',
      website: '网页',
      wechat_article: '微信文章'
    }[type] || type
  }))

  // 统计信息
  const stats = {
    totalNodes: graphData.nodes.length,
    totalLinks: graphData.links.length,
    filteredNodes: filteredData.nodes.length,
    filteredLinks: filteredData.links.length,
    nodeTypes: [...new Set(graphData.nodes.map(n => n.type))].length
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
      </Header>
      <Main>
        <div className="space-y-6">
          {/* 页面头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <IconChartScatter3d className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">知识图谱</h1>
                <p className="text-muted-foreground">
                  可视化知识点之间的关联关系，探索知识的内在连接
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={refreshGraph} disabled={loading}>
                <IconRefresh className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">刷新</span>
              </Button>
              <Button variant="outline" onClick={exportGraph}>
                <IconDownload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">导出</span>
              </Button>
              <Button variant="outline" onClick={shareGraph}>
                <IconShare className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">分享</span>
              </Button>
            </div>
          </div>

          {/* 控制面板 */}
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
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* 节点类型筛选 */}
                <div className="w-full md:w-48">
                  <label className="text-sm font-medium mb-2 block">节点类型</label>
                  <Select 
                    value={selectedNodeTypes[0] || 'all'} 
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setSelectedNodeTypes([])
                      } else {
                        setSelectedNodeTypes([value as KnowledgeNodeType])
                      }
                    }}
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
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedNodeTypes([])
                  }}
                  disabled={!searchQuery && selectedNodeTypes.length === 0}
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

          {/* 知识图谱 */}
          <Card>
            <CardContent className="p-2 sm:p-4 md:p-6">
              <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px]">
                <KnowledgeGraph
                  data={filteredData}
                  loading={loading}
                  onNodeClick={handleNodeClick}
                />
              </div>
            </CardContent>
          </Card>

          {/* 选中节点详情面板 */}
          {selectedNode && (
            <Card>
              <CardHeader>
                <CardTitle>节点详情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <span className="font-medium">名称：</span>
                    <span>{selectedNode.name}</span>
                  </div>
                  <div>
                    <span className="font-medium">类型：</span>
                    <Badge variant="outline">{selectedNode.type}</Badge>
                  </div>
                  {selectedNode.description && (
                    <div>
                      <span className="font-medium">描述：</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedNode.description}
                      </p>
                    </div>
                  )}
                  {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                    <div>
                      <span className="font-medium">属性：</span>
                      <div className="mt-2 space-y-2">
                        {Object.entries(selectedNode.properties).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-muted-foreground">{key}：</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedNode(null)}
                    className="mt-4"
                  >
                    关闭详情
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 图例说明 */}
          <Card>
            <CardHeader>
              <CardTitle>图例说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {nodeTypeOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ 
                        backgroundColor: graphTheme.nodeColors[option.value as keyof typeof graphTheme.nodeColors] || '#6b7280'
                      }}
                    />
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-sm text-muted-foreground space-y-1">
                <p>• 点击节点查看详细信息</p>
                <p>• 拖拽节点调整位置</p>
                <p>• 使用鼠标滚轮缩放图谱</p>
                <p>• 右上角控制面板可进行缩放和重置操作</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}