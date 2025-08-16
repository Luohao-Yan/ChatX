import { createFileRoute } from '@tanstack/react-router'
import { RecycleBinPage } from '@/features/users/components/recycle-bin-page'

export const Route = createFileRoute('/_authenticated/management/users/recycle-bin')({
  component: RecycleBinPage,
})