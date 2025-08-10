import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconHeart } from '@tabler/icons-react'

export const Route = createFileRoute('/_authenticated/documents/favorites')({
  component: () => <FavoritesPage />,
})

function FavoritesPage() {
  const topNav = [
    {
      title: '文档管理',
      href: '/documents',
      isActive: false,
    },
    {
      title: '收藏夹',
      href: '/documents/favorites',
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
            <IconHeart className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">收藏夹</h1>
              <p className="text-muted-foreground">管理您收藏的重要文档</p>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-center py-8">
              <IconHeart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无收藏文档</h3>
              <p className="text-muted-foreground mb-4">
                您收藏的文档会在这里显示
              </p>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}