import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/_authenticated/management/security/audit')({
  component: () => <ComingSoon feature="安全审计" />,
})