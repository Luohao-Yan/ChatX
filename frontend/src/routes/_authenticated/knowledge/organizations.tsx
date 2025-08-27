/**
 * 组织机构管理路由页面
 * 重构后使用DDD架构和feature组件
 */

import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { IconBuilding, IconPlus, IconSearch, IconFilter, IconBuildingBank } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOrganizations } from '@/features/knowledge'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/knowledge/organizations')({
  component: () => <OrganizationsPage />,
})

function OrganizationsPage() {
  // 使用组织管理Hook
  const {
    organizations,
    organizationTree,
    loading,
    error,
    // createOrganization, // 后续功能开发时使用
    // updateOrganization, // 后续功能开发时使用
    // deleteOrganization, // 后续功能开发时使用
    refreshData,
  } = useOrganizations()

  const topNav = [
    {
      title: '单位知识库',
      href: '/knowledge/organizations',
      isActive: true,
    },
  ]

  // 处理创建组织
  const handleCreateOrganization = async () => {
    toast.info('创建组织功能开发中...')
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
              <p className="text-destructive mb-4">加载组织数据时发生错误</p>
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
              <IconBuilding className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">单位知识库</h1>
                <p className="text-muted-foreground">管理和维护组织机构、企业单位等信息库</p>
              </div>
            </div>
            <Button onClick={handleCreateOrganization} disabled={loading}>
              <IconPlus className="mr-2 h-4 w-4" />
              添加单位
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
                      placeholder="搜索单位..."
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
                    添加新的组织机构或企业单位信息
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleCreateOrganization}
                  >
                    <IconBuildingBank className="mr-2 h-4 w-4" />
                    添加机构
                  </Button>
                </CardContent>
              </Card>
              
              {/* 组织统计卡片 */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">组织统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">总单位数</span>
                      <Badge variant="secondary">{organizations.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">树形层级</span>
                      <Badge variant="secondary">{organizationTree.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">活跃组织</span>
                      <Badge variant="secondary">{organizations.filter(org => !org.parentId).length}</Badge>
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
                    组织机构管理功能正在开发中，敬请期待...
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">即将推出:</div>
                    <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                      <li className="relative">
                        <span className="absolute -left-3">•</span>
                        组织架构图可视化
                      </li>
                      <li className="relative">
                        <span className="absolute -left-3">•</span>
                        批量导入组织数据
                      </li>
                      <li className="relative">
                        <span className="absolute -left-3">•</span>
                        组织关系管理
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