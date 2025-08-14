import { useState, useRef, useEffect } from 'react'
import { IconMicrophone, IconArrowUp, IconPaperclip, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'

interface AIChatInputProps {
  onSendMessage?: (message: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

interface Skill {
  id: string
  name: string
  description: string
  isActive?: boolean
}

const defaultSkills: Skill[] = [
  { id: 'auto', name: '自动', description: '智能选择最适合的技能', isActive: true },
  { id: 'deep-thinking', name: '深度思考', description: '进行深入的分析和推理' },
  { id: 'creative', name: '创意写作', description: '生成创意内容和文案' },
  { id: 'code', name: '代码助手', description: '编程和技术问题解答' },
]

export function AIChatInput({
  onSendMessage,
  placeholder = "发消息，输入 @ 或 / 选择技能",
  disabled = false,
  className,
}: AIChatInputProps) {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<Skill>(defaultSkills[0])
  const [showSkills, setShowSkills] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage?.(message.trim())
      setMessage('')
      setShowSkills(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    
    // Show skills on @ or /
    if (e.key === '@' || e.key === '/') {
      setShowSkills(true)
    }
    
    // Hide skills on Escape
    if (e.key === 'Escape') {
      setShowSkills(false)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    
    // Check for @ or / at the end
    if (value.endsWith('@') || value.endsWith('/')) {
      setShowSkills(true)
    } else if (!value.includes('@') && !value.includes('/')) {
      setShowSkills(false)
    }
  }

  const selectSkill = (skill: Skill) => {
    setSelectedSkill(skill)
    setShowSkills(false)
    
    // Remove @ or / from message if present
    const cleanMessage = message.replace(/[@/]\s*$/, '')
    setMessage(cleanMessage)
    
    // Focus back to textarea
    textareaRef.current?.focus()
  }

  const handleMicrophoneClick = () => {
    setIsRecording(!isRecording)
    // TODO: Implement voice recording functionality
  }

  const canSend = message.trim().length > 0 && !disabled

  return (
    <div className={cn("relative w-full max-w-4xl mx-auto", className)}>
      {/* Skills Selection Dropdown */}
      {showSkills && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-background border border-border shadow-lg max-h-60 overflow-y-auto z-50 rounded-md">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-sm font-medium text-muted-foreground">选择技能</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSkills(false)}
              className="h-6 w-6 rounded-full"
            >
              <IconX size={12} />
            </Button>
          </div>
          <div className="space-y-1">
            {defaultSkills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => selectSkill(skill)}
                className={cn(
                  "w-full text-left px-3 py-2 hover:bg-accent transition-colors",
                  selectedSkill.id === skill.id && "bg-primary/10 border border-primary/20"
                )}
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                <div className="font-medium text-sm">{skill.name}</div>
                <div className="text-xs text-muted-foreground">{skill.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          {/* Selected Skill Badge */}
          {selectedSkill.id !== 'auto' && (
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-sm rounded-md">
                <span className="font-medium">{selectedSkill.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSkill(defaultSkills[0])}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <IconX size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Main Input Container - Vertical Layout */}
          <div className="relative border border-border/40 bg-background shadow-sm hover:shadow-md focus-within:shadow-lg focus-within:border-border transition-all duration-300 hover:border-border/60 rounded-xl" >
            {/* Text input area */}
            <div className="p-4 pb-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className={cn(
                  "w-full resize-none border-0 bg-transparent text-sm placeholder:text-muted-foreground/70",
                  "focus:outline-none focus:ring-0 leading-5",
                  "scrollbar-none overflow-y-auto max-h-[120px]"
                )}
                style={{ 
                  minHeight: '24px'
                }}
              />
            </div>

            {/* Action buttons area */}
            <div className="flex items-center justify-between px-4 pb-4 pt-2">
              <div className="flex items-center gap-2">
                {/* Attachment button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full hover:bg-accent/80 transition-all duration-200"
                  disabled={disabled}
                >
                  <IconPaperclip size={16} className="text-muted-foreground" />
                </Button>

                {/* Microphone button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleMicrophoneClick}
                  className={cn(
                    "size-8 rounded-full transition-all duration-200",
                    isRecording 
                      ? "bg-red-100 hover:bg-red-200 dark:bg-red-950/30 dark:hover:bg-red-950/50" 
                      : "hover:bg-accent/80"
                  )}
                  disabled={disabled}
                >
                  <IconMicrophone 
                    size={16} 
                    className={cn(
                      "transition-colors duration-200",
                      isRecording ? "text-red-500" : "text-muted-foreground"
                    )} 
                  />
                </Button>
              </div>

              {/* Send button - Right aligned */}
              <Button
                type="submit"
                size="icon"
                disabled={!canSend}
                className={cn(
                  "size-8 rounded-full transition-all duration-300",
                  canSend
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:scale-105"
                    : "bg-muted hover:bg-muted/80 cursor-not-allowed text-muted-foreground shadow-sm"
                )}
              >
                <IconArrowUp size={14} className={cn(
                  "transition-transform duration-200",
                  canSend && "group-hover:translate-y-[-1px]"
                )} />
              </Button>
            </div>
          </div>

          {/* Helper text */}
          <div className="mt-2 px-4 text-xs text-muted-foreground/60">
            输入 @ 或 / 来选择 AI 技能 • Enter 发送，Shift+Enter 换行
          </div>
        </div>
      </form>
    </div>
  )
}