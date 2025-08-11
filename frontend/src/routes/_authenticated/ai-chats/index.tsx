import { createFileRoute } from '@tanstack/react-router'
import AIChat from '@/features/ai-chat'

export const Route = createFileRoute('/_authenticated/ai-chats/')({
  component: AIChat,
})