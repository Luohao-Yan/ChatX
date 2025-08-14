import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAvatar } from '@/context/avatar-context'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useIsMobile } from '@/hooks/use-mobile'
import { useEffect } from 'react'

const getItems = (t: any) => [
  {
    id: 'recents',
    label: t('settings.display.recents'),
  },
  {
    id: 'home',
    label: t('settings.display.home'),
  },
  {
    id: 'applications',
    label: t('settings.display.applications'),
  },
  {
    id: 'desktop',
    label: t('settings.display.desktop'),
  },
  {
    id: 'downloads',
    label: t('settings.display.downloads'),
  },
  {
    id: 'documents',
    label: t('settings.display.documents'),
  },
] as const

const createDisplayFormSchema = (t: any) => z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: t('settings.display.selectAtLeastOne'),
  }),
  avatarDisplay: z.enum(['bottom-left', 'top-right']),
})

type DisplayFormValues = {
  items: string[]
  avatarDisplay: 'bottom-left' | 'top-right'
}

// This can come from your database or API.
const defaultValues: Partial<DisplayFormValues> = {
  items: ['recents', 'home'],
  avatarDisplay: 'bottom-left',
}

export function DisplayForm() {
  const { t } = useTranslation()
  const { avatarDisplay, setAvatarDisplay } = useAvatar()
  const isMobile = useIsMobile()
  
  const displayFormSchema = createDisplayFormSchema(t)
  const items = getItems(t)
  
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues: {
      ...defaultValues,
      avatarDisplay,
    },
  })

  useEffect(() => {
    if (isMobile) {
      form.setValue('avatarDisplay', 'top-right')
    } else {
      form.setValue('avatarDisplay', avatarDisplay)
    }
  }, [isMobile, form, avatarDisplay])

  const onSubmit = (data: DisplayFormValues) => {
    if (!isMobile) {
      setAvatarDisplay(data.avatarDisplay)
    }
    showSubmittedData(data)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='items'
          render={() => (
            <FormItem>
              <div className='mb-4'>
                <FormLabel className='text-base'>{t('settings.display.sidebar')}</FormLabel>
                <FormDescription>
                  {t('settings.display.sidebarDescription')}
                </FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name='items'
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className='flex flex-row items-start space-y-0 space-x-3'
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className='font-normal'>
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name='avatarDisplay'
          render={({ field }) => (
            <FormItem className='space-y-3'>
              <FormLabel className='text-base'>{t('settings.display.avatarDisplay')}</FormLabel>
              <FormDescription>
                {t('settings.display.avatarDisplayDescription')}
                {isMobile && <span className='font-medium text-foreground'> (On mobile, the avatar is always displayed in the top right.)</span>}
              </FormDescription>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className='flex flex-col space-y-1'
                  disabled={isMobile}
                >
                  <FormItem className='flex items-center space-y-0 space-x-3'>
                    <FormControl>
                      <RadioGroupItem value='bottom-left' />
                    </FormControl>
                    <FormLabel className='font-normal'>
                      {t('settings.display.bottomLeft')}
                    </FormLabel>
                  </FormItem>
                  <FormItem className='flex items-center space-y-0 space-x-3'>
                    <FormControl>
                      <RadioGroupItem value='top-right' />
                    </FormControl>
                    <FormLabel className='font-normal'>
                      {t('settings.display.topRight')}
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type='submit'>{t('settings.display.updateDisplay')}</Button>
      </form>
    </Form>
  )
}
