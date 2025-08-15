import { createFileRoute } from '@tanstack/react-router'
import AiModelsManagement from '@/features/management/ai-models'

export const Route = createFileRoute('/_authenticated/management/ai-models')({
  component: AiModelsManagement,
})