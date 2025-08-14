import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function MaintenanceError() {
  const { t } = useTranslation()
  
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>503</h1>
        <span className='font-medium'>{t('errors.503.heading')}</span>
        <p className='text-muted-foreground text-center'>
          {t('errors.503.description')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => window.location.reload()}>
            {t('errors.503.action')}
          </Button>
          <Button onClick={() => window.location.href = '/'}>
            {t('errors.503.backHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}
