import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconTrash } from '@tabler/icons-react'

export const Route = createFileRoute('/_authenticated/documents/trash')({
  component: () => <TrashPage />,
})

function TrashPage() {
  const topNav = [
    {
      title: '文档管理',
      href: '/documents',
      isActive: false,
    },
    {
      title: '回收站',
      href: '/documents/trash',
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
            <IconTrash className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">回收站</h1>
              <p className="text-muted-foreground">恢复或永久删除已删除的文档</p>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-center py-8">
              <IconTrash className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">回收站为空</h3>
              <p className="text-muted-foreground mb-4">
                已删除的文档会在这里显示，您可以选择恢复或永久删除
              </p>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}