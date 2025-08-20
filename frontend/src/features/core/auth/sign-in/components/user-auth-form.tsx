import { HTMLAttributes, useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth, useAuthError } from '@/hooks/use-auth'
import { AuthErrorType } from '@/config/auth-config'
import { deviceManager } from '@/services/auth'
import { toast } from 'sonner'
import { OAuthLogin } from '@/features/core/auth/oauth'

type UserAuthFormProps = HTMLAttributes<HTMLFormElement>

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const search = useSearch({ strict: false }) as { returnUrl?: string }
  const { login, isLoading, isLocked } = useAuth()
  const { error, shouldShowError, clearError, dismissError } = useAuthError()
  const [showPassword, setShowPassword] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)

  const formSchema = z.object({
    identifier: z
      .string()
      .min(1, t('auth.errors.identifierRequired', { defaultValue: 'Please enter your username, email, or phone number' }))
      .refine((value) => {
        // 支持邮箱、手机号或用户名
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const phonePattern = /^1[3-9]\d{9}$/
        const usernamePattern = /^[a-zA-Z0-9_-]{3,20}$/
        
        return emailPattern.test(value) || phonePattern.test(value) || usernamePattern.test(value)
      }, {
        message: t('auth.errors.invalidIdentifier', { defaultValue: 'Please enter a valid email, phone number, or username' })
      }),
    password: z
      .string()
      .min(1, t('auth.errors.passwordRequired'))
      .min(6, t('auth.errors.passwordMinLength')),
    rememberMe: z.boolean().default(false),
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: false,
    },
    mode: 'onBlur' as const,
  })
  
  // 监听表单变化，清除错误
  useEffect(() => {
    const subscription = form.watch(() => {
      if (error) {
        clearError()
      }
    })
    return () => subscription.unsubscribe()
  }, [form, error, clearError])

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      
      // 准备登录数据
      const loginData = {
        identifier: data.identifier, // 后端会自动识别是邮箱、手机号还是用户名
        password: data.password,
        rememberMe: data.rememberMe,
        deviceInfo: deviceManager.getDeviceInfo(),
      }
      
      await login(loginData)
      
      toast.success(t('auth.loginSuccess'))
      
      // 登录成功后跳转
      const redirectUrl = search.returnUrl || '/'
      
      router.navigate({ to: redirectUrl })
      
    } catch (_loginError: unknown) {
      setLoginAttempts(prev => prev + 1)
      
      // 错误已经在store中处理，这里只需要显示toast
      if (error?.type === AuthErrorType.INVALID_CREDENTIALS) {
        toast.error(t('auth.errors.invalidCredentials'))
      } else if (error?.type === AuthErrorType.TOO_MANY_ATTEMPTS) {
        toast.error(t('auth.errors.tooManyAttempts'))
      } else if (error?.type === AuthErrorType.ACCOUNT_LOCKED) {
        toast.error(t('auth.errors.accountLocked'))
      } else {
        toast.error(error?.message || t('auth.errors.unknownError'))
      }
    }
  }
  
  // 处理忘记密码
  const handleForgotPassword = () => {
    router.navigate({ to: '/forgot-password' })
  }
  
  
  // 处理错误关闭
  const handleErrorDismiss = () => {
    if (error) {
      dismissError(error.type)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        {...props}
      >
        {/* 错误提示 */}
        {shouldShowError() && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex items-center justify-between">
              <span>{error?.message}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleErrorDismiss}
                className="h-auto p-1"
              >
                ×
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* 账户锁定提示 */}
        {isLocked && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              账户已被锁定，请稍后再试或联系管理员
            </AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name='identifier'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.identifier', { defaultValue: 'Username/Email/Phone' })}</FormLabel>
              <FormControl>
                <Input 
                  type="text"
                  placeholder={t('auth.identifierPlaceholder', { defaultValue: 'Enter your username, email, or phone number' })}
                  autoComplete="username"
                  disabled={isLoading || isLocked}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{t('auth.password')}</FormLabel>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={handleForgotPassword}
                >
                  {t('auth.forgotPasswordLink')}
                </Button>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.passwordPlaceholder')}
                    autoComplete="current-password"
                    disabled={isLoading || isLocked}
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isLocked}
                  >
                    {showPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* 记住我选项 */}
        <FormField
          control={form.control}
          name='rememberMe'
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading || isLocked}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  {t('auth.rememberMe')}
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  {t('auth.rememberMeDescription')}
                </p>
              </div>
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className='w-full' 
          disabled={isLoading || isLocked}
        >
          {isLoading ? t('common.loading') : t('auth.signInButton')}
        </Button>

        {/* OAuth第三方登录 */}
        <OAuthLogin 
          className="mt-4"
          onSuccess={() => {
            // OAuth登录成功后的回调会在hook中处理
          }}
          onError={(error) => {
            toast.error(error)
          }}
        />
        
        {/* 登录尝试次数提示 */}
        {loginAttempts > 2 && !isLocked && (
          <Alert variant="default" className="mt-4">
            <AlertDescription className="text-sm">
              {t('auth.errors.tooManyAttempts')}
            </AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  )
}
