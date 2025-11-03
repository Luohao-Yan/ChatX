import { createFileRoute } from '@tanstack/react-router'
import AIChat from '@/features/chat/ai-chat'

export const Route = createFileRoute('/_authenticated/')({
  component: AIChat,
})
