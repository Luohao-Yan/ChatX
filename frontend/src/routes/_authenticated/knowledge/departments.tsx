import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconBuildingBank, IconPlus, IconSearch, IconFilter, IconBuilding } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/knowledge/departments')({
  component: () => <DepartmentsPage />,
})

function DepartmentsPage() {
  const topNav = [
    {
      title: '部门知识库',
      href: '/knowledge/departments',
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
              <IconBuildingBank className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">部门知识库</h1>
                <p className="text-muted-foreground">管理和维护各单位的部门结构和人员信息</p>
              </div>
            </div>
            <Button>
              <IconPlus className="mr-2 h-4 w-4" />
              添加部门
            </Button>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索部门..."
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
                创建新的部门或更新部门信息
              </p>
              <Button variant="outline" className="w-full">
                <IconBuilding className="mr-2 h-4 w-4" />
                添加部门
              </Button>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">部门统计</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">总部门数</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">总人数</span>
                  <span>0</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">功能开发中</h3>
              <p className="text-sm text-muted-foreground">
                部门管理功能正在开发中，敬请期待...
              </p>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}