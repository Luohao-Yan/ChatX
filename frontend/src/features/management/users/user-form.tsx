import { useState, useId, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SearchableSelect, SelectOption } from '@/components/ui/searchable-select'
import { IconLoader2 } from '@tabler/icons-react'
import { toast } from 'sonner'
import { User } from '@/types/entities/user'
import { organizationAPI, type Organization, type Team } from '@/services/api/organization'
import { roleAPI, type Role } from '@/services/api/roles'
import { tenantAPI, type Tenant } from '@/services/api/tenants'

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
    .refine((val) => {
      if (!val) return true // 允许空值（用于编辑模式）
      
      // 检查密码复杂度：需包含大写字母、小写字母、数字、特殊字符中至少3种
      const hasUppercase = /[A-Z]/.test(val)
      const hasLowercase = /[a-z]/.test(val)
      const hasNumbers = /\d/.test(val)
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(val)
      
      const complexity = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length
      return complexity >= 3
    }, {
      message: '密码需包含大写字母、小写字母、数字、特殊字符中至少3种'
    })
    .optional()
    .or(z.literal('')),
  is_active: z.boolean(),
  is_verified: z.boolean(),
  tenant_id: z.string().optional(),
  organization_id: z.string().optional(),
  team_id: z.string().optional(),
  roles: z.array(z.string()).optional(),
  phone: z.string().optional(),
})

const createUserSchema = userSchema.extend({
  password: z.string()
    .min(6, '密码至少需要6个字符')
    .refine((val) => {
      // 检查密码复杂度：需包含大写字母、小写字母、数字、特殊字符中至少3种
      const hasUppercase = /[A-Z]/.test(val)
      const hasLowercase = /[a-z]/.test(val)
      const hasNumbers = /\d/.test(val)
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(val)
      
      const complexity = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length
      return complexity >= 3
    }, {
      message: '密码需包含大写字母、小写字母、数字、特殊字符中至少3种'
    })
})

const editUserSchema = userSchema.extend({
  password: z.string()
    .min(6, '密码至少需要6个字符')
    .refine((val) => {
      if (!val) return true // 允许空值（用于编辑模式）
      
      // 检查密码复杂度：需包含大写字母、小写字母、数字、特殊字符中至少3种
      const hasUppercase = /[A-Z]/.test(val)
      const hasLowercase = /[a-z]/.test(val)
      const hasNumbers = /\d/.test(val)
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(val)
      
      const complexity = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length
      return complexity >= 3
    }, {
      message: '密码需包含大写字母、小写字母、数字、特殊字符中至少3种'
    })
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

// 密码强度检查函数
const checkPasswordStrength = (password: string) => {
  if (!password) return { score: 0, items: [] }
  
  const checks = [
    { test: /[A-Z]/.test(password), label: '大写字母', met: false },
    { test: /[a-z]/.test(password), label: '小写字母', met: false },
    { test: /\d/.test(password), label: '数字', met: false },
    { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: '特殊字符', met: false },
  ]
  
  checks.forEach(check => check.met = check.test)
  const score = checks.filter(check => check.met).length
  
  return { score, items: checks, isValid: score >= 3 && password.length >= 6 }
}

export function UserForm({ initialData, onSubmit, onCancel, isEditing = false }: UserFormProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({})
  const formId = useId() // 生成唯一ID前缀
  
  // API数据状态
  const [tenantOptions, setTenantOptions] = useState<SelectOption[]>([])
  const [organizationOptions, setOrganizationOptions] = useState<SelectOption[]>([])
  const [teamOptions, setTeamOptions] = useState<SelectOption[]>([])
  const [roleOptions, setRoleOptions] = useState<SelectOption[]>([])
  const [dataLoading, setDataLoading] = useState(true)

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
      tenant_id: initialData?.tenant_id || '',
      organization_id: initialData?.organization_id || '',
      team_id: initialData?.team_id || '',
      roles: initialData?.roles || [],
      phone: initialData?.phone || '',
    }
  })

  const isActive = watch('is_active')
  const isVerified = watch('is_verified')
  const currentPassword = watch('password')
  const selectedTenant = watch('tenant_id')
  const selectedOrganization = watch('organization_id')
  const selectedTeam = watch('team_id')
  const selectedRoles = watch('roles')

  // 加载选项数据
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setDataLoading(true)
        
        // 并行加载所有数据
        const [tenants, organizations, teams, roles] = await Promise.all([
          tenantAPI.getTenants().catch(err => {
            console.warn('租户数据加载失败:', err)
            return [{
              id: 'default',
              name: '默认租户',
              display_name: '默认租户',
              description: '系统默认租户'
            }]
          }),
          organizationAPI.getOrganizations().catch(err => {
            console.warn('组织数据加载失败:', err)
            return []
          }),
          organizationAPI.getTeams().catch(err => {
            console.warn('团队数据加载失败:', err)
            return []
          }),
          roleAPI.getRoles().catch(err => {
            console.warn('角色数据加载失败:', err)
            return []
          })
        ])

        // 处理租户数据
        setTenantOptions(tenants.map((tenant: any) => ({
          value: tenant.id,
          label: tenant.display_name || tenant.name,
          description: tenant.description
        })))

        // 处理组织数据
        setOrganizationOptions(organizations.map((org: Organization) => ({
          value: org.id,
          label: org.display_name || org.name,
          description: org.description
        })))

        // 处理团队数据
        setTeamOptions(teams.map((team: Team) => ({
          value: team.id,
          label: team.name,
          description: team.description
        })))

        // 处理角色数据
        setRoleOptions(roles.map((role: Role) => ({
          value: role.id,
          label: role.display_name || role.name,
          description: role.description
        })))

      } catch (error) {
        console.error('加载表单数据失败:', error)
        toast.error('加载表单数据失败，请检查网络连接后重试')
        
        // 设置最小可用选项
        setTenantOptions([{
          value: 'default',
          label: '默认租户',
          description: '系统默认租户'
        }])
        setOrganizationOptions([])
        setTeamOptions([])
        setRoleOptions([])
      } finally {
        setDataLoading(false)
      }
    }

    loadFormData()
  }, [])

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
      if (error && typeof error === 'object') {
        const apiError = error as any
        
        // 尝试从多个可能的位置获取错误数据
        const errorSources = [
          apiError.response?.data,  // HTTP响应数据
          apiError.data,            // RequestError.data
          apiError                  // 直接在错误对象上
        ]
        
        let errorMessage = ''
        
        // 遍历所有可能的错误数据源
        for (const errorData of errorSources) {
          if (!errorData) continue
          
          if (errorData?.error?.message) {
            // 格式: { error: { message: "...", code: "..." } }
            errorMessage = errorData.error.message
            break
          } else if (errorData?.message) {
            // 格式: { message: "..." }
            errorMessage = errorData.message
            break
          } else if (errorData?.detail) {
            // 格式: { detail: "..." }
            errorMessage = errorData.detail
            break
          } else if (typeof errorData === 'string') {
            // 直接是字符串
            errorMessage = errorData
            break
          }
        }
        
        if (errorMessage) {
          toast.error(errorMessage)
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
      
      // 不要重复设置错误，让toast消息就足够了
    } finally {
      setLoading(false)
    }
  }

  // 如果数据正在加载，显示加载状态
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader2 size={24} className="animate-spin mr-2" />
        <span>加载表单数据中...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-username`}>用户名 *</Label>
              <Input
                id={`${formId}-username`}
                {...register('username')}
                placeholder="输入用户名"
                disabled={isEditing} // 编辑时不允许修改用户名
              />
              {(formErrors.username || errors.username) && (
                <p className="text-sm text-destructive">
                  {formErrors.username?.message || errors.username}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`${formId}-email`}>邮箱 *</Label>
              <Input
                id={`${formId}-email`}
                type="email"
                {...register('email')}
                placeholder="输入邮箱地址"
              />
              {(formErrors.email || errors.email) && (
                <p className="text-sm text-destructive">
                  {formErrors.email?.message || errors.email}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-full_name`}>真实姓名 *</Label>
            <Input
              id={`${formId}-full_name`}
              {...register('full_name')}
              placeholder="输入真实姓名"
            />
            {(formErrors.full_name || errors.full_name) && (
              <p className="text-sm text-destructive">
                {formErrors.full_name?.message || errors.full_name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-password`}>
              密码 {isEditing ? '(留空表示不修改)' : '*'}
            </Label>
            <PasswordInput
              id={`${formId}-password`}
              autoComplete="new-password"
              spellCheck={false}
              {...register('password')}
              placeholder={isEditing ? "留空表示不修改密码" : "输入密码"}
            />
            
            {/* 密码强度指示器 */}
            {currentPassword && !isEditing && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">密码强度要求：</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {checkPasswordStrength(currentPassword).items.map((item, index) => (
                    <div key={index} className={`flex items-center gap-1 ${item.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      <div className={`w-2 h-2 rounded-full ${item.met ? 'bg-green-500' : 'bg-muted-foreground/40'}`}></div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs">
                  <span className={currentPassword.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                    ✓ 至少6个字符 ({currentPassword.length}/6)
                  </span>
                </div>
                <div className="text-xs">
                  <span className={checkPasswordStrength(currentPassword).score >= 3 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                    {checkPasswordStrength(currentPassword).score >= 3 
                      ? '✓ 密码强度符合要求' 
                      : `需要至少3种类型 (${checkPasswordStrength(currentPassword).score}/3)`
                    }
                  </span>
                </div>
              </div>
            )}
            
            {(formErrors.password || errors.password) && (
              <p className="text-sm text-destructive">
                {formErrors.password?.message || errors.password}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">组织信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>租户</Label>
              <SearchableSelect
                options={tenantOptions}
                value={selectedTenant ? [selectedTenant] : []}
                placeholder={tenantOptions.length > 0 ? "选择租户" : "加载中..."}
                searchPlaceholder="搜索租户..."
                multiple={false}
                disabled={tenantOptions.length === 0}
                onValueChange={(value) => setValue('tenant_id', value[0] || '')}
              />
            </div>
            
            <div className="space-y-2">
              <Label>组织</Label>
              <SearchableSelect
                options={organizationOptions}
                value={selectedOrganization ? [selectedOrganization] : []}
                placeholder={organizationOptions.length > 0 ? "选择组织" : "加载中..."}
                searchPlaceholder="搜索组织..."
                multiple={false}
                disabled={organizationOptions.length === 0}
                onValueChange={(value) => setValue('organization_id', value[0] || '')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>部门/团队</Label>
              <SearchableSelect
                options={teamOptions}
                value={selectedTeam ? [selectedTeam] : []}
                placeholder={teamOptions.length > 0 ? "选择部门" : "加载中..."}
                searchPlaceholder="搜索部门..."
                multiple={false}
                disabled={teamOptions.length === 0}
                onValueChange={(value) => setValue('team_id', value[0] || '')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`${formId}-phone`}>联系电话</Label>
              <Input
                id={`${formId}-phone`}
                {...register('phone')}
                placeholder="输入联系电话"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>角色权限</Label>
            <SearchableSelect
              options={roleOptions}
              value={selectedRoles || []}
              placeholder={roleOptions.length > 0 ? "选择角色" : "加载中..."}
              searchPlaceholder="搜索角色..."
              multiple={true}
              maxSelectedDisplay={3}
              disabled={roleOptions.length === 0}
              onValueChange={(value) => setValue('roles', value)}
            />
            <p className="text-sm text-muted-foreground">
              可选择多个角色，系统将合并所有角色权限
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">权限设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
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

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          disabled={loading}
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          取消
        </Button>
        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full sm:w-auto"
          size="lg"
        >
          {loading && <IconLoader2 size={16} className="mr-2 animate-spin" />}
          {isEditing ? '更新用户' : '创建用户'}
        </Button>
      </div>
    </form>
  )
}