import { createFileRoute } from '@tanstack/react-router'
import SystemConfig from '@/features/management/system/config/index'

export const Route = createFileRoute('/_authenticated/management/system/config')({
  component: SystemConfig,
})