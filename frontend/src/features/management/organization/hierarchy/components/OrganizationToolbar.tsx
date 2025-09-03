/**
 * Organization Toolbar Component
 * 组织管理工具栏展示层组件
 */

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IconSearch, IconRefresh, IconRestore, IconPlus } from '@tabler/icons-react'

interface OrganizationToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onOpenRecycleBin: () => void
  onCreateOrganization: () => void
  loading: boolean
}

export function OrganizationToolbar({
  searchQuery,
  onSearchChange,
  onRefresh,
  onOpenRecycleBin,
  onCreateOrganization,
  loading
}: OrganizationToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1 min-w-0">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="搜索组织..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className="whitespace-nowrap"
        >
          <IconRefresh className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
        <Button
          variant="outline"
          onClick={onOpenRecycleBin}
          className="whitespace-nowrap"
        >
          <IconRestore className="h-4 w-4 mr-2" />
          回收站
        </Button>
        <Button
          onClick={onCreateOrganization}
          className="whitespace-nowrap"
        >
          <IconPlus className="h-4 w-4 mr-2" />
          添加组织
        </Button>
      </div>
    </div>
  )
}