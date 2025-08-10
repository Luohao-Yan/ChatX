import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconCategory } from '@tabler/icons-react'

export const Route = createFileRoute('/_authenticated/documents/settings/categories')({
  component: () => <CategoriesSettingsPage />,
})

function CategoriesSettingsPage() {
  const topNav = [
    {
      title: '文档管理',
      href: '/documents',
      isActive: false,
    },
    {
      title: '文档设置',
      href: '/documents/settings/categories',
      isActive: false,
    },
    {
      title: '分类标签',
      href: '/documents/settings/categories',
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
            <IconCategory className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">分类标签管理</h1>
              <p className="text-muted-foreground">管理文档的分类和标签系统</p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">文档分类</h3>
              <p className="text-muted-foreground mb-4">
                创建和管理文档分类，每个分类可以定义特定的元数据字段
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">功能开发中...</p>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">文档标签</h3>
              <p className="text-muted-foreground mb-4">
                管理文档标签，用于快速筛选和搜索文档
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">功能开发中...</p>
              </div>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}