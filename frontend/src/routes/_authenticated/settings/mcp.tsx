import { createFileRoute } from '@tanstack/react-router'
import SettingsMcp from '@/features/core/settings/mcp'

export const Route = createFileRoute('/_authenticated/settings/mcp')({
  component: SettingsMcp,
})