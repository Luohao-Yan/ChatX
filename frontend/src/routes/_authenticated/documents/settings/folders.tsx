import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconFolder } from '@tabler/icons-react'

export const Route = createFileRoute('/_authenticated/documents/settings/folders')({
  component: () => <FoldersSettingsPage />,
})

function FoldersSettingsPage() {
  const topNav = [
    {
      title: '知识管理',
      href: '/documents',
      isActive: false,
    },
    {
      title: '知识管理设置',
      href: '/documents/settings/folders',
      isActive: false,
    },
    {
      title: '知识文件夹管理',
      href: '/documents/settings/folders',
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
            <IconFolder className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">知识文件夹管理</h1>
              <p className="text-muted-foreground">创建和管理知识库的文件夹结构</p>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">知识文件夹树形结构</h3>
            <p className="text-muted-foreground mb-4">
              在这里管理您的知识文件夹层级结构，支持拖拽排序和嵌套管理
            </p>
            <div className="text-center py-8">
              <IconFolder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">功能开发中...</p>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}