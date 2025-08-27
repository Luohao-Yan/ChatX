import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  IconUsers,
  IconUserPlus,
  IconUserOff,
  IconTrendingUp,
  IconChevronDown,
  IconChartBar,
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
  const [isExpanded, setIsExpanded] = useState(true)
  
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

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <IconChartBar className="h-4 w-4 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">用户统计</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            <IconChevronDown 
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex flex-col space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 基础统计卡片 - 紧凑布局 */}
              {statsCards.map((card, index) => (
                <div key={index} className="border rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <card.icon className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground truncate">
                        {card.title}
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {card.value?.toLocaleString() ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}