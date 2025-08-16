import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { IconTrash, IconRestore, IconUserX } from '@tabler/icons-react'
import { toast } from 'sonner'
import { User } from '@/features/users/data/schema'
import { useUsersApi } from '@/features/users/services/users-api'

interface RecycleBinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserRestored?: () => void
}

export function RecycleBinDialog({ open, onOpenChange, onUserRestored }: RecycleBinDialogProps) {
  const [deletedUsers, setDeletedUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  const userApi = useUsersApi()

  // 当弹窗打开时加载数据
  useEffect(() => {
    if (open) {
      loadDeletedUsers()
    }
  }, [open])

  const loadDeletedUsers = async () => {
    try {
      setLoading(true)
      const deletedUsers = await userApi.getDeletedUsers()
      setDeletedUsers(deletedUsers)
    } catch (error) {
      toast.error('加载回收站数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(deletedUsers.map(user => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const handleRestore = async (userIds: string[]) => {
    try {
      setProcessing(true)
      if (userIds.length === 1) {
        const result = await userApi.restoreUser(userIds[0])
        toast.success(result.message)
      } else {
        const result = await userApi.batchRestoreUsers(userIds)
        toast.success(result.message)
      }
      setSelectedUsers([])
      await loadDeletedUsers()
      onUserRestored?.() // 通知父组件刷新用户列表
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '恢复失败')
    } finally {
      setProcessing(false)
    }
  }

  const handlePermanentDelete = async (userIds: string[]) => {
    if (!confirm(`确定要彻底删除选中的 ${userIds.length} 个用户吗？此操作不可撤销！`)) {
      return
    }

    try {
      setProcessing(true)
      if (userIds.length === 1) {
        const result = await userApi.permanentlyDeleteUser(userIds[0])
        toast.success(result.message)
      } else {
        const result = await userApi.batchPermanentlyDeleteUsers(userIds)
        toast.success(result.message)
      }
      setSelectedUsers([])
      await loadDeletedUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '删除失败')
    } finally {
      setProcessing(false)
    }
  }

  const isAllSelected = deletedUsers.length > 0 && selectedUsers.length === deletedUsers.length
  const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < deletedUsers.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUserX className="h-5 w-5" />
            回收站
          </DialogTitle>
          <DialogDescription>
            管理已删除的用户，支持恢复或彻底删除。共 {deletedUsers.length} 个已删除用户
          </DialogDescription>
        </DialogHeader>

        {/* 批量操作按钮 */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">
              已选择 {selectedUsers.length} 个用户
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(selectedUsers)}
              disabled={processing}
            >
              <IconRestore className="h-4 w-4 mr-1" />
              批量恢复
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handlePermanentDelete(selectedUsers)}
              disabled={processing}
            >
              <IconTrash className="h-4 w-4 mr-1" />
              彻底删除
            </Button>
          </div>
        )}

        {/* 表格内容 */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">加载中...</span>
            </div>
          ) : deletedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <IconUserX className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">回收站为空</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        ref={(ref) => {
                          if (ref) {
                            const checkbox = ref.querySelector('input[type="checkbox"]') as HTMLInputElement
                            if (checkbox) {
                              checkbox.indeterminate = isIndeterminate
                            }
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>用户信息</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>删除时间</TableHead>
                    <TableHead>删除者</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => 
                            handleSelectUser(user.id, !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url} 
                                alt={user.username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-primary">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.full_name || user.username}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.roles?.map((role, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {user.deleted_at ? new Date(user.deleted_at).toLocaleString('zh-CN') : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {user.deleted_by || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore([user.id])}
                            disabled={processing}
                            title="恢复用户"
                          >
                            <IconRestore className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePermanentDelete([user.id])}
                            disabled={processing}
                            className="text-destructive hover:text-destructive"
                            title="彻底删除"
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}