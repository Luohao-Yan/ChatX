import { createFileRoute } from '@tanstack/react-router'
import OrganizationHierarchy from '@/features/management/organization/hierarchy'

export const Route = createFileRoute('/_authenticated/management/organization/hierarchy')({
  component: OrganizationHierarchy,
})