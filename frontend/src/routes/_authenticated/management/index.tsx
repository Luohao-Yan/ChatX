import { createFileRoute } from '@tanstack/react-router'
import ManagementOverview from '@/features/management'

export const Route = createFileRoute('/_authenticated/management/')({
  component: ManagementOverview,
})