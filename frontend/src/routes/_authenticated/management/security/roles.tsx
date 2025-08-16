import { createFileRoute } from '@tanstack/react-router'
import RolesManagement from '@/features/management/security/roles'

export const Route = createFileRoute('/_authenticated/management/security/roles')({
  component: RolesManagement,
})