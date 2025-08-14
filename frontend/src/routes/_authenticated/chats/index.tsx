import { createFileRoute } from '@tanstack/react-router'
import Chats from '@/features/chat/conversations'

export const Route = createFileRoute('/_authenticated/chats/')({
  component: Chats,
})
