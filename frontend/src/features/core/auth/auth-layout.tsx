import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitch } from '@/components/theme-switch'
import { AdaptiveLogo } from '@/components/adaptive-logo'

interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {

  return (
    <div className='bg-primary-foreground container grid h-svh max-w-none items-center justify-center'>
      {/* Top controls */}
      <div className='absolute top-4 right-4 flex items-center gap-2'>
        <LanguageSwitcher />
        <ThemeSwitch />
      </div>
      
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[480px] sm:p-8'>
        <div className='mb-4 flex items-center justify-center'>
          <AdaptiveLogo 
            size={56} 
            showText={true} 
            textClassName="text-2xl font-semibold ml-3"
            className="flex items-center"
          />
        </div>
        {children}
      </div>
    </div>
  )
}
