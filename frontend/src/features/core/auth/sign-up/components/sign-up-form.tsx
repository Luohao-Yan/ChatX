import { HTMLAttributes, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { PasswordInput } from '@/components/password-input'
import { OAuthLogin } from '@/features/core/auth/oauth'
import { PasswordStrengthIndicator } from '@/components/password-strength-indicator'
import { validatePassword, validateEmail, validateUsername, DEFAULT_PASSWORD_RULES } from '@/utils/password-validation'
import { AuthAPI } from '@/services/api/auth'

type SignUpFormProps = HTMLAttributes<HTMLFormElement>

export function SignUpForm({ className, ...props }: SignUpFormProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const formSchema = z
    .object({
      username: z
        .string()
        .min(1, t('auth.errors.usernameRequired', { defaultValue: 'Username is required' }))
        .refine((val) => {
          const validation = validateUsername(val)
          return validation.isValid
        }, {
          message: t('auth.errors.invalidUsername', { defaultValue: 'Please enter a valid username (3-20 characters, letters, numbers, underscore, hyphen)' })
        }),
      email: z.string()
        .min(1, t('auth.errors.emailRequired'))
        .refine((val) => {
          const validation = validateEmail(val)
          return validation.isValid
        }, {
          message: t('auth.errors.invalidEmail', { defaultValue: 'Please enter a valid email address' })
        }),
      password: z
        .string()
        .min(1, t('auth.errors.passwordRequired'))
        .refine((val) => {
          const validation = validatePassword(val, DEFAULT_PASSWORD_RULES)
          return validation.isValid
        }, {
          message: t('auth.errors.weakPassword', { defaultValue: 'Password does not meet security requirements' })
        }),
      confirmPassword: z.string().min(1, t('auth.errors.confirmPasswordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.errors.passwordMismatch'),
      path: ['confirmPassword'],
    })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    try {
      // 调用实际的注册API
      const registerData = {
        username: data.username,
        email: data.email,
        password: data.password,
        full_name: data.username, // 使用username作为默认的全名
      }
      
      await AuthAPI.register(registerData)
      
      toast.success(t('auth.register.success', { defaultValue: 'Registration successful! Please check your email to verify your account.' }))
      
      // 注册成功后跳转到登录页
      router.navigate({ to: '/sign-in' })
      
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || t('auth.errors.registrationFailed', { defaultValue: 'Registration failed. Please try again.' })
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.username', { defaultValue: 'Username' })}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('auth.usernamePlaceholder', { defaultValue: 'Enter your username' })} 
                  disabled={isLoading}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  disabled={isLoading}
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
              <FormLabel>{t('auth.password')}</FormLabel>
              <FormControl>
                <PasswordInput 
                  placeholder={t('auth.passwordPlaceholder')} 
                  disabled={isLoading}
                  {...field} 
                />
              </FormControl>
              <PasswordStrengthIndicator 
                password={field.value} 
                rules={DEFAULT_PASSWORD_RULES}
                className="mt-2"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => {
            const password = form.watch('password')
            const isMatching = password === field.value
            const hasContent = field.value && field.value.length > 0
            
            return (
              <FormItem>
                <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput 
                    placeholder={t('auth.confirmPasswordPlaceholder')} 
                    disabled={isLoading}
                    {...field} 
                  />
                </FormControl>
                {/* 实时显示密码匹配状态 */}
                {hasContent && (
                  <div className="mt-2">
                    <div
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        isMatching ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isMatching ? (
                        <>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>密码匹配</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span>密码不匹配</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <Button className='mt-2' disabled={isLoading} type="submit">
          {isLoading ? t('common.loading') : t('auth.register.createAccountButton')}
        </Button>

        {/* OAuth第三方注册 */}
        <OAuthLogin 
          className="mt-4"
          onSuccess={() => {
            // OAuth注册成功后的回调会在hook中处理
          }}
          onError={(error) => {
            toast.error(error)
          }}
        />
      </form>
    </Form>
  )
}
