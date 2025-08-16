import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/_authenticated/management/system/config')({
  component: () => <ComingSoon feature="系统配置" />,
})