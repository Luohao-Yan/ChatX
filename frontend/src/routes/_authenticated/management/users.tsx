import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/management/users')({
  beforeLoad: () => {
    throw redirect({
      to: '/_authenticated/management/organization/users',
      replace: true,
    })
  },
})