import { z } from 'zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/utils'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { useEffect } from 'react'
import { getUserInfo } from '@/utils/userinfo'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const createProfileFormSchema = (t: any) => z.object({
  username: z
    .string(t('validation.required', { field: t('settings.profile.username') }))
    .min(2, t('validation.minLength', { field: t('settings.profile.username'), count: 2 }))
    .max(30, t('validation.maxLength', { field: t('settings.profile.username'), count: 30 })),
  email: z.email({
    error: (iss) =>
      iss.input === undefined
        ? t('validation.required', { field: t('settings.profile.email') })
        : undefined,
  }),
  bio: z.string().max(160).min(4),
  urls: z
    .array(
      z.object({
        value: z.url(t('validation.invalidUrl')),
      })
    )
    .optional(),
})

type ProfileFormValues = {
  username: string
  email: string
  bio: string
  urls?: { value: string }[]
}

export default function ProfileForm() {
  const { t } = useTranslation()
  const profileFormSchema = createProfileFormSchema(t)

  const userInfo = getUserInfo()

  // 从用户数据生成默认值
  const defaultValues: Partial<ProfileFormValues> = {
    username: userInfo?.username || '',
    email: userInfo?.email || '',
    bio: userInfo?.bio || '',
    urls: userInfo?.urls || [],
  }
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: 'onChange',
  })

  // 当用户数据加载后，更新表单默认值
  useEffect(() => {
    const currentUserInfo = getUserInfo()
    if (currentUserInfo) {
      form.reset({
        username: currentUserInfo.username || '',
        email: currentUserInfo.email || '',
        bio: currentUserInfo.bio || '',
        urls: currentUserInfo.urls || [],
      })
    }
  }, [form])

  const { fields, append } = useFieldArray({
    name: 'urls',
    control: form.control,
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => showSubmittedData(data))}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.profile.username')}</FormLabel>
              <FormControl>
                <Input placeholder={t('settings.profile.usernamePlaceholder')} {...field} />
              </FormControl>
              <FormDescription>
                {t('settings.profile.usernameDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.profile.email')}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('settings.profile.emailPlaceholder')} 
                  type="email"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                {t('settings.profile.emailDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='bio'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.profile.bio')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('settings.profile.bioPlaceholder')}
                  className='resize-none'
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('settings.profile.bioDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          {fields.map((field, index) => (
            <FormField
              control={form.control}
              key={field.id}
              name={`urls.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(index !== 0 && 'sr-only')}>
                    {t('settings.profile.urls')}
                  </FormLabel>
                  <FormDescription className={cn(index !== 0 && 'sr-only')}>
                    {t('settings.profile.urlsDescription')}
                  </FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={() => append({ value: '' })}
          >
{t('settings.profile.addUrl')}
          </Button>
        </div>
        <Button type='submit'>{t('settings.profile.updateProfile')}</Button>
      </form>
    </Form>
  )
}
