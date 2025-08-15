import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { IconLoader2 } from '@tabler/icons-react'
import { toast } from 'sonner'
import { User } from '@/features/users/data/schema'

const userSchema = z.object({
  username: z.string()
    .min(3, '用户名至少需要3个字符')
    .max(50, '用户名不能超过50个字符')
    .refine((val) => /^[a-zA-Z0-9_]+$/.test(val), {
      message: '用户名只能包含字母、数字和下划线'
    }),
  email: z.string()
    .email('请输入有效的邮箱地址'),
  full_name: z.string()
    .min(1, '真实姓名不能为空')
    .max(100, '真实姓名不能超过100个字符'),
  password: z.string()
    .min(6, '密码至少需要6个字符')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean(),
  is_verified: z.boolean(),
})

const createUserSchema = userSchema.extend({
  password: z.string()
    .min(6, '密码至少需要6个字符')
})

const editUserSchema = userSchema.extend({
  password: z.string()
    .min(6, '密码至少需要6个字符')
    .optional()
    .or(z.literal(''))
})

type UserFormData = z.infer<typeof userSchema>

interface UserFormProps {
  initialData?: User
  onSubmit: (data: UserFormData) => Promise<void>
  onCancel?: () => void
  isEditing?: boolean
}

export function UserForm({ initialData, onSubmit, onCancel, isEditing = false }: UserFormProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({})

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors: formErrors }
  } = useForm<UserFormData>({
    defaultValues: {
      username: initialData?.username || '',
      email: initialData?.email || '',
      full_name: initialData?.full_name || '',
      password: '',
      is_active: initialData?.is_active ?? true,
      is_verified: initialData?.is_verified ?? false,
    }
  })

  const isActive = watch('is_active')
  const isVerified = watch('is_verified')

  const handleFormSubmit = async (data: UserFormData) => {
    try {
      setLoading(true)
      setErrors({})

      // 验证表单数据
      const schema = isEditing ? editUserSchema : createUserSchema
      const result = schema.safeParse(data)
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof UserFormData, string>> = {}
        result.error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof UserFormData] = issue.message
          }
        })
        setErrors(fieldErrors)
        return
      }

      // 如果是编辑模式且密码为空，则不更新密码
      const submitData = { ...data }
      if (isEditing && !data.password) {
        delete submitData.password
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Form submission error:', error)
      
      // 处理API返回的错误信息
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any
        if (apiError.response?.data?.detail) {
          toast.error(apiError.response.data.detail)
        } else if (apiError.response?.status === 400) {
          toast.error('请检查输入的信息是否正确')
        } else if (apiError.response?.status === 409) {
          toast.error('用户名或邮箱已存在')
        } else {
          toast.error('操作失败，请稍后重试')
        }
      } else {
        toast.error('操作失败，请稍后重试')
      }
      
      setErrors({ username: '提交失败，请检查输入信息' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名 *</Label>
              <Input
                id="username"
                {...register('username')}
                placeholder="输入用户名"
                disabled={isEditing} // 编辑时不允许修改用户名
              />
              {(formErrors.username || errors.username) && (
                <p className="text-sm text-red-600">
                  {formErrors.username?.message || errors.username}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="输入邮箱地址"
              />
              {(formErrors.email || errors.email) && (
                <p className="text-sm text-red-600">
                  {formErrors.email?.message || errors.email}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">真实姓名 *</Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="输入真实姓名"
            />
            {(formErrors.full_name || errors.full_name) && (
              <p className="text-sm text-red-600">
                {formErrors.full_name?.message || errors.full_name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              密码 {isEditing ? '(留空表示不修改)' : '*'}
            </Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder={isEditing ? "留空表示不修改密码" : "输入密码"}
            />
            {(formErrors.password || errors.password) && (
              <p className="text-sm text-red-600">
                {formErrors.password?.message || errors.password}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">权限设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>账户状态</Label>
              <p className="text-sm text-muted-foreground">
                启用后用户可以正常登录和使用系统
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>邮箱验证</Label>
              <p className="text-sm text-muted-foreground">
                标记用户邮箱为已验证状态
              </p>
            </div>
            <Switch
              checked={isVerified}
              onCheckedChange={(checked) => setValue('is_verified', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button 
          type="button" 
          variant="outline" 
          disabled={loading}
          onClick={onCancel}
        >
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <IconLoader2 size={16} className="mr-2 animate-spin" />}
          {isEditing ? '更新用户' : '创建用户'}
        </Button>
      </div>
    </form>
  )
}