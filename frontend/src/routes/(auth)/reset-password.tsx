import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ResetPasswordPage } from '@/features/core/auth/forgot-password/reset-password'

const resetPasswordSearchSchema = z.object({
  email: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/reset-password')({
  component: () => <ResetPasswordPage className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]" />,
  validateSearch: resetPasswordSearchSchema,
})