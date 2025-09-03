/**
 * Organization Statistics Cards Component
 * 组织统计卡片展示层组件
 */

import { Card, CardContent } from '@/components/ui/card'
import { 
  IconBuilding, 
  IconBuildingBank, 
  IconUsers, 
  IconUser 
} from '@tabler/icons-react'
import { OrganizationStats } from '@/types/organization.types'

interface OrganizationStatsCardsProps {
  stats: OrganizationStats
  loading: boolean
}

export function OrganizationStatsCards({ stats, loading }: OrganizationStatsCardsProps) {
  const statCards = [
    {
      title: '总组织数',
      value: stats.totalOrganizations,
      description: '包含所有组织单位',
      icon: IconBuilding,
      color: 'text-blue-600'
    },
    {
      title: '部门数量',
      value: stats.departmentCount,
      description: '一级部门',
      icon: IconBuildingBank,
      color: 'text-green-600'
    },
    {
      title: '团队数量',
      value: stats.teamCount,
      description: '工作团队',
      icon: IconUsers,
      color: 'text-purple-600'
    },
    {
      title: '总成员数',
      value: stats.totalMembers,
      description: '所有组织成员',
      icon: IconUser,
      color: 'text-orange-600'
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 ${stat.color} bg-opacity-10 rounded-md flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`h-3 w-3 ${stat.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}