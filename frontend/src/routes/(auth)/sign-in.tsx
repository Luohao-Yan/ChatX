import { createFileRoute, redirect } from '@tanstack/react-router'
import SignIn from '@/features/core/auth/sign-in'

export const Route = createFileRoute('/(auth)/sign-in')({
  beforeLoad: () => {
    // Check user's login layout preference
    const loginLayout = localStorage.getItem('login-layout')
    if (loginLayout === 'double-column') {
      throw redirect({ to: '/sign-in-2' })
    }
  },
  component: SignIn,
})
