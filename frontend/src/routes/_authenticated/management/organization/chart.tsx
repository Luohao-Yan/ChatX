import { createFileRoute } from '@tanstack/react-router'
import OrganizationChart from '@/features/management/organization/chart'

export const Route = createFileRoute('/_authenticated/management/organization/chart')({
  component: OrganizationChart,
})