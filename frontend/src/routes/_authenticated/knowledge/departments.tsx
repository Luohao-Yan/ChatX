/**
 * 部门管理路由页面
 * 重构后使用DDD架构和feature组件
 */

import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconBuildingBank, IconPlus, IconSearch, IconFilter, IconBuilding } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDepartments } from '@/features/knowledge'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/knowledge/departments')({
  component: () => <DepartmentsPage />,
})

function DepartmentsPage() {
  // 使用部门管理Hook
  const {
    departments,
    departmentTree,
    loading,
    error,
    // createDepartment, // 后续功能开发时使用
    // updateDepartment, // 后续功能开发时使用
    // deleteDepartment, // 后续功能开发时使用
    refreshData,
  } = useDepartments()

  const topNav = [
    {
      title: '部门知识库',
      href: '/knowledge/departments',
      isActive: true,
    },
  ]

  // 处理创建部门
  const handleCreateDepartment = async () => {
    toast.info('创建部门功能开发中...')
  }

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <>
        <Header>
          <TopNav links={topNav} />
        </Header>
        <Main>
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <p className="text-destructive mb-4">加载部门数据时发生错误</p>
              <Button onClick={refreshData} variant="outline">
                重新加载
              </Button>
            </div>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
      </Header>
      <Main>
        <div className="space-y-6">
          {/* 页面头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <IconBuildingBank className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">部门知识库</h1>
                <p className="text-muted-foreground">管理和维护各单位的部门结构和人员信息</p>
              </div>
            </div>
            <Button onClick={handleCreateDepartment} disabled={loading}>
              <IconPlus className="mr-2 h-4 w-4" />
              添加部门
            </Button>
          </div>

          {/* 搜索和筛选 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索部门..."
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button variant="outline" disabled={loading}>
                  <IconFilter className="mr-2 h-4 w-4" />
                  筛选
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 内容区域 */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">加载中...</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* 快速添加卡片 */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">快速添加</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    创建新的部门或更新部门信息
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleCreateDepartment}
                  >
                    <IconBuilding className="mr-2 h-4 w-4" />
                    添加部门
                  </Button>
                </CardContent>
              </Card>
              
              {/* 部门统计卡片 */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">部门统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">总部门数</span>
                      <Badge variant="secondary">{departments.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">树形层级</span>
                      <Badge variant="secondary">{departmentTree.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">总人数</span>
                      <Badge variant="secondary">
                        {departments.reduce((sum, dept) => sum + dept.memberCount, 0)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* 功能开发中卡片 */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">功能开发中</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    部门管理功能正在开发中，敬请期待...
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">即将推出:</div>
                    <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                      <li className="relative">
                        <span className="absolute -left-3">•</span>
                        部门层级管理
                      </li>
                      <li className="relative">
                        <span className="absolute -left-3">•</span>
                        人员分配管理
                      </li>
                      <li className="relative">
                        <span className="absolute -left-3">•</span>
                        部门职责描述
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </Main>
    </>
  )
}