import { useTranslation } from 'react-i18next'
import { McpForm } from './mcp-form'

export default function SettingsMcp() {
  const { t } = useTranslation()
  
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>{t('mcp.title')}</h3>
        <p className='text-muted-foreground text-sm'>{t('mcp.description')}</p>
      </div>
      <div className='my-4 flex-none border-t' />
      <div className='faded-bottom flex-1 w-full overflow-y-auto scroll-smooth pr-4 pb-12 h-0'>
        <div className='w-full'>
          <McpForm />
        </div>
      </div>
    </div>
  )
}