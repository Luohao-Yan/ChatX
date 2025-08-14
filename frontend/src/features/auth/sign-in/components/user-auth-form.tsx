import { HTMLAttributes, useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { IconBrandFacebook, IconBrandGithub, IconEye, IconEyeOff } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
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
import { deviceManager } from '@/lib/auth-utils'
import { toast } from 'sonner'

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
    email: z
      .string()
      .min(1, t('auth.errors.emailRequired'))
      .email(t('auth.errors.invalidEmail')),
    password: z
      .string()
      .min(1, t('auth.errors.passwordRequired'))
      .min(6, t('auth.errors.passwordMinLength')),
    rememberMe: z.boolean().default(false),
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
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
      console.log('🚀 [LOGIN] 开始登录流程', { email: data.email, rememberMe: data.rememberMe })
      
      // 准备登录数据
      const loginData = {
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
        deviceInfo: deviceManager.getDeviceInfo(),
      }
      
      console.log('📡 [LOGIN] 调用login函数', loginData)
      await login(loginData)
      console.log('✅ [LOGIN] login函数执行成功')
      
      toast.success(t('auth.loginSuccess'))
      
      // 登录成功后跳转
      const redirectUrl = search.returnUrl || '/'
      console.log('🔄 [LOGIN] 准备跳转到:', redirectUrl)
      console.log('🔍 [LOGIN] search对象详情:', search)
      console.log('🔍 [LOGIN] returnUrl值:', search.returnUrl)
      console.log('🌐 [LOGIN] 当前URL:', window.location.href)
      
      router.navigate({ to: redirectUrl })
      console.log('🎯 [LOGIN] 跳转命令已发送')
      
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
  
  // 处理社交登录（暂时未实现）
  const handleSocialLogin = (provider: 'github' | 'facebook') => {
    const providerName = provider === 'github' ? 'GitHub' : 'Facebook'
    toast.info(t('common.comingSoon', { feature: `${providerName} ${t('nav.signIn')}` }) || `${providerName} login coming soon`)
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
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.email')}</FormLabel>
              <FormControl>
                <Input 
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
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

        <div className='relative my-4'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background text-muted-foreground px-2'>
              {t('auth.orContinueWith')}
            </span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <Button 
            variant='outline' 
            type='button' 
            disabled={isLoading || isLocked}
            onClick={() => handleSocialLogin('github')}
            className="h-10"
          >
            <IconBrandGithub className='h-4 w-4 mr-2' /> 
            {t('auth.signInWithGithub')}
          </Button>
          <Button 
            variant='outline' 
            type='button' 
            disabled={isLoading || isLocked}
            onClick={() => handleSocialLogin('facebook')}
            className="h-10"
          >
            <IconBrandFacebook className='h-4 w-4 mr-2' /> 
            {t('auth.signInWithFacebook')}
          </Button>
        </div>
        
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
