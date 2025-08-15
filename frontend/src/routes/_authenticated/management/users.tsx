import { createFileRoute } from '@tanstack/react-router'
import UsersManagement from '@/features/management/users'

export const Route = createFileRoute('/_authenticated/management/users')({
  component: () => <UsersManagement />,
})