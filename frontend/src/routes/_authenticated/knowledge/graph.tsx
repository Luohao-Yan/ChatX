/**
 * 知识图谱路由页面
 * 重构后使用DDD架构，业务逻辑分离到feature层
 */

import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { 
  IconChartScatter3d, 
  IconRefresh,
  IconDownload,
  IconShare
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

// 使用新的feature架构
import {
  KnowledgeGraph,
  GraphControls, 
  NodeDetails,
  GraphLegend,
  useKnowledgeGraph,
  type KnowledgeNode
} from '@/features/knowledge'

export const Route = createFileRoute('/_authenticated/knowledge/graph')({
  component: () => <KnowledgeGraphPage />,
})

function KnowledgeGraphPage() {
  // 使用知识图谱Hook管理状态和逻辑
  const {
    graphData,
    filteredData,
    loading,
    error,
    filterState,
    selectedNode,
    stats,
    // loadGraphData, // 在refreshData中已包含
    // searchNodes, // 目前使用setSearchQuery处理搜索
    setSearchQuery,
    setNodeTypeFilter,
    setSelectedNode,
    clearFilters,
    refreshData,
  } = useKnowledgeGraph({
    autoLoad: true
  })

  const topNav = [
    {
      title: '知识图谱',
      href: '/knowledge/graph',
      isActive: true,
    },
  ]

  // 处理节点点击
  const handleNodeClick = (node: KnowledgeNode) => {
    setSelectedNode(node)
    toast.info(`选中节点: ${node.name}`)
  }

  // 处理节点双击 - 可以扩展为查看关系等功能
  const handleNodeDoubleClick = (node: KnowledgeNode) => {
    toast.info(`双击节点: ${node.name} - 功能开发中`)
  }

  // 导出图谱数据
  const exportGraph = () => {
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

  // 分享图谱
  const shareGraph = () => {
    if (navigator.share) {
      navigator.share({
        title: '知识图谱',
        text: '查看我的知识图谱',
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('图谱链接已复制到剪贴板')
    }
  }

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <>
        <Header>
          <TopNav links={topNav} />
        </Header>
        <Main>
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <p className="text-destructive mb-4">加载知识图谱时发生错误</p>
              <Button onClick={refreshData} variant="outline">
                重新加载
              </Button>
            </div>
          </div>
        </Main>
      </>
    )
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
              <Button variant="outline" onClick={refreshData} disabled={loading}>
                <IconRefresh className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">刷新</span>
              </Button>
              <Button variant="outline" onClick={exportGraph} disabled={loading}>
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
          <GraphControls
            filterState={filterState}
            stats={stats}
            onSearchChange={setSearchQuery}
            onNodeTypeChange={setNodeTypeFilter}
            onClearFilters={clearFilters}
            loading={loading}
          />

          {/* 知识图谱 */}
          <Card>
            <CardContent className="p-2 sm:p-4 md:p-6">
              <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px]">
                <KnowledgeGraph
                  data={filteredData}
                  loading={loading}
                  onNodeClick={handleNodeClick}
                  onNodeDoubleClick={handleNodeDoubleClick}
                  height="100%"
                />
              </div>
            </CardContent>
          </Card>

          {/* 选中节点详情面板 */}
          {selectedNode && (
            <NodeDetails
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onViewRelations={(node) => {
                toast.info(`查看 ${node.name} 的关系 - 功能开发中`)
              }}
            />
          )}

          {/* 图例说明 */}
          <GraphLegend
            availableTypes={[...new Set(graphData.nodes.map(n => n.type))]}
          />
        </div>
      </Main>
    </>
  )
}