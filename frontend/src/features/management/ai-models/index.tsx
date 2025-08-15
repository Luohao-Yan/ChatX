import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconToggleLeft, 
  IconToggleRight,
  IconBrain,
  IconCloudComputing,
  IconRobot
} from '@tabler/icons-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AiModelForm } from './ai-model-form'

interface AiModel {
  id: string
  name: string
  provider: string
  modelId: string
  apiEndpoint: string
  description?: string
  enabled: boolean
  type: 'chat' | 'embedding' | 'image'
  tokenLimit: number
  pricePerToken?: number
  createdAt: string
  updatedAt: string
}

// 模拟数据
const initialModels: AiModel[] = [
  {
    id: '1',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    description: '最新的Claude模型，适合复杂任务处理',
    enabled: true,
    type: 'chat',
    tokenLimit: 200000,
    pricePerToken: 0.000003,
    createdAt: '2024-01-15 10:30:00',
    updatedAt: '2024-01-15 10:30:00'
  },
  {
    id: '2',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    modelId: 'gpt-4-turbo',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    description: 'OpenAI最强的对话模型',
    enabled: true,
    type: 'chat',
    tokenLimit: 128000,
    pricePerToken: 0.00001,
    createdAt: '2024-01-14 16:45:00',
    updatedAt: '2024-01-14 16:45:00'
  },
  {
    id: '3',
    name: 'Text Embedding 3 Large',
    provider: 'OpenAI',
    modelId: 'text-embedding-3-large',
    apiEndpoint: 'https://api.openai.com/v1/embeddings',
    description: '用于向量化文本的高精度嵌入模型',
    enabled: false,
    type: 'embedding',
    tokenLimit: 8192,
    pricePerToken: 0.00000013,
    createdAt: '2024-01-13 14:20:00',
    updatedAt: '2024-01-13 14:20:00'
  },
  {
    id: '4',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    modelId: 'dall-e-3',
    apiEndpoint: 'https://api.openai.com/v1/images/generations',
    description: '最新的图像生成模型',
    enabled: true,
    type: 'image',
    tokenLimit: 4000,
    createdAt: '2024-01-12 09:15:00',
    updatedAt: '2024-01-12 09:15:00'
  }
]

const getTypeIcon = (type: AiModel['type']) => {
  switch (type) {
    case 'chat':
      return <IconBrain size={16} />
    case 'embedding':
      return <IconCloudComputing size={16} />
    case 'image':
      return <IconRobot size={16} />
    default:
      return <IconBrain size={16} />
  }
}

const getTypeBadge = (type: AiModel['type'], t: any) => {
  const variants = {
    chat: 'default' as const,
    embedding: 'secondary' as const,
    image: 'outline' as const
  }
  
  return (
    <Badge variant={variants[type]}>
      {getTypeIcon(type)}
      <span className="ml-1">{t(`aiModels.types.${type}`)}</span>
    </Badge>
  )
}

export default function AiModelsManagement() {
  const { t } = useTranslation()
  const [models, setModels] = useState<AiModel[]>(initialModels)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<AiModel | null>(null)

  const breadcrumbItems = [
    { label: t('nav.managementCenter') },
    { label: t('aiModels.title') }
  ]

  const handleToggleEnabled = (id: string) => {
    setModels(prev => prev.map(model => 
      model.id === id 
        ? { ...model, enabled: !model.enabled, updatedAt: new Date().toLocaleString('zh-CN') }
        : model
    ))
  }

  const handleDelete = (id: string) => {
    setModels(prev => prev.filter(model => model.id !== id))
  }

  const handleAddModel = (modelData: Omit<AiModel, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newModel: AiModel = {
      ...modelData,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleString('zh-CN'),
      updatedAt: new Date().toLocaleString('zh-CN')
    }
    setModels(prev => [...prev, newModel])
    setIsAddDialogOpen(false)
  }

  const handleUpdateModel = (updatedModel: AiModel) => {
    setModels(prev => prev.map(model => 
      model.id === updatedModel.id 
        ? { ...updatedModel, updatedAt: new Date().toLocaleString('zh-CN') }
        : model
    ))
    setEditingModel(null)
  }

  return (
    <>
      <Header>
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
      </Header>

      <Main className="overflow-y-auto">
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('aiModels.title')}
          </h1>
          <p className='text-muted-foreground'>
            {t('aiModels.description')}
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('aiModels.stats.totalModels')}
              </CardTitle>
              <IconBrain size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{models.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('aiModels.stats.enabledModels')}
              </CardTitle>
              <IconToggleRight size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{models.filter(m => m.enabled).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('aiModels.stats.chatModels')}
              </CardTitle>
              <IconBrain size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{models.filter(m => m.type === 'chat').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('aiModels.stats.embeddingModels')}
              </CardTitle>
              <IconCloudComputing size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{models.filter(m => m.type === 'embedding').length}</div>
            </CardContent>
          </Card>
        </div>

        {/* 模型列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('aiModels.modelList')}</CardTitle>
                <CardDescription>
                  {t('aiModels.modelListDescription')}
                </CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <IconPlus size={16} className="mr-2" />
                    {t('aiModels.addModel')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('aiModels.addNewModel')}</DialogTitle>
                    <DialogDescription>
                      {t('aiModels.configureModel')}
                    </DialogDescription>
                  </DialogHeader>
                  <AiModelForm onSubmit={handleAddModel} />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('aiModels.table.modelInfo')}</TableHead>
                    <TableHead>{t('aiModels.table.provider')}</TableHead>
                    <TableHead>{t('aiModels.table.type')}</TableHead>
                    <TableHead>{t('aiModels.table.status')}</TableHead>
                    <TableHead>{t('aiModels.table.tokenLimit')}</TableHead>
                    <TableHead>{t('aiModels.table.lastUpdated')}</TableHead>
                    <TableHead>{t('aiModels.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {model.modelId}
                          </div>
                          {model.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {model.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{model.provider}</TableCell>
                      <TableCell>
                        {getTypeBadge(model.type, t)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={model.enabled ? 'default' : 'secondary'}>
                          {model.enabled ? t('aiModels.enabled_true') : t('aiModels.enabled_false')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {model.tokenLimit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {model.updatedAt}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleEnabled(model.id)}
                          >
                            {model.enabled ? (
                              <IconToggleRight size={16} className="text-green-600" />
                            ) : (
                              <IconToggleLeft size={16} className="text-gray-400" />
                            )}
                          </Button>
                          <Dialog 
                            open={editingModel?.id === model.id} 
                            onOpenChange={(open) => !open && setEditingModel(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingModel(model)}
                              >
                                <IconEdit size={16} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className=" sm:max-w-2xl md:max-w-4xl lg:max-w-5xl w-full overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>编辑 AI 模型</DialogTitle>
                                <DialogDescription>
                                  修改 AI 模型的配置参数
                                </DialogDescription>
                              </DialogHeader>
                              {editingModel && (
                                <AiModelForm 
                                  initialData={editingModel}
                                  onSubmit={handleUpdateModel}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(model.id)}
                          >
                            <IconTrash size={16} className="text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}