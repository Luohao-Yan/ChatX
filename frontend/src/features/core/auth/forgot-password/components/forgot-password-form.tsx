import { HTMLAttributes, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
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
import { useAuth } from '@/stores/auth'

type ForgotFormProps = HTMLAttributes<HTMLFormElement>

export function ForgotPasswordForm({ className, ...props }: ForgotFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { forgotPassword } = useAuth()

  const formSchema = z.object({
    email: z.string()
      .min(1, t('auth.errors.emailRequired'))
      .email(t('auth.errors.invalidEmail')),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    try {
      const result = await forgotPassword(data.email)
      toast.success(result.message || t('auth.forgotPassword.emailSent'))
      setEmailSent(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.errors.unknownError'))
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className={cn('text-center space-y-3', className)}>
        <div className="text-green-600 dark:text-green-400">
          ✅ {t('auth.forgotPassword.emailSentSuccess')}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('auth.forgotPassword.checkEmail')}
        </p>
        <Button 
          variant="outline" 
          onClick={() => {
            setEmailSent(false)
            form.reset()
          }}
        >
          {t('auth.forgotPassword.sendAnother')}
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem className='space-y-1'>
              <FormLabel>{t('auth.forgotPassword.emailLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('auth.forgotPassword.emailPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendResetLink')}
        </Button>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t('auth.forgotPassword.alreadyHaveCode')}{' '}
          <Link
            to="/reset-password"
            className="underline underline-offset-4 hover:text-primary"
            search={{ email: form.getValues('email') }}
          >
            {t('auth.forgotPassword.resetPassword')}
          </Link>
        </div>
      </form>
    </Form>
  )
}
