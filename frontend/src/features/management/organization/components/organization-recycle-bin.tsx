import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  IconSearch, 
  IconRefresh, 
  IconRestore,
  IconTrash,
  IconBuilding,
  IconClock,
  IconAlertTriangle
} from '@tabler/icons-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { organizationAPI, type Organization } from '@/services/api/organization'

interface OrganizationRecycleBinProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrganizationRestored: () => void
}

export function OrganizationRecycleBin({
  open,
  onOpenChange,
  onOrganizationRestored,
}: OrganizationRecycleBinProps) {
  const [deletedOrganizations, setDeletedOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [restoringOrgId] = useState<string | null>(null)
  const [permanentDeletingOrgId, setPermanentDeletingOrgId] = useState<string | null>(null)

  // 获取已删除的组织
  const fetchDeletedOrganizations = async () => {
    try {
      setLoading(true)
      const data = await organizationAPI.getDeletedOrganizations()
      setDeletedOrganizations(data)
    } catch (error) {
      console.error('Failed to fetch deleted organizations:', error)
      toast.error('获取回收站列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchDeletedOrganizations()
    }
  }, [open])

  // 过滤已删除的组织
  const filteredOrganizations = deletedOrganizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // 恢复组织
  const handleRestoreOrganization = async (org: Organization) => {
    try {
      await organizationAPI.restoreOrganization(org.id)
      setDeletedOrganizations(prev => prev.filter(o => o.id !== org.id))
      toast.success(`组织 "${org.name}" 已恢复`)
      onOrganizationRestored()
    } catch (error) {
      console.error('Failed to restore organization:', error)
      toast.error('恢复组织失败')
    }
  }

  // 永久删除组织
  const handlePermanentDelete = async (org: Organization) => {
    try {
      await organizationAPI.permanentlyDeleteOrganization(org.id)
      setDeletedOrganizations(prev => prev.filter(o => o.id !== org.id))
      setPermanentDeletingOrgId(null)
      toast.success(`组织 "${org.name}" 已永久删除`)
    } catch (error) {
      console.error('Failed to permanently delete organization:', error)
      toast.error('永久删除失败')
    }
  }

  const getTypeIcon = () => {
    return <IconBuilding className="h-4 w-4 text-muted-foreground" />
  }

  const getTypeBadge = (level: number) => {
    if (level === 0) {
      return <Badge variant="default">公司</Badge>
    } else if (level === 1) {
      return <Badge variant="secondary">部门</Badge>
    } else {
      return <Badge variant="outline">团队</Badge>
    }
  }

  const formatDeletedTime = (deletedAt: string) => {
    const date = new Date(deletedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconRestore className="h-5 w-5" />
              组织回收站
            </DialogTitle>
            <DialogDescription>
              管理已删除的组织，可以恢复或永久删除
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 工具栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索已删除的组织..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={fetchDeletedOrganizations}>
                  <IconRefresh size={16} className="mr-2" />
                  刷新
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconAlertTriangle size={16} className="text-yellow-600" />
                <span>已删除 {deletedOrganizations.length} 个组织</span>
              </div>
            </div>

            {/* 提醒信息 */}
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <IconAlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    注意事项
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• 恢复组织将同时恢复其下的所有子组织和成员关系</li>
                    <li>• 永久删除操作无法撤销，请谨慎操作</li>
                    <li>• 如果组织下还有子组织，需要先恢复或删除子组织</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 组织列表 */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>组织信息</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>原成员数</TableHead>
                    <TableHead>删除时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrganizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        {searchQuery ? '没有找到匹配的组织' : '回收站为空'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                              {getTypeIcon()}
                            </div>
                            <div>
                              <div className="font-medium">{org.display_name || org.name}</div>
                              {org.description && (
                                <div className="text-sm text-muted-foreground">
                                  {org.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(org.level)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IconBuilding className="h-4 w-4 text-muted-foreground" />
                            <span>{org.member_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <IconClock className="h-4 w-4" />
                            <span>{formatDeletedTime(org.deleted_at!)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreOrganization(org)}
                              disabled={restoringOrgId === org.id}
                              className="text-green-600 hover:text-green-700"
                            >
                              <IconRestore size={16} className="mr-1" />
                              恢复
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPermanentDeletingOrgId(org.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <IconTrash size={16} className="mr-1" />
                              永久删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 永久删除确认对话框 */}
      <AlertDialog 
        open={!!permanentDeletingOrgId} 
        onOpenChange={(open) => !open && setPermanentDeletingOrgId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="h-5 w-5 text-red-600" />
              确认永久删除
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                您确定要永久删除组织 "
                {deletedOrganizations.find(o => o.id === permanentDeletingOrgId)?.name}
                " 吗？
              </p>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                  ⚠️ 警告：此操作无法撤销！
                </p>
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                  组织及其所有相关数据将被永久删除，包括历史记录、成员关系等。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const org = deletedOrganizations.find(o => o.id === permanentDeletingOrgId)
                if (org) {
                  handlePermanentDelete(org)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}