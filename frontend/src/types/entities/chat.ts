import { BaseEntity } from '../common'

export interface Conversation extends BaseEntity {
  title: string
  type: 'ai' | 'user'
  last_message?: string
  last_message_at?: string
  message_count: number
  is_archived: boolean
  is_pinned: boolean
  participants?: ConversationParticipant[]
  metadata?: {
    tags?: string[]
    category?: string
    priority?: 'low' | 'medium' | 'high'
  }
}

export interface ConversationParticipant {
  user_id: number
  username: string
  avatar_url?: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  last_read_at?: string
}

export interface Message extends BaseEntity {
  conversation_id: number
  sender_id?: number
  sender_type: 'user' | 'ai' | 'system'
  content: string
  content_type: 'text' | 'markdown' | 'html' | 'code' | 'image' | 'file'
  reply_to_id?: number
  is_edited: boolean
  edited_at?: string
  attachments?: MessageAttachment[]
  metadata?: {
    model?: string
    tokens?: number
    processing_time?: number
    confidence?: number
  }
}

export interface MessageAttachment {
  id: number
  filename: string
  file_size: number
  file_type: string
  url: string
  thumbnail_url?: string
  metadata?: {
    width?: number
    height?: number
    duration?: number
  }
}

export interface AIConfig {
  model: string
  temperature: number
  max_tokens: number
  top_p: number
  frequency_penalty: number
  presence_penalty: number
  system_prompt?: string
}

export interface ChatSession {
  id: string
  conversation_id: number
  ai_config: AIConfig
  context_messages: Message[]
  is_active: boolean
  started_at: string
  ended_at?: string
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
export type ConversationType = 'ai' | 'user' | 'group'
export type SenderType = 'user' | 'ai' | 'system'