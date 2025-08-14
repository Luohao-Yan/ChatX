import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IconArrowDown } from '@tabler/icons-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useTranslation } from 'react-i18next'
import { AIChatInput } from './components/ai-chat-input'
import { MessageList, type Message } from './components/message-bubble'
import { WelcomeScreen } from './components/welcome-screen'

// Mock function to simulate AI response
const simulateAIResponse = async (userMessage: string): Promise<string> => {
  // Simulate thinking time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
  
  // Mock responses based on user input
  if (userMessage.includes('AI') || userMessage.includes('人工智能')) {
    return `人工智能未来5-10年的发展

关键点:

• 研究表明，人工智能（AI）在未来5-10年内可能会实现通用人工智能（AGI），使AI能够像人类一样理解和学习多种任务。

• 证据倾向于AI将在教育、医疗、金融、法律和交通等领域带来重大变革，可能提高效率但也可能引发就业争议。

• 看起来AI市场预计将大幅增长，潜在经济价值可达每年4.4万亿美元，但隐私和伦理问题可能引发争议。

• 2025年已有显著进展，包括政策制定和国防领域的AI应用，显示AI正快速融入社会。

技术进展

AI预计将在未来几年取得重大突破，尤其是在多模态和代理式AI方面。这些技术将使AI能够同时处理文本、图像、视频和音频，并自主执行复杂任务，如自动化决策和内容生成。通用人工智能（AGI）的实现可能在2025年或之后出现，这将使AI具备接近人类水平的智能。`
  }
  
  // Default response
  return `我收到了你的消息："${userMessage}"。我是一个AI助手，很高兴与你对话！有什么我可以帮助你的吗？`
}

export default function AIChat() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const breadcrumbItems = [
    { label: t('nav.chats') }
  ]

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Check if user is at bottom of scroll area
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const threshold = 50 // Show button when 50px away from bottom
      const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold
      setShowScrollToBottom(!isAtBottom && messages.length > 0)
    }
  }

  const scrollToBottom = (smooth = false) => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current
      if (smooth) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: 'smooth'
        })
      } else {
        // Force immediate scroll for new messages
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }, 0)
      }
    }
  }

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Add temporary AI message with thinking indicator
    const tempAIMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isThinking: true,
      thinkingTime: '6m 12s'
    }
    
    setMessages(prev => [...prev, tempAIMessage])

    try {
      // Get AI response
      const response = await simulateAIResponse(content)
      
      // Update the temporary message with actual response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAIMessage.id 
            ? { ...msg, content: response, isThinking: false }
            : msg
        )
      )
    } catch (_error) {
      // Handle error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAIMessage.id 
            ? { ...msg, content: '抱歉，我现在无法回复。请稍后再试。', isThinking: false }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }


  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    // TODO: Show toast notification
  }

  const handleLike = (_messageId: string) => {
    // TODO: Implement like functionality
  }

  const handleDislike = (_messageId: string) => {
    // TODO: Implement dislike functionality
  }

  const handleRegenerate = (_messageId: string) => {
    // TODO: Implement regenerate functionality
  }

  const handleShare = (_messageId: string) => {
    // TODO: Implement share functionality
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header className="shrink-0">
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
      </Header>

      {/* Main Content */}
      <Main className="flex-1 flex flex-col min-h-0">
        {!hasMessages ? (
          // Welcome Screen - Full height when no messages
          <div className="flex-1">
            <WelcomeScreen 
              onSendMessage={handleSendMessage}
              disabled={isLoading}
            />
          </div>
        ) : (
          // Chat Mode - Messages + Fixed Input
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-hidden relative">
              <div 
                ref={scrollRef}
                className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                onScroll={handleScroll}
              >
                <div className="pb-4">
                  <MessageList
                    messages={messages}
                    onCopy={handleCopy}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    onRegenerate={handleRegenerate}
                    onShare={handleShare}
                  />
                </div>
              </div>

              {/* Scroll to Bottom Button */}
              {showScrollToBottom && (
                <div className="absolute bottom-4 right-4 z-10">
                  <Button
                    size="icon"
                    variant="default"
                    className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 border border-border/20"
                    onClick={() => scrollToBottom(true)}
                  >
                    <IconArrowDown size={16} />
                  </Button>
                </div>
              )}
            </div>

            {/* Fixed Input Area */}
            <div className="shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container max-w-4xl py-4">
                <AIChatInput
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                  placeholder="继续对话..."
                />
              </div>
            </div>
          </>
        )}
      </Main>
    </div>
  )
}