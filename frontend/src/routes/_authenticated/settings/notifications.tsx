import { createFileRoute } from '@tanstack/react-router'
import SettingsNotifications from '@/features/core/settings/notifications'

export const Route = createFileRoute('/_authenticated/settings/notifications')({
  component: SettingsNotifications,
})
