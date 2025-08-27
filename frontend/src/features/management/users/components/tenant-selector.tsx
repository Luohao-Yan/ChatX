import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  IconBuilding,
  IconSwitchHorizontal,
  IconChevronDown,
  IconCheck,
  IconCrown,
} from '@tabler/icons-react'
import { Tenant } from '@/services/api/tenants'

interface AuthUser {
  id: string
  username: string
  email: string
  full_name?: string
  is_superuser?: boolean
  current_tenant_id?: string
  roles?: string[]
}

interface TenantSelectorProps {
  currentUser: AuthUser | null
  currentTenantInfo: Tenant | null
  availableTenants: Tenant[]
  loadingTenants: boolean
  isSuperAdmin: boolean
  onTenantSwitch: (tenant: Tenant) => void
}

export function TenantSelector({
  currentUser,
  currentTenantInfo,
  availableTenants,
  loadingTenants,
  isSuperAdmin,
  onTenantSwitch
}: TenantSelectorProps) {
  const [isTenantSelectorOpen, setIsTenantSelectorOpen] = useState(false)

  const handleTenantSwitch = (tenant: Tenant) => {
    onTenantSwitch(tenant)
    setIsTenantSelectorOpen(false)
  }

  if (!currentUser) return null

  return (
    <Card>
      <CardContent className="p-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <IconBuilding className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-medium text-muted-foreground">当前租户</p>
                {isSuperAdmin && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-4">
                    <IconCrown className="h-2.5 w-2.5 mr-1" />
                    超级管理员
                  </Badge>
                )}
              </div>
              <h2 className="text-sm font-semibold text-foreground truncate">
                {currentTenantInfo ? currentTenantInfo.display_name : '当前租户'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 只有超级管理员才显示租户切换功能 */}
            {isSuperAdmin && (
              <DropdownMenu open={isTenantSelectorOpen} onOpenChange={setIsTenantSelectorOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 px-2.5 text-xs">
                    <IconSwitchHorizontal size={12} />
                    <span className="hidden sm:inline">切换租户</span>
                    <IconChevronDown size={10} className={`transition-transform ${isTenantSelectorOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">选择要管理的租户</p>
                      {loadingTenants && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                      )}
                    </div>
                    
                    {!loadingTenants && availableTenants.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        暂无可用租户
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      {/* 显示实际的租户列表，不使用mock数据 */}
                      {availableTenants.map((tenant) => {
                        const isSelected = currentTenantInfo?.id === tenant.id
                        return (
                          <DropdownMenuItem 
                            key={tenant.id}
                            className={`group flex items-start justify-between p-3 transition-all duration-200 cursor-pointer ${
                              isSelected 
                                ? 'bg-primary/5 border-l-4 border-primary hover:bg-primary/10' 
                                : 'hover:bg-muted/50 border-l-4 border-transparent hover:border-muted'
                            }`}
                            onClick={() => handleTenantSwitch(tenant)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-primary shadow-lg shadow-primary/20' 
                                  : 'bg-muted group-hover:bg-background group-hover:shadow-sm group-hover:border group-hover:border-border'
                              }`}>
                                <IconBuilding 
                                  size={18} 
                                  className={`transition-colors duration-200 ${
                                    isSelected ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                                  }`} 
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`font-semibold text-sm truncate transition-colors duration-200 ${
                                    isSelected ? 'text-primary' : 'text-foreground'
                                  }`} title={tenant.display_name}>
                                    {tenant.display_name}
                                  </span>
                                  <Badge 
                                    variant={tenant.status === 'active' ? 'default' : 'secondary'}
                                    className="text-xs px-2 py-0.5 flex-shrink-0"
                                  >
                                    {tenant.status === 'active' ? '活跃' : '非活跃'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate leading-relaxed" title={tenant.description || tenant.name}>
                                  {tenant.description || tenant.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                              {isSelected && (
                                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                  <IconCheck size={12} className="text-primary-foreground" />
                                </div>
                              )}
                            </div>
                          </DropdownMenuItem>
                        )
                      })}
                    </div>
                    
                    {!loadingTenants && availableTenants.length > 0 && (
                      <div className="mt-3 pt-2 border-t text-xs text-muted-foreground text-center">
                        共 {availableTenants.length} 个可用租户
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}