import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResetPasswordForm } from './components/reset-password-form'

interface ResetPasswordPageProps {
  className?: string
}

export function ResetPasswordPage({ className }: ResetPasswordPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/(auth)/reset-password' })
  const email = search?.email || ''

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col space-y-2 text-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('auth.resetPassword.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.resetPassword.description')}
        </p>
      </div>

      {/* Reset Password Form */}
      <ResetPasswordForm email={email} />

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <Button
          variant="ghost"
          className="text-sm"
          onClick={() => navigate({ to: '/sign-in' })}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t('auth.resetPassword.backToLogin')}
        </Button>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        {t('auth.resetPassword.noCodeReceived')}{' '}
        <Link
          to="/forgot-password"
          className="underline underline-offset-4 hover:text-primary"
        >
          {t('auth.resetPassword.resendCode')}
        </Link>
      </div>
    </div>
  )
}