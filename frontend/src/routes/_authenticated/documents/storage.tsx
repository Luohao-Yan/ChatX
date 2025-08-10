import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconChartPie } from '@tabler/icons-react'

export const Route = createFileRoute('/_authenticated/documents/storage')({
  component: () => <StorageAnalysisPage />,
})

function StorageAnalysisPage() {
  const topNav = [
    {
      title: '文档管理',
      href: '/documents',
      isActive: false,
    },
    {
      title: '存储分析',
      href: '/documents/storage',
      isActive: true,
    },
  ]

  return (
    <>
      <Header>
        <TopNav links={topNav} />
      </Header>
      <Main>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <IconChartPie className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">存储分析</h1>
              <p className="text-muted-foreground">查看您的存储使用情况和统计信息</p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">存储概览</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">已使用空间</span>
                  <span>0 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">剩余空间</span>
                  <span>10 GB</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">文件类型分布</h3>
              <div className="text-center py-8">
                <IconChartPie className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  上传文档后，这里将显示文件类型分布图表
                </p>
              </div>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}