import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconWorld, IconPlus, IconSearch, IconFilter, IconBookmark } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/knowledge/web-blogs')({
  component: () => <WebBlogKnowledgePage />,
})

function WebBlogKnowledgePage() {
  const topNav = [
    {
      title: '网页/博客知识收藏',
      href: '/knowledge/web-blogs',
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <IconWorld className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">网页/博客知识收藏</h1>
                <p className="text-muted-foreground">收藏和管理您的网页、博客等在线知识资源</p>
              </div>
            </div>
            <Button>
              <IconPlus className="mr-2 h-4 w-4" />
              添加收藏
            </Button>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索知识收藏..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <IconFilter className="mr-2 h-4 w-4" />
              筛选
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">快速添加</h3>
              <p className="text-sm text-muted-foreground mb-4">
                输入网址或使用浏览器扩展一键收藏
              </p>
              <Button variant="outline" className="w-full">
                <IconBookmark className="mr-2 h-4 w-4" />
                添加网址
              </Button>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">收藏统计</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">总收藏数</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">今日新增</span>
                  <span>0</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">功能开发中</h3>
              <p className="text-sm text-muted-foreground">
                网页知识收藏功能正在开发中，敬请期待...
              </p>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}