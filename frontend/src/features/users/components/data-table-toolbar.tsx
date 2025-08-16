import { useState } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from './data-table-view-options'
import { DataTableFacetedFilter } from './data-table-faceted-filter'
import { User } from '../data/schema'
import { useUsers } from '../context/users-context'
import { useUsersApi } from '../services/users-api'
import { RecycleBinDialog } from '@/features/management/users/recycle-bin-dialog'
import { toast } from 'sonner'

const statuses = [
  {
    value: 'active',
    label: '正常',
  },
  {
    value: 'inactive',
    label: '已停用',
  },
  {
    value: 'unverified',
    label: '未验证',
  },
]

const roles = [
  {
    value: 'admin',
    label: '管理员',
  },
  {
    value: 'user',
    label: '普通用户',
  },
]

interface DataTableToolbarProps {
  table: Table<User>
}

export function DataTableToolbar({ table }: DataTableToolbarProps) {
  const { setOpen } = useUsers()
  const usersApi = useUsersApi()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false)
  const isFiltered = table.getState().columnFilters.length > 0

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length
  const selectedUserIds = selectedRows.map(row => row.original.id)

  const handleBatchDisable = async () => {
    if (selectedCount === 0) return
    
    setIsProcessing(true)
    try {
      const result = await usersApi.batchDisableUsers(selectedUserIds)
      toast.success(result.message)
      table.resetRowSelection()
      window.location.reload() // 简单刷新页面
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '批量停用失败')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedCount === 0) return
    
    setIsProcessing(true)
    try {
      const result = await usersApi.batchDeleteUsers(selectedUserIds)
      toast.success(result.message)
      table.resetRowSelection()
      window.location.reload() // 简单刷新页面
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '批量删除失败')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:space-x-2'>
        <Input
          placeholder='搜索用户...'
          value={(table.getColumn('userInfo')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('userInfo')?.setFilterValue(event.target.value)
          }
          className='h-8 w-[150px] lg:w-[250px]'
        />
        <div className='flex gap-2'>
          {table.getColumn('status') && (
            <DataTableFacetedFilter
              column={table.getColumn('status')}
              title='状态'
              options={statuses}
            />
          )}
          {table.getColumn('roles') && (
            <DataTableFacetedFilter
              column={table.getColumn('roles')}
              title='角色'
              options={roles}
            />
          )}
        </div>
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => table.resetColumnFilters()}
            className='h-8 px-2 lg:px-3'
          >
            重置
            <Cross2Icon className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>

      <div className='flex items-center space-x-2'>
        {/* 批量操作按钮 */}
        {selectedCount > 0 && (
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-muted-foreground'>
              已选择 {selectedCount} 个用户
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={handleBatchDisable}
              disabled={isProcessing}
            >
              批量停用
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={handleBatchDelete}
              disabled={isProcessing}
            >
              批量删除
            </Button>
          </div>
        )}
        
        <Button
          variant='outline'
          size='sm'
          onClick={() => setOpen('create')}
        >
          新建用户
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setIsRecycleBinOpen(true)}
        >
          回收站
        </Button>
        <DataTableViewOptions table={table} />
      </div>
      
      {/* 回收站弹窗 */}
      <RecycleBinDialog
        open={isRecycleBinOpen}
        onOpenChange={setIsRecycleBinOpen}
        onUserRestored={() => window.location.reload()}
      />
    </div>
  )
}
