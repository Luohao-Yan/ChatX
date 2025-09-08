/**
 * 知识图谱主页面
 * 参考AI聊天页面的架构模式
 */

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useTranslation } from 'react-i18next'
import { KnowledgeGraph, GraphControls, NodeDetails } from '../components/graph'
import { useKnowledgeGraph } from '../hooks'
import type { KnowledgeNode } from '../types'

export default function KnowledgeGraphPage() {
  const { t } = useTranslation()
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  
  const {
    filteredData,
    loading,
    error,
    stats,
    filterState,
    searchNodes,
    setSearchQuery,
    setNodeTypeFilter,
    clearFilters,
    refreshData,
  } = useKnowledgeGraph()

  const breadcrumbItems = [
    { label: t('nav.knowledge') },
    { label: t('nav.knowledgeGraph') }
  ]

  const handleNodeSelect = (node: KnowledgeNode | null) => {
    setSelectedNode(node)
  }

  const handleNodeDoubleClick = async (node: KnowledgeNode) => {
    try {
      await searchNodes(node.name)
    } catch (error) {
      console.error('Failed to search related nodes:', error)
    }
  }

  const handleSearch = async (query: string) => {
    try {
      if (query.trim()) {
        await searchNodes(query)
      } else {
        setSearchQuery('')
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen">
        <Header className="shrink-0">
          <Breadcrumb items={breadcrumbItems} />
          <HeaderActions />
        </Header>
        
        <Main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive">加载失败</h3>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
            <button 
              onClick={refreshData}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              重试
            </button>
          </div>
        </Main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header className="shrink-0">
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
      </Header>

      {/* Main Content */}
      <Main className="flex-1 flex min-h-0">
        {/* Left Panel - Controls */}
        <div className="w-80 border-r border-border bg-background/50 flex flex-col">
          <GraphControls
            filterState={filterState}
            stats={stats}
            loading={loading}
            onSearch={handleSearch}
            onNodeTypeFilter={setNodeTypeFilter}
            onClearFilters={clearFilters}
            onRefresh={refreshData}
          />
        </div>

        {/* Center Panel - Graph */}
        <div className="flex-1 relative">
          <KnowledgeGraph
            data={filteredData}
            loading={loading}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
            onNodeDoubleClick={handleNodeDoubleClick}
          />
        </div>

        {/* Right Panel - Node Details (conditional) */}
        {selectedNode && (
          <div className="w-80 border-l border-border bg-background/50">
            <NodeDetails
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </Main>
    </div>
  )
}