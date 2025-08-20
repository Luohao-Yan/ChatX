import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  IconUsers,
  IconUserPlus,
  IconUserOff,
  IconTrendingUp,
  IconCrown,
  IconShield,
  IconUser,
} from '@tabler/icons-react'

interface UserStats {
  total: number
  active: number
  inactive: number
  new_this_month: number
  super_admin: number
  admin: number
  normal: number
}

interface UserStatsCardsProps {
  stats: UserStats
  loading: boolean
}

export function UserStatsCards({ stats, loading }: UserStatsCardsProps) {
  const statsCards = [
    {
      title: '总用户数',
      value: stats.total,
      icon: IconUsers,
      description: '系统中所有用户'
    },
    {
      title: '活跃用户',
      value: stats.active,
      icon: IconUserPlus,
      description: '当前活跃的用户'
    },
    {
      title: '非活跃用户',
      value: stats.inactive,
      icon: IconUserOff,
      description: '暂时停用的用户'
    },
    {
      title: '本月新增',
      value: stats.new_this_month,
      icon: IconTrendingUp,
      description: '本月新注册用户'
    }
  ]

  const roleStats = [
    {
      title: '超级管理员',
      value: stats.super_admin,
      icon: IconCrown
    },
    {
      title: '管理员',
      value: stats.admin,
      icon: IconShield
    },
    {
      title: '普通用户',
      value: stats.normal,
      icon: IconUser
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 mb-8">
      {/* 基础统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <Card key={index} className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {card.value?.toLocaleString() ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <card.icon className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 角色分布卡片 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">用户角色分布</h3>
            <Badge variant="outline" className="text-xs px-2 py-1">
              统计信息
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {roleStats.map((role, index) => (
              <div key={index} className="bg-secondary/50 rounded-lg p-4 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                    <role.icon className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {role.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {role.value?.toLocaleString() ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}