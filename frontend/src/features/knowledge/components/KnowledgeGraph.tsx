/**
 * 知识图谱可视化组件
 * 基于ECharts的知识图谱展示组件，支持节点交互、缩放、全屏等功能
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  IconZoomIn, 
  IconZoomOut, 
  IconRefresh, 
  IconMaximize,
  IconMinus,
  IconPlus
} from '@tabler/icons-react'
import { useGraphTheme } from '@/hooks/use-graph-theme'
import { toast } from 'sonner'
import type { KnowledgeGraphData, KnowledgeNode } from '../types'

interface KnowledgeGraphProps {
  data: KnowledgeGraphData
  loading?: boolean
  className?: string
  height?: string | number
  onNodeClick?: (node: KnowledgeNode) => void
  onNodeDoubleClick?: (node: KnowledgeNode) => void
  showControls?: boolean
  showLegend?: boolean
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  data,
  loading = false,
  className = "",
  height = '100%',
  onNodeClick,
  onNodeDoubleClick,
  showControls = true,
  showLegend = true
}) => {
  const chartRef = useRef<ReactECharts>(null)
  const theme = useGraphTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // 生成ECharts配置
  const option = useMemo<EChartsOption>(() => {
    const isDark = document.documentElement.classList.contains('dark')
    
    // 转换节点数据
    const nodes = data.nodes.map(node => ({
      id: node.id,
      name: node.name,
      category: node.type,
      value: 1,
      label: {
        show: true,
        color: theme.textColor,
        fontSize: window.innerWidth > 768 ? 12 : 10
      },
      itemStyle: {
        color: theme.nodeColors[node.type as keyof typeof theme.nodeColors] || '#6b7280'
      },
      symbolSize: window.innerWidth > 768 ? 35 : 28
    }))

    // 转换边数据
    const links = data.links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.weight || 1,
      lineStyle: {
        color: theme.linkColor,
        width: 1.5,
        opacity: 0.6
      }
    }))

    // 创建分类数据
    const categories = [...new Set(data.nodes.map(n => n.type))].map(type => ({
      name: type,
      itemStyle: {
        color: theme.nodeColors[type as keyof typeof theme.nodeColors] || '#6b7280'
      }
    }))

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: function (params: any) {
          if (params.dataType === 'node') {
            const node = data.nodes.find(n => n.id === params.data.id)
            const nodeColor = theme.nodeColors[node?.type as keyof typeof theme.nodeColors] || theme.primaryColor
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
            return `
              <div style="
                padding: 16px; 
                max-width: 320px; 
                background: ${isDark ? '#1f2937' : '#ffffff'};
                color: ${isDark ? '#f9fafb' : '#111827'};
                border: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
                border-radius: 12px;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25);
                font-family: system-ui, -apple-system, sans-serif;
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  margin-bottom: 12px;
                ">
                  <div style="
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: ${nodeColor};
                    margin-right: 8px;
                  "></div>
                  <div style="
                    font-weight: 600;
                    font-size: 15px;
                    color: ${isDark ? '#f9fafb' : '#111827'};
                  ">${params.data.name}</div>
                </div>
                <div style="
                  font-size: 13px;
                  color: ${isDark ? '#9ca3af' : '#6b7280'};
                  margin-bottom: 8px;
                  background: ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(243,244,246,0.8)'};
                  padding: 4px 8px;
                  border-radius: 6px;
                  display: inline-block;
                ">类型: ${typeLabels[params.data.category] || params.data.category}</div>
                ${node?.description ? `<div style="
                  font-size: 12px;
                  line-height: 1.5;
                  color: ${isDark ? '#d1d5db' : '#374151'};
                  margin-top: 12px;
                  padding: 8px;
                  background: ${isDark ? 'rgba(55,65,81,0.5)' : 'rgba(249,250,251,0.8)'};
                  border-radius: 6px;
                ">${node.description}</div>` : ''}
              </div>
            `
          } else if (params.dataType === 'edge') {
            return `
              <div style="
                padding: 16px;
                background: ${isDark ? '#1f2937' : '#ffffff'};
                color: ${isDark ? '#f9fafb' : '#111827'};
                border: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
                border-radius: 12px;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25);
                font-family: system-ui, -apple-system, sans-serif;
              ">
                <div style="
                  font-weight: 600;
                  font-size: 14px;
                  margin-bottom: 8px;
                  color: ${theme.primaryColor};
                ">连接关系</div>
                <div style="
                  font-size: 13px;
                  color: ${isDark ? '#d1d5db' : '#374151'};
                  display: flex;
                  align-items: center;
                ">
                  <span>${params.data.source}</span>
                  <span style="
                    margin: 0 8px;
                    color: ${theme.primaryColor};
                    font-weight: bold;
                  ">→</span>
                  <span>${params.data.target}</span>
                </div>
              </div>
            `
          }
          return params.name
        },
        confine: true,
        appendToBody: true
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        data: categories.map(c => c.name),
        textStyle: {
          color: theme.textColor,
          fontSize: 12
        },
        show: showLegend && window.innerWidth > 768 // 根据props和屏幕尺寸显示图例
      },
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: links,
        categories: categories,
        roam: true,
        draggable: true,
        focusNodeAdjacency: true,
        force: {
          repulsion: 100,
          gravity: 0.1,
          edgeLength: [50, 200],
          layoutAnimation: true
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{b}',
          color: theme.textColor,
          fontSize: window.innerWidth > 768 ? 12 : 10,
          fontWeight: 500,
          backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
          borderRadius: 4,
          padding: [2, 6],
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 4
          }
        }
      }]
    }
  }, [data, theme, showLegend])

  // 处理节点事件
  const handleEvents = {
    click: (params: any) => {
      if (params.dataType === 'node') {
        const node = data.nodes.find(n => n.id === params.data.id)
        if (node && onNodeClick) {
          onNodeClick(node)
        } else if (node) {
          toast.info(`选中节点: ${params.data.name}`)
        }
      }
    },
    dblclick: (params: any) => {
      if (params.dataType === 'node' && onNodeDoubleClick) {
        const node = data.nodes.find(n => n.id === params.data.id)
        if (node) {
          onNodeDoubleClick(node)
        }
      }
    }
  }

  // 控制功能
  const zoomIn = useCallback(() => {
    const chart = chartRef.current?.getEchartsInstance()
    if (chart) {
      chart.dispatchAction({ type: 'zoom', zoom: 1.2 })
    }
  }, [])

  const zoomOut = useCallback(() => {
    const chart = chartRef.current?.getEchartsInstance()
    if (chart) {
      chart.dispatchAction({ type: 'zoom', zoom: 0.8 })
    }
  }, [])

  const resetZoom = useCallback(() => {
    const chart = chartRef.current?.getEchartsInstance()
    if (chart) {
      chart.dispatchAction({ type: 'restore' })
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // 响应式处理
  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance()
    if (chart) {
      const handleResize = () => {
        chart.resize()
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 加载状态
  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[500px] ${className}`}>
        <div className="text-center">
          <IconRefresh className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">加载知识图谱...</p>
        </div>
      </div>
    )
  }

  // 无数据状态
  if (!data.nodes.length) {
    return (
      <div className={`flex items-center justify-center min-h-[500px] ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-lg font-medium text-muted-foreground">暂无数据</div>
          <p className="text-sm text-muted-foreground">当前没有可显示的知识图谱数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* ECharts 图谱 */}
      <ReactECharts
        ref={chartRef}
        option={option}
        onEvents={handleEvents}
        style={{ 
          height: isFullscreen ? '100vh' : height,
          width: '100%',
          minHeight: typeof height === 'string' ? height : `${height}px`
        }}
        opts={{ 
          renderer: 'canvas',
          width: 'auto',
          height: 'auto'
        }}
      />

      {/* 桌面端控制面板 */}
      {showControls && (
        <Card className="absolute top-4 right-4 w-12 bg-background/95 backdrop-blur-sm border shadow-lg">
          <CardContent className="p-2 space-y-1">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={zoomIn}
              className="w-8 h-8 p-0 hover:bg-primary/10"
              title="放大"
            >
              <IconZoomIn className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={zoomOut}
              className="w-8 h-8 p-0 hover:bg-primary/10"
              title="缩小"
            >
              <IconZoomOut className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={resetZoom}
              className="w-8 h-8 p-0 hover:bg-primary/10"
              title="重置缩放"
            >
              <IconRefresh className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={toggleFullscreen}
              className="w-8 h-8 p-0 hover:bg-primary/10"
              title={isFullscreen ? "退出全屏" : "全屏显示"}
            >
              <IconMaximize className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 移动端简化控制 */}
      {showControls && (
        <div className="absolute bottom-4 right-4 flex space-x-1 md:hidden">
          <Button 
            size="sm" 
            variant="secondary"
            onClick={zoomIn}
            className="w-8 h-8 p-0 bg-background/95 backdrop-blur-sm"
          >
            <IconPlus className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={zoomOut}
            className="w-8 h-8 p-0 bg-background/95 backdrop-blur-sm"
          >
            <IconMinus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default KnowledgeGraph