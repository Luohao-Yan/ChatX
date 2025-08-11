import { Button } from '@/components/ui/button'
import { IconPhoto, IconFileText, IconUser, IconPencil, IconBrain, IconCode } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { AIChatInput } from './ai-chat-input'

interface WelcomeScreenProps {
  className?: string
  onSendMessage?: (message: string) => void
  disabled?: boolean
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick?: () => void
}

function FeatureCard({ icon, title, description, onClick }: FeatureCardProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-auto p-4 flex flex-col gap-2 border-border hover:bg-accent/50 transition-all group text-left"
    >
      <div className="flex items-center gap-3 w-full">
        <div className="flex items-center justify-center size-8 rounded-lg bg-accent/50 group-hover:bg-accent transition-colors">
          {icon}
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
    </Button>
  )
}

const features = [
  {
    icon: <IconPencil size={16} className="text-primary" />,
    title: "帮我写作",
    description: "创意写作、文案、邮件等",
    prompt: "请帮我写一篇关于"
  },
  {
    icon: <IconBrain size={16} className="text-primary" />,
    title: "AI 搜索",
    description: "智能搜索和信息整理",
    prompt: "帮我搜索关于"
  },
  {
    icon: <IconCode size={16} className="text-primary" />,
    title: "代码助手",
    description: "编程、调试、代码解释",
    prompt: "请帮我写代码："
  },
  {
    icon: <IconPhoto size={16} className="text-primary" />,
    title: "图像生成",
    description: "AI生成和编辑图像",
    prompt: "请帮我生成一张图像："
  },
  {
    icon: <IconFileText size={16} className="text-primary" />,
    title: "文档分析",
    description: "分析、总结、翻译文档",
    prompt: "请帮我分析这个文档："
  },
  {
    icon: <IconUser size={16} className="text-primary" />,
    title: "角色扮演",
    description: "模拟不同身份进行对话",
    prompt: "请扮演一个"
  }
]

export function WelcomeScreen({ className, onSendMessage, disabled }: WelcomeScreenProps) {
  const handleFeatureClick = (prompt: string) => {
    onSendMessage?.(prompt)
  }

  return (
    <div className={cn("h-full flex items-center justify-center px-4 py-8", className)}>
      <div className="w-full max-w-6xl space-y-8">
        {/* Welcome Message */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-medium text-foreground">
            你好，我是ChatX
          </h1>
          <p className="text-base text-muted-foreground/80">
            你想知道什么？
          </p>
        </div>

        {/* Input Area */}
        <div className="max-w-4xl mx-auto">
          <AIChatInput
            onSendMessage={onSendMessage}
            disabled={disabled}
            placeholder="发消息，输入 @ 或 / 选择技能"
          />
        </div>

        {/* Feature Cards */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                onClick={() => handleFeatureClick(feature.prompt)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}