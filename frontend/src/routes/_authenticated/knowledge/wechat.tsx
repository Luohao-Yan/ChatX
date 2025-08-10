import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconBrandWechat, IconPlus, IconSearch, IconFilter, IconBookmark } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/knowledge/wechat')({
  component: () => <WechatKnowledgePage />,
})

function WechatKnowledgePage() {
  const topNav = [
    {
      title: '微信公众号知识收藏',
      href: '/knowledge/wechat',
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
              <IconBrandWechat className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">微信公众号知识收藏</h1>
                <p className="text-muted-foreground">收藏和管理微信公众号的优质文章和内容</p>
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
                  placeholder="搜索公众号文章..."
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
              <h3 className="font-semibold mb-2">快速收藏</h3>
              <p className="text-sm text-muted-foreground mb-4">
                支持微信文章链接、公众号订阅等功能
              </p>
              <Button variant="outline" className="w-full">
                <IconBookmark className="mr-2 h-4 w-4" />
                收藏文章
              </Button>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">收藏统计</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">收藏文章</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关注公众号</span>
                  <span>0</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">功能开发中</h3>
              <p className="text-sm text-muted-foreground">
                微信公众号知识收藏功能正在开发中，敬请期待...
              </p>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}