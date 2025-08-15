'use client'

import { useState } from 'react'
import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { User } from '../data/schema'
import { useUsers } from '../context/users-context'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersDeleteDialog({ open, onOpenChange, currentRow }: Props) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const { deleteUser } = useUsers()

  const handleDelete = async () => {
    if (value.trim() !== currentRow.username) return

    try {
      setLoading(true)
      await deleteUser(currentRow.id)
      onOpenChange(false)
      setValue('')
    } catch (error) {
      // Error is handled in the context
      console.error('Delete failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setValue('')
    onOpenChange(false)
  }

  const getRoleText = (roles?: string[]) => {
    if (!roles || roles.length === 0) return '普通用户'
    return roles.join(', ')
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleClose}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.username || loading}
      title={
        <span className='text-destructive'>
          <IconAlertTriangle
            className='stroke-destructive mr-1 inline-block'
            size={18}
          />{' '}
          删除用户
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            您确定要删除用户{' '}
            <span className='font-bold'>{currentRow.full_name || currentRow.username}</span>{' '}
            (@{currentRow.username}) 吗？
            <br />
            此操作将永久删除角色为{' '}
            <span className='font-bold'>
              {getRoleText(currentRow.roles)}
            </span>{' '}
            的用户，此操作无法撤销。
          </p>

          <Label className='my-2'>
            用户名确认：
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='输入用户名以确认删除'
              disabled={loading}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>警告！</AlertTitle>
            <AlertDescription>
              请谨慎操作，删除后无法恢复用户数据。
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={
        loading ? (
          <span className="flex items-center">
            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            删除中...
          </span>
        ) : (
          '删除'
        )
      }
      destructive
    />
  )
}
