import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { IconCopy, IconThumbDown, IconThumbUp, IconRefresh, IconShare } from '@tabler/icons-react'
import { cn } from '@/utils/utils'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  isThinking?: boolean
  thinkingTime?: string
}

interface MessageBubbleProps {
  message: Message
  onCopy?: (content: string) => void
  onLike?: (messageId: string) => void
  onDislike?: (messageId: string) => void
  onRegenerate?: (messageId: string) => void
  onShare?: (messageId: string) => void
  className?: string
}

interface MessageActionsProps {
  message: Message
  onCopy?: (content: string) => void
  onLike?: (messageId: string) => void
  onDislike?: (messageId: string) => void
  onRegenerate?: (messageId: string) => void
  onShare?: (messageId: string) => void
}

function MessageActions({
  message,
  onCopy,
  onLike,
  onDislike,
  onRegenerate,
  onShare,
}: MessageActionsProps) {
  if (message.role === 'user') return null

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onCopy?.(message.content)}
        className="size-6 rounded-md hover:bg-accent"
      >
        <IconCopy size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onLike?.(message.id)}
        className="size-6 rounded-md hover:bg-accent"
      >
        <IconThumbUp size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDislike?.(message.id)}
        className="size-6 rounded-md hover:bg-accent"
      >
        <IconThumbDown size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRegenerate?.(message.id)}
        className="size-6 rounded-md hover:bg-accent"
      >
        <IconRefresh size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onShare?.(message.id)}
        className="size-6 rounded-md hover:bg-accent"
      >
        <IconShare size={14} />
      </Button>
    </div>
  )
}

function ThinkingIndicator({ time }: { time?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
      <div className="flex items-center gap-1">
        <div className="animate-spin size-4 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full" />
        <span>思考了 {time || '6m 12s'}</span>
      </div>
    </div>
  )
}

export function MessageBubble({
  message,
  onCopy,
  onLike,
  onDislike,
  onRegenerate,
  onShare,
  className,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn("group relative py-6", className)}>
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="shrink-0">
            <Avatar className="size-8">
              {isUser ? (
                <>
                  <AvatarImage src="/avatars/user.png" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    U
                  </AvatarFallback>
                </>
              ) : (
                <>
                  <AvatarImage src="/avatars/ai.png" />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                    AI
                  </AvatarFallback>
                </>
              )}
            </Avatar>
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {/* Show thinking indicator for assistant messages */}
            {!isUser && message.isThinking && (
              <ThinkingIndicator time={message.thinkingTime} />
            )}

            {/* Message text */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap break-words text-sm leading-6">
                {message.content}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3">
              <MessageActions
                message={message}
                onCopy={onCopy}
                onLike={onLike}
                onDislike={onDislike}
                onRegenerate={onRegenerate}
                onShare={onShare}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MessageListProps {
  messages: Message[]
  onCopy?: (content: string) => void
  onLike?: (messageId: string) => void
  onDislike?: (messageId: string) => void
  onRegenerate?: (messageId: string) => void
  onShare?: (messageId: string) => void
  className?: string
}

export function MessageList({
  messages,
  onCopy,
  onLike,
  onDislike,
  onRegenerate,
  onShare,
  className,
}: MessageListProps) {
  return (
    <div className={cn("divide-y divide-border/10 pt-4", className)}>
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCopy={onCopy}
          onLike={onLike}
          onDislike={onDislike}
          onRegenerate={onRegenerate}
          onShare={onShare}
        />
      ))}
    </div>
  )
}