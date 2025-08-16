import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/_authenticated/management/system/integrations')({
  component: () => <ComingSoon feature="集成管理" />,
})