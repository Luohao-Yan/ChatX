import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const createAiModelSchema = (t: any) => z.object({
  name: z.string().min(1, t('aiModels.validation.nameRequired')),
  provider: z.string().min(1, t('aiModels.validation.providerRequired')),
  modelId: z.string().min(1, t('aiModels.validation.modelIdRequired')),
  apiEndpoint: z.string().url(t('aiModels.validation.apiEndpointInvalid')),
  description: z.string().optional(),
  enabled: z.boolean(),
  type: z.enum(['chat', 'embedding', 'image']),
  tokenLimit: z.number().min(1, t('aiModels.validation.tokenLimitMin')),
  pricePerToken: z.number().min(0, t('aiModels.validation.pricePerTokenMin')).optional(),
})

type AiModelFormValues = {
  name: string
  provider: string
  modelId: string
  apiEndpoint: string
  description?: string
  enabled: boolean
  type: 'chat' | 'embedding' | 'image'
  tokenLimit: number
  pricePerToken?: number
}

interface AiModelFormProps {
  initialData?: any
  onSubmit: (data: AiModelFormValues | any) => void
}

const getProviders = (t: any) => [
  { value: 'OpenAI', label: t('aiModels.providers.OpenAI') },
  { value: 'Anthropic', label: t('aiModels.providers.Anthropic') },
  { value: 'Google', label: t('aiModels.providers.Google') },
  { value: 'Azure', label: t('aiModels.providers.Azure') },
  { value: 'Hugging Face', label: t('aiModels.providers.Hugging Face') },
  { value: 'Cohere', label: t('aiModels.providers.Cohere') },
  { value: 'Custom', label: t('aiModels.providers.Custom') },
]

const getModelTypes = (t: any) => [
  { value: 'chat', label: t('aiModels.types.chat') },
  { value: 'embedding', label: t('aiModels.types.embedding') },
  { value: 'image', label: t('aiModels.types.image') },
]

export function AiModelForm({ initialData, onSubmit }: AiModelFormProps) {
  const { t } = useTranslation()
  const aiModelSchema = createAiModelSchema(t)
  const providers = getProviders(t)
  const modelTypes = getModelTypes(t)
  
  const form = useForm<AiModelFormValues>({
    resolver: zodResolver(aiModelSchema),
    defaultValues: {
      name: initialData?.name || '',
      provider: initialData?.provider || '',
      modelId: initialData?.modelId || '',
      apiEndpoint: initialData?.apiEndpoint || '',
      description: initialData?.description || '',
      enabled: initialData?.enabled ?? true,
      type: initialData?.type || 'chat',
      tokenLimit: initialData?.tokenLimit || 4096,
      pricePerToken: initialData?.pricePerToken || undefined,
    },
  })

  const handleSubmit = (data: AiModelFormValues) => {
    if (initialData) {
      onSubmit({ ...initialData, ...data })
    } else {
      onSubmit(data)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('aiModels.modelName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('aiModels.modelNamePlaceholder')} {...field} />
                </FormControl>
                <FormDescription>
                  {t('aiModels.modelNameDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('aiModels.provider')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('aiModels.providerPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('aiModels.providerDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="modelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('aiModels.modelId')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('aiModels.modelIdPlaceholder')} {...field} />
                </FormControl>
                <FormDescription>
                  {t('aiModels.modelIdDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('aiModels.modelType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('aiModels.modelTypePlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {modelTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('aiModels.modelTypeDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="apiEndpoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('aiModels.apiEndpoint')}</FormLabel>
              <FormControl>
                <Input placeholder={t('aiModels.apiEndpointPlaceholder')} {...field} />
              </FormControl>
              <FormDescription>
                {t('aiModels.apiEndpointDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('aiModels.description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('aiModels.descriptionPlaceholder')}
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('aiModels.descriptionDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="tokenLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('aiModels.tokenLimit')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t('aiModels.tokenLimitPlaceholder')}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  {t('aiModels.tokenLimitDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricePerToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('aiModels.pricePerToken')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder={t('aiModels.pricePerTokenPlaceholder')}
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                  />
                </FormControl>
                <FormDescription>
                  {t('aiModels.pricePerTokenDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('aiModels.enabled')}</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-sm text-muted-foreground">
                      {field.value ? t('aiModels.enabled_true') : t('aiModels.enabled_false')}
                    </span>
                  </div>
                </FormControl>
                <FormDescription>
                  {t('aiModels.enabledDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit">
            {initialData ? t('aiModels.updateModel') : t('aiModels.addModel')}
          </Button>
        </div>
      </form>
    </Form>
  )
}