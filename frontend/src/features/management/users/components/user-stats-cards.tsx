import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  IconUsers,
  IconUserPlus,
  IconUserOff,
  IconTrendingUp,
  IconChartBar,
  IconChevronDown,
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
      title: '总计',
      value: stats.total,
      icon: IconUsers,
      description: '系统中所有用户'
    },
    {
      title: '活跃',
      value: stats.active,
      icon: IconUserPlus,
      description: '当前活跃的用户'
    },
    {
      title: '停用',
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
    <div className="bg-card border rounded-lg shadow-sm">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
              <IconChartBar className="h-3 w-3 text-primary-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">用户统计</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-5 w-5 p-0"
          >
            <IconChevronDown 
              className={`h-2.5 w-2.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-3">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-muted/30 rounded-lg p-3 border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                    <div className="space-y-1 flex-1">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-14" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statsCards.map((card, index) => (
                <div
                  key={index}
                  className="bg-card rounded-lg p-3 border transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <card.icon className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground truncate">
                        {card.title}
                      </p>
                      <p className="text-lg font-bold text-foreground tabular-nums">
                        {(card.value ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}