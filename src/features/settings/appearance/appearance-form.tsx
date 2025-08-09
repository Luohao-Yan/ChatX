import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { fonts } from '@/config/fonts'
import { cn } from '@/lib/utils'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { useFont } from '@/context/font-context'
import { useTheme } from '@/context/theme-context'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { colorSchemes } from '@/config/color-schemes-simple'
import { radiusOptions } from '@/config/radius-settings'
import { useAppearance } from '@/context/appearance-context-mixed'

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  font: z.enum(fonts),
  colorScheme: z.enum(['default', 'emerald', 'blue', 'indigo', 'purple', 'red', 'orange']),
  radius: z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

export function AppearanceForm() {
  const { t } = useTranslation()
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()
  
  // 使用全局外观配置
  const { 
    colorScheme, 
    radius, 
    setColorScheme, 
    setRadius,
    saveColorAndRadiusSettings
  } = useAppearance()

  // This can come from your database or API.
  const defaultValues: Partial<AppearanceFormValues> = {
    theme: theme as 'light' | 'dark' | 'system',
    font,
    colorScheme,
    radius,
  }

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues,
  })

  function onSubmit(data: AppearanceFormValues) {
    // 主题和字体实时保存
    if (data.font != font) setFont(data.font)
    if (data.theme != theme) setTheme(data.theme)
    
    // 保存颜色方案和圆角设置
    saveColorAndRadiusSettings()

    showSubmittedData(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='font'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.appearance.font')}</FormLabel>
              <div className='relative w-max'>
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-[200px] appearance-none font-normal capitalize',
                      'dark:bg-background dark:hover:bg-background'
                    )}
                    {...field}
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <ChevronDownIcon className='absolute top-2.5 right-3 h-4 w-4 opacity-50' />
              </div>
              <FormDescription className='font-manrope'>
                {t('settings.appearance.fontDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='theme'
          render={({ field }) => (
            <FormItem className='space-y-1'>
              <FormLabel>{t('settings.appearance.theme')}</FormLabel>
              <FormDescription>
                {t('settings.appearance.themeDescription')}
              </FormDescription>
              <FormMessage />
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className='grid max-w-4xl grid-cols-3 gap-8 pt-2'
              >
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary cursor-pointer flex flex-col'>
                    <FormControl>
                      <RadioGroupItem value='light' className='sr-only' />
                    </FormControl>
                    <div className='border-muted hover:border-accent items-center rounded-md border-2 p-1'>
                      <div className='space-y-2 rounded-sm bg-[#ecedef] p-2'>
                        <div className='space-y-2 rounded-md bg-white p-2 shadow-xs'>
                          <div className='h-2 w-[80px] rounded-lg bg-[#ecedef]' />
                          <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                          <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                          <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                        </div>
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('settings.appearance.light')}
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary cursor-pointer flex flex-col'>
                    <FormControl>
                      <RadioGroupItem value='dark' className='sr-only' />
                    </FormControl>
                    <div className='border-muted hover:border-accent items-center rounded-md border-2 p-1'>
                      <div className='space-y-2 rounded-sm bg-slate-950 p-2'>
                        <div className='space-y-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                          <div className='h-2 w-[80px] rounded-lg bg-slate-400' />
                          <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-slate-400' />
                          <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-slate-400' />
                          <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                        </div>
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('settings.appearance.dark')}
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary cursor-pointer flex flex-col'>
                    <FormControl>
                      <RadioGroupItem value='system' className='sr-only' />
                    </FormControl>
                    <div className='border-muted hover:border-accent items-center rounded-md border-2 p-1'>
                      <div className='flex space-x-1 p-2'>
                        <div className='flex-1 space-y-2 rounded-sm bg-[#ecedef] p-2'>
                          <div className='space-y-2 rounded-md bg-white p-2 shadow-xs'>
                            <div className='h-2 w-[40px] rounded-lg bg-[#ecedef]' />
                            <div className='h-2 w-[50px] rounded-lg bg-[#ecedef]' />
                          </div>
                          <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                            <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                            <div className='h-2 w-[50px] rounded-lg bg-[#ecedef]' />
                          </div>
                          <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                            <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                            <div className='h-2 w-[50px] rounded-lg bg-[#ecedef]' />
                          </div>
                        </div>
                        <div className='flex-1 space-y-2 rounded-sm bg-slate-950 p-2'>
                          <div className='space-y-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                            <div className='h-2 w-[40px] rounded-lg bg-slate-400' />
                            <div className='h-2 w-[50px] rounded-lg bg-slate-400' />
                          </div>
                          <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                            <div className='h-4 w-4 rounded-full bg-slate-400' />
                            <div className='h-2 w-[50px] rounded-lg bg-slate-400' />
                          </div>
                          <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                            <div className='h-4 w-4 rounded-full bg-slate-400' />
                            <div className='h-2 w-[50px] rounded-lg bg-slate-400' />
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('settings.appearance.autoSwitchSystem')}
                    </span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />

        <Separator className='my-8' />

        {/* 颜色方案设置 */}
        <div className='space-y-6'>
          <div>
            <h3 className='text-lg font-medium'>颜色方案</h3>
            <p className='text-sm text-muted-foreground'>
              选择应用程序的主色调
            </p>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.value}
                type='button'
                onClick={() => setColorScheme(scheme.value)}
                className={cn(
                  'flex flex-col items-center p-4 rounded-md border-2 transition-colors',
                  'border-muted-foreground/20 hover:bg-accent hover:text-accent-foreground hover:border-accent',
                  colorScheme === scheme.value ? 'bg-primary/10 border-primary text-primary' : 'bg-background'
                )}
              >
                <div className='flex space-x-1 mb-3'>
                  <div
                    className='w-5 h-5 rounded-full'
                    style={{ backgroundColor: scheme.colors.primary }}
                  />
                  <div
                    className='w-5 h-5 rounded-full'
                    style={{ backgroundColor: scheme.colors.primaryDark }}
                  />
                </div>
                <span className='text-xs font-medium'>
                  {scheme.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Separator className='my-8' />

        {/* 圆角设置 */}
        <div className='space-y-6'>
          <div>
            <h3 className='text-lg font-medium'>圆角设置</h3>
            <p className='text-sm text-muted-foreground'>
              调整界面元素的圆角大小
            </p>
          </div>

          <div className='grid grid-cols-3 sm:grid-cols-6 gap-3'>
            {radiusOptions.map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() => setRadius(option.value)}
                className={cn(
                  'flex flex-col items-center p-3 rounded-md border-2 transition-colors',
                  'border-muted-foreground/20 hover:bg-accent hover:text-accent-foreground hover:border-accent',
                  radius === option.value ? 'bg-primary/10 border-primary text-primary' : 'bg-background'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 mb-2 transition-colors',
                    radius === option.value ? 'bg-primary' : 'bg-muted-foreground/60'
                  )}
                  style={{ borderRadius: option.preview.borderRadius }}
                />
                <span className='text-xs'>
                  {option.value === 'none' ? '无' :
                   option.value === 'sm' ? '小' :
                   option.value === 'md' ? '中' :
                   option.value === 'lg' ? '大' :
                   option.value === 'xl' ? '特大' :
                   option.value === 'full' ? '圆形' : option.value}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Button type='submit'>{t('settings.appearance.updateAppearance')}</Button>
      </form>
    </Form>
  )
}
