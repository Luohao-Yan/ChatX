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
  IconWorld,
  IconCrown,
  IconShield,
} from '@tabler/icons-react'
import { Tenant, TenantStatus } from '@/services/api/tenants'

interface AuthUser {
  id: string
  username: string
  email: string
  full_name?: string
  is_superuser?: boolean
  current_tenant_id?: string
  [key: string]: any
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
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
              <IconBuilding className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-muted-foreground">当前租户</p>
                {isSuperAdmin && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    <IconCrown className="h-3 w-3 mr-1" />
                    超级管理员
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {currentTenantInfo ? currentTenantInfo.display_name : (currentUser.current_tenant_id || 'System')}
              </h2>
              {currentTenantInfo && (
                <p className="text-sm text-muted-foreground mt-1">
                  {currentTenantInfo.description || currentTenantInfo.name}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 用户角色标识 */}
            <div className="hidden sm:flex items-center gap-2">
              {isSuperAdmin ? (
                <Badge variant="default" className="px-3 py-1">
                  <IconCrown className="h-4 w-4 mr-1" />
                  系统超级管理员
                </Badge>
              ) : (
                <Badge variant="secondary" className="px-3 py-1">
                  <IconShield className="h-4 w-4 mr-1" />
                  租户管理员
                </Badge>
              )}
            </div>
          
            {/* 只有超级管理员才显示租户切换功能 */}
            {isSuperAdmin && (
              <DropdownMenu open={isTenantSelectorOpen} onOpenChange={setIsTenantSelectorOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <IconSwitchHorizontal size={16} />
                    <span className="hidden sm:inline font-medium">切换租户</span>
                    <IconChevronDown size={14} className={`transition-transform ${isTenantSelectorOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
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
                      {/* System租户 */}
                      <DropdownMenuItem 
                        className="flex items-start justify-between p-3 hover:bg-muted/80 transition-colors"
                        onClick={() => {
                          const systemTenant: Tenant = {
                            id: 'system',
                            name: 'system',
                            display_name: 'System',
                            schema_name: 'public',
                            description: '系统租户',
                            owner_id: 'system',
                            status: TenantStatus.ACTIVE,
                            is_active: true,
                            slug: 'system',
                            settings: {
                              allow_self_registration: false,
                              user_type: 'system' as const,
                              is_system_tenant: true,
                              max_users: 999999,
                              features: ['all']
                            },
                            features: ['all'],
                            limits: {
                              max_file_size_mb: 999999,
                              max_storage_gb: 999999,
                              max_users: 999999
                            },
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                          }
                          handleTenantSwitch(systemTenant)
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                            <IconWorld size={16} className="text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">System</span>
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5">系统</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">系统租户</p>
                          </div>
                        </div>
                        {(!currentTenantInfo && !currentUser?.current_tenant_id) || currentUser?.current_tenant_id === 'system' ? (
                          <IconCheck size={16} className="text-primary flex-shrink-0" />
                        ) : null}
                      </DropdownMenuItem>
                      
                      {/* 其他租户 */}
                      {availableTenants.map((tenant) => (
                        <DropdownMenuItem 
                          key={tenant.id}
                          className="flex items-start justify-between p-3 hover:bg-muted/80 transition-colors"
                          onClick={() => handleTenantSwitch(tenant)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                              <IconBuilding size={16} className="text-secondary-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{tenant.display_name}</span>
                                <Badge 
                                  variant={tenant.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs px-1.5 py-0.5"
                                >
                                  {tenant.status === 'active' ? '活跃' : '非活跃'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {tenant.description || tenant.name}
                              </p>
                            </div>
                          </div>
                          {currentTenantInfo?.id === tenant.id ? (
                            <IconCheck size={16} className="text-primary flex-shrink-0" />
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                    </div>
                    
                    {!loadingTenants && availableTenants.length > 0 && (
                      <div className="mt-3 pt-2 border-t text-xs text-muted-foreground text-center">
                        共 {availableTenants.length + 1} 个可用租户
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* 移动端角色信息 */}
          <div className="sm:hidden mt-4 pt-4 border-t">
            <div className="flex items-center justify-center">
              {isSuperAdmin ? (
                <Badge variant="default" className="px-3 py-1">
                  <IconCrown className="h-4 w-4 mr-1" />
                  系统超级管理员
                </Badge>
              ) : (
                <Badge variant="secondary" className="px-3 py-1">
                  <IconShield className="h-4 w-4 mr-1" />
                  租户管理员
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}