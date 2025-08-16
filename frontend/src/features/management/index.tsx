import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Button } from '@/components/ui/button'
import { 
  IconUsers, 
  IconUserCheck, 
  IconUserX, 
  IconBuilding,
  IconLockAccess,
  IconDatabase,
  IconChartPie,
  IconTrendingUp,
  IconShield,
  IconBrain,
  IconArrowRight,
  IconActivity
} from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'

// 模拟数据，实际应该从 API 获取
const mockStats = {
  users: {
    total: 1245,
    active: 892,
    inactive: 353,
    verified: 1100,
    online: 67
  },
  organizations: {
    total: 15,
    departments: 48,
    activeStructures: 12
  },
  security: {
    totalRoles: 8,
    activePermissions: 156,
    recentAudits: 23
  },
  system: {
    aiModels: 12,
    activeIntegrations: 8,
    systemHealth: 98.5
  }
}

export default function ManagementOverview() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(mockStats)
  const [loading, setLoading] = useState(false)

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('nav.managementOverview') }
  ]

  // 模拟数据加载
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <Header>
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
      </Header>

      <Main className="overflow-y-auto">
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('nav.managementOverview')}
          </h1>
          <p className='text-muted-foreground'>
            企业级管理中心概览，统一管理组织架构、安全权限和系统配置
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 快速统计卡片组 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 总用户数 */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">系统用户</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '---' : stats.users.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> 较上月
              </p>
            </CardContent>
          </Card>

          {/* 活跃用户 */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
              <IconUserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '---' : stats.users.active.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                活跃率 {Math.round((stats.users.active / stats.users.total) * 100)}%
              </p>
            </CardContent>
          </Card>

          {/* 组织架构 */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">组织架构</CardTitle>
              <IconBuilding className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '---' : stats.organizations.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.organizations.departments} 个部门
              </p>
            </CardContent>
          </Card>

          {/* 在线用户 */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">在线用户</CardTitle>
              <IconActivity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{loading ? '---' : stats.users.online}</div>
              <p className="text-xs text-muted-foreground">
                实时统计
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 管理模块卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 组织架构管理 */}
          <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <IconBuilding className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('nav.organizationStructure')}</CardTitle>
                    <CardDescription>组织、部门和用户层级管理</CardDescription>
                  </div>
                </div>
                <IconArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{stats.users.total}</div>
                  <div className="text-xs text-muted-foreground">总用户</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{stats.organizations.departments}</div>
                  <div className="text-xs text-muted-foreground">部门数</div>
                </div>
              </div>
              <div className="space-y-2">
                <Link to="/management/organization/users">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5" size="sm">
                    <IconUsers className="h-4 w-4 mr-2" />
                    {t('nav.usersManagement')}
                  </Button>
                </Link>
                <Link to="/management/organization/hierarchy">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5" size="sm">
                    <IconBuilding className="h-4 w-4 mr-2" />
                    {t('nav.organizationHierarchy')}
                  </Button>
                </Link>
                <Link to="/management/organization/chart">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5" size="sm">
                    <IconChartPie className="h-4 w-4 mr-2" />
                    {t('nav.organizationChart')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 安全权限管理 */}
          <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <IconLockAccess className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('nav.securityPermissions')}</CardTitle>
                    <CardDescription>角色权限和安全策略管理</CardDescription>
                  </div>
                </div>
                <IconArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{stats.security.totalRoles}</div>
                  <div className="text-xs text-muted-foreground">角色数</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{stats.security.activePermissions}</div>
                  <div className="text-xs text-muted-foreground">权限项</div>
                </div>
              </div>
              <div className="space-y-2">
                <Link to="/management/security/roles">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5" size="sm">
                    <IconShield className="h-4 w-4 mr-2" />
                    {t('nav.rolesPermissions')}
                  </Button>
                </Link>
                <Link to="/management/security/access">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5" size="sm">
                    <IconLockAccess className="h-4 w-4 mr-2" />
                    {t('nav.accessControl')}
                  </Button>
                </Link>
                <Link to="/management/security/audit">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5" size="sm">
                    <IconTrendingUp className="h-4 w-4 mr-2" />
                    {t('nav.securityAudit')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 系统管理 */}
          <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <IconDatabase className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('nav.systemManagement')}</CardTitle>
                    <CardDescription>系统配置和集成管理</CardDescription>
                  </div>
                </div>
                <IconArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{stats.system.aiModels}</div>
                  <div className="text-xs text-muted-foreground">AI模型</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold">{stats.system.systemHealth}%</div>
                  <div className="text-xs text-muted-foreground">系统健康</div>
                </div>
              </div>
              <div className="space-y-2">
                <Link to="/management/system/ai-models">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5" size="sm">
                    <IconBrain className="h-4 w-4 mr-2" />
                    {t('nav.aiModelsManagement')}
                  </Button>
                </Link>
                <Link to="/management/system/config">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5" size="sm">
                    <IconDatabase className="h-4 w-4 mr-2" />
                    {t('nav.systemConfiguration')}
                  </Button>
                </Link>
                <Link to="/management/system/integrations">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5" size="sm">
                    <IconActivity className="h-4 w-4 mr-2" />
                    {t('nav.integrationManagement')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作区域 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用管理操作的快捷入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/management/organization/users">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-primary/5">
                  <IconUsers className="h-6 w-6" />
                  <span className="text-sm">添加用户</span>
                </Button>
              </Link>
              <Link to="/management/security/roles">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-primary/5">
                  <IconShield className="h-6 w-6" />
                  <span className="text-sm">角色管理</span>
                </Button>
              </Link>
              <Link to="/management/system/ai-models">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-primary/5">
                  <IconBrain className="h-6 w-6" />
                  <span className="text-sm">AI模型</span>
                </Button>
              </Link>
              <Link to="/management/organization/chart">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-primary/5">
                  <IconChartPie className="h-6 w-6" />
                  <span className="text-sm">组织架构</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}