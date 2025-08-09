import { useTranslation } from 'react-i18next'
import ContentSection from '../components/content-section'
import ProfileForm from './profile-form'

export default function SettingsProfile() {
  const { t } = useTranslation()
  
  return (
    <ContentSection
      title={t('settings.profile.title')}
      desc={t('settings.profile.description')}
    >
      <ProfileForm />
    </ContentSection>
  )
}
