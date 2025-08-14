import { createFileRoute } from '@tanstack/react-router'
import ForgotPassword from '@/features/core/auth/forgot-password'

export const Route = createFileRoute('/(auth)/forgot-password')({
  component: ForgotPassword,
})
