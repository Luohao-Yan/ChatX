import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { IconPlus } from '@tabler/icons-react'
import { UserForm } from '../user-form'
import { usersAPI } from '@/services/api/users'
import { User } from '@/types/entities/user'
import { toast } from 'sonner'

interface AddUserDialogProps {
  onUserAdded?: (user: User) => void
  triggerVariant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon'
  triggerText?: string
  className?: string
}

export function AddUserDialog({ 
  onUserAdded, 
  triggerVariant = 'default',
  triggerSize = 'default',
  triggerText = '添加用户',
  className 
}: AddUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleAddUser = async (userData: any) => {
    try {
      setIsSubmitting(true)
      const newUser = await usersAPI.createUser(userData)
      
      // 通知父组件有新用户被添加
      if (onUserAdded) {
        onUserAdded(newUser)
      }
      
      // 关闭对话框
      setIsOpen(false)
      
      // 显示成功提示
      toast.success(`用户 ${userData.username} 创建成功`)
      
    } catch (error) {
      console.error('Failed to create user:', error)
      // 错误处理由UserForm组件负责，这里不需要显示toast
      throw error // 重新抛出错误，让表单处理
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={triggerVariant} 
          size={triggerSize}
          className={className}
          disabled={isSubmitting}
        >
          <IconPlus size={16} className="mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>添加新用户</DialogTitle>
          <DialogDescription>
            创建新的系统用户账户
          </DialogDescription>
        </DialogHeader>
        <UserForm 
          onSubmit={handleAddUser} 
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}