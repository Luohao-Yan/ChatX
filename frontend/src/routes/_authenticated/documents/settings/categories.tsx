import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconTags, IconCategory2, IconTag } from '@tabler/icons-react'

export const Route = createFileRoute('/_authenticated/documents/settings/categories')({
  component: () => <CategoriesSettingsPage />,
})

function CategoriesSettingsPage() {
  const topNav = [
    {
      title: '知识管理',
      href: '/documents',
      isActive: false,
    },
    {
      title: '知识管理设置',
      href: '/documents/settings/categories',
      isActive: false,
    },
    {
      title: '知识分类标签',
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
            <IconTags className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">知识分类标签管理</h1>
              <p className="text-muted-foreground">管理知识库的分类和标签系统</p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <IconCategory2 className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold">知识分类</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                创建和管理知识分类，每个分类可以定义特定的元数据字段
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">功能开发中...</p>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <IconTag className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold">知识标签</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                管理知识标签，用于快速筛选和搜索知识内容
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