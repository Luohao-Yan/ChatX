import { useTranslation } from 'react-i18next'
import ContentSection from '../components/content-section'
import { AccountForm } from './account-form'

export default function SettingsAccount() {
  const { t } = useTranslation()
  
  return (
    <ContentSection
      title={t('settings.account.title')}
      desc={t('settings.account.description')}
    >
      <AccountForm />
    </ContentSection>
  )
}
