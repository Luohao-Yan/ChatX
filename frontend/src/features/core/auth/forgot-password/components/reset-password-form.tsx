import { HTMLAttributes, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
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
import { useAuth } from '@/stores/auth'

type ResetPasswordFormProps = HTMLAttributes<HTMLFormElement> & {
  email?: string
}

export function ResetPasswordForm({ className, email = '', ...props }: ResetPasswordFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const formSchema = z.object({
    email: z.string()
      .min(1, t('auth.errors.emailRequired'))
      .email(t('auth.errors.invalidEmail')),
    verificationCode: z.string()
      .min(1, t('auth.resetPassword.verificationCodeRequired'))
      .length(6, t('auth.resetPassword.verificationCodeLength')),
    newPassword: z.string()
      .min(8, t('auth.errors.passwordTooShort'))
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, t('auth.errors.passwordFormat')),
    confirmPassword: z.string()
      .min(1, t('auth.resetPassword.confirmPasswordRequired')),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('auth.errors.passwordsDoNotMatch'),
    path: ['confirmPassword'],
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      email: email,
      verificationCode: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    try {
      const result = await resetPassword(data.email, data.verificationCode, data.newPassword)
      toast.success(result.message || t('auth.resetPassword.success'))
      
      // 延迟跳转到登录页面
      setTimeout(() => {
        navigate({ to: '/sign-in' })
      }, 2000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.errors.unknownError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem className='space-y-1'>
              <FormLabel>{t('auth.resetPassword.emailLabel')}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('auth.resetPassword.emailPlaceholder')} 
                  {...field}
                  disabled={!!email}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name='verificationCode'
          render={({ field }) => (
            <FormItem className='space-y-1'>
              <FormLabel>{t('auth.resetPassword.verificationCodeLabel')}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('auth.resetPassword.verificationCodePlaceholder')} 
                  {...field}
                  maxLength={6}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name='newPassword'
          render={({ field }) => (
            <FormItem className='space-y-1'>
              <FormLabel>{t('auth.resetPassword.newPasswordLabel')}</FormLabel>
              <FormControl>
                <Input 
                  type="password"
                  placeholder={t('auth.resetPassword.newPasswordPlaceholder')} 
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem className='space-y-1'>
              <FormLabel>{t('auth.resetPassword.confirmPasswordLabel')}</FormLabel>
              <FormControl>
                <Input 
                  type="password"
                  placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')} 
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? t('auth.resetPassword.resetting') : t('auth.resetPassword.resetPassword')}
        </Button>
      </form>
    </Form>
  )
}