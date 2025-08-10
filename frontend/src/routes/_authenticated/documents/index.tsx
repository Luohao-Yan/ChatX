import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconFileText, IconUpload, IconSearch, IconFilter } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/documents/')({
  component: () => <MyDocumentsPage />,
})

function MyDocumentsPage() {
  const topNav = [
    {
      title: '我的文档',
      href: '/documents',
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
              <IconFileText className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold">我的文档</h1>
                <p className="text-muted-foreground">管理和组织您的所有文档</p>
              </div>
            </div>
            <Button>
              <IconUpload className="mr-2 h-4 w-4" />
              上传文档
            </Button>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索文档..."
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
              <h3 className="font-semibold mb-2">快速上传</h3>
              <p className="text-sm text-muted-foreground mb-4">
                拖拽文件到此处或点击上传按钮
              </p>
              <Button variant="outline" className="w-full">
                选择文件
              </Button>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">文档统计</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">总文档数</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">存储使用</span>
                  <span>0 MB</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">文档功能开发中</h3>
              <p className="text-sm text-muted-foreground">
                完整的文档管理功能正在开发中...
              </p>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}