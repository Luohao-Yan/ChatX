import { createFileRoute } from '@tanstack/react-router'
import PasswordPolicyManagement from '@/features/management/security/password-policies'

export const Route = createFileRoute('/_authenticated/management/security/password-policies')({
  component: PasswordPolicyManagement,
})