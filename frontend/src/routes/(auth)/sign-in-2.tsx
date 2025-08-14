import { createFileRoute, redirect } from '@tanstack/react-router'
import SignIn2 from '@/features/core/auth/sign-in/sign-in-2'

export const Route = createFileRoute('/(auth)/sign-in-2')({
  beforeLoad: () => {
    // Check user's login layout preference
    const loginLayout = localStorage.getItem('login-layout')
    if (loginLayout === 'single-column') {
      throw redirect({ to: '/sign-in' })
    }
  },
  component: SignIn2,
})
