import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitch } from '@/components/theme-switch'
import ViteLogo from '@/assets/vite.svg'
import { UserAuthForm } from './components/user-auth-form'

export default function SignIn2() {
  const { t } = useTranslation()
  
  return (
    <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      {/* Top controls */}
      <div className='absolute top-4 right-4 z-30 flex items-center gap-2'>
        <LanguageSwitcher />
        <ThemeSwitch />
      </div>

      <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-zinc-900' />
        <div className='relative z-20 flex items-center text-lg font-medium'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mr-2 h-6 w-6'
          >
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg>
          ChatX
        </div>

        <img
          src={ViteLogo}
          className='relative m-auto'
          width={301}
          height={60}
          alt='Vite'
        />

        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo;{t('auth.testimonial.quote', { 
                defaultValue: 'This template has saved me countless hours of work and helped me deliver stunning designs to my clients faster than ever before.' 
              })}&rdquo;
            </p>
            <footer className='text-sm'>{t('auth.testimonial.author', { defaultValue: 'John Doe' })}</footer>
          </blockquote>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]'>
          <div className='flex flex-col space-y-2 text-left'>
            <h1 className='text-2xl font-semibold tracking-tight'>{t('auth.signInTitle')}</h1>
            <p className='text-muted-foreground text-sm'>
              {t('auth.signInDescription', { 
                defaultValue: 'Enter your email and password below to log into your account' 
              })}
              <br />
              <span className="mt-2 block">
                {t('auth.noAccount', { defaultValue: "Don't have an account?" })}{' '}
                <Link
                  to='/sign-up'
                  className='hover:text-primary underline underline-offset-4 font-medium'
                >
                  {t('auth.signUpLink', { defaultValue: 'Sign up' })}
                </Link>
              </span>
            </p>
          </div>
          <UserAuthForm />
          <p className='text-muted-foreground px-8 text-center text-sm'>
            {t('auth.termsAgreement', {
              defaultValue: 'By clicking login, you agree to our Terms of Service and Privacy Policy.'
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
