import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/management/ai-models')({
  beforeLoad: () => {
    throw redirect({
      to: '/_authenticated/management/system/ai-models',
      replace: true,
    })
  },
})