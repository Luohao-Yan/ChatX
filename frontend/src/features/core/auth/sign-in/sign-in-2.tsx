import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitch } from '@/components/theme-switch'
import { SystemLogoLarge } from '@/components/system-logo'
import { AdaptiveLogo } from '@/components/adaptive-logo'
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
        <div className='relative z-20'>
          <div className="inline-flex items-center" style={{
            filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 25px rgba(255, 255, 255, 0.25)) drop-shadow(0 0 35px rgba(255, 255, 255, 0.15))'
          }}>
            <AdaptiveLogo 
              size={48} 
              showText={true} 
              textClassName="text-xl font-semibold text-white ml-3"
            />
          </div>
        </div>

        <div className="relative m-auto flex items-center justify-center min-h-[200px]">
          <SystemLogoLarge 
            className="max-h-48 w-auto"
            alt="ChatX System Logo"
            fallbackSrc="/placeholder-logo.svg"
          />
        </div>

        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo;{t('auth.testimonial.quote', { 
                defaultValue: 'This is an AI Chat application template specifically tailored for oneself.' 
              })}&rdquo;
            </p>
            <footer className='text-sm'>{t('auth.testimonial.author', { defaultValue: 'Yan Luohao' })}</footer>
          </blockquote>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]'>
          {/* 移动端Logo显示 */}
          <div className='flex flex-col items-center space-y-6 lg:hidden'>
            <AdaptiveLogo 
              size={64} 
              showText={true} 
              textClassName="text-3xl font-bold ml-3"
            />
          </div>
          
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
