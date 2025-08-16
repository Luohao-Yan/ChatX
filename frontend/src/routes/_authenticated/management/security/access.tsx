import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/_authenticated/management/security/access')({
  component: () => <ComingSoon feature="访问控制管理" />,
})