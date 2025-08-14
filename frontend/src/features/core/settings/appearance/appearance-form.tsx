import { ChevronDownIcon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'
import { fonts } from '@/config/fonts'
import { cn } from '@/utils/utils'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { useFont } from '@/context/font-context'
import { useTheme } from '@/context/theme-context'
import { Button, buttonVariants } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { colorSchemes } from '@/config/color-schemes'
import { radiusOptions } from '@/config/radius-settings'
import { useAppearance } from '@/context/appearance-context'

export function AppearanceForm() {
  const { t } = useTranslation()
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()

  const {
    colorScheme,
    radius,
    customRadius,
    useCustomRadius,
    fontSize,
    pageTransition,
    setColorScheme,
    setRadius,
    setCustomRadius,
    setUseCustomRadius,
    setFontSize,
    setPageTransition,
    resetToDefaults,
  } = useAppearance()

  function handleSubmit() {
    const data = {
      theme: theme as 'light' | 'dark' | 'system',
      font,
      colorScheme,
      radius,
      customRadius,
      useCustomRadius,
      fontSize,
      pageTransition,
    }
    showSubmittedData(data)
  }

  function handleReset() {
    setTheme('system')
    setFont('inter')
    resetToDefaults()
  }

  return (
    <div className="space-y-8">
      {/* Font Settings */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('settings.appearance.font')}
        </label>
        <div className="relative w-max">
          <select
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-[200px] appearance-none font-normal capitalize',
              'dark:bg-background dark:hover:bg-background'
            )}
            value={font}
            onChange={(e) => setFont(e.target.value as (typeof fonts)[number])}
          >
            {fonts.map((fontOption) => (
              <option key={fontOption} value={fontOption}>
                {fontOption}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute top-2.5 right-3 h-4 w-4 opacity-50" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t('settings.appearance.fontDescription')}
        </p>
      </div>

      {/* Theme Settings */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          {t('settings.appearance.theme')}
        </label>
        <p className="text-sm text-muted-foreground">
          {t('settings.appearance.themeDescription')}
        </p>
        <RadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2"
        >
            <label className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
              <RadioGroupItem value="light" className="sr-only" />
              <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                  <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                    <div className="h-2 w-20 rounded-lg bg-[#ecedef]" />
                    <div className="h-2 w-24 rounded-lg bg-[#ecedef]" />
                  </div>
                  <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                    <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                    <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                  </div>
                </div>
              </div>
              <span className="block w-full p-2 text-center font-normal">
                {t('settings.appearance.light')}
              </span>
            </label>
            <label className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
              <RadioGroupItem value="dark" className="sr-only" />
              <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                  <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                    <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                  </div>
                  <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                    <div className="h-4 w-4 rounded-full bg-slate-400" />
                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                  </div>
                </div>
              </div>
              <span className="block w-full p-2 text-center font-normal">
                {t('settings.appearance.dark')}
              </span>
            </label>
            <label className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
              <RadioGroupItem value="system" className="sr-only" />
              <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                  <div className="flex rounded-md shadow-xs overflow-hidden">
                    <div className="flex-1 space-y-2 bg-white p-2">
                      <div className="h-2 w-[35px] rounded-lg bg-[#ecedef]" />
                      <div className="h-2 w-[45px] rounded-lg bg-[#ecedef]" />
                    </div>
                    <div className="flex-1 space-y-2 bg-slate-800 p-2">
                      <div className="h-2 w-[35px] rounded-lg bg-slate-400" />
                      <div className="h-2 w-[45px] rounded-lg bg-slate-400" />
                    </div>
                  </div>
                  <div className="flex rounded-md shadow-xs overflow-hidden">
                    <div className="flex-1 flex items-center space-x-1 bg-white p-2">
                      <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                      <div className="h-2 w-[40px] rounded-lg bg-[#ecedef]" />
                    </div>
                    <div className="flex-1 flex items-center space-x-1 bg-slate-800 p-2">
                      <div className="h-4 w-4 rounded-full bg-slate-400" />
                      <div className="h-2 w-[40px] rounded-lg bg-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
              <span className="block w-full p-2 text-center font-normal">
                {t('settings.appearance.autoSwitchSystem')}
              </span>
            </label>
        </RadioGroup>
      </div>

      <Separator className="my-8" />

      {/* Color Scheme Settings */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">颜色方案</h3>
          <p className="text-sm text-muted-foreground">
            选择应用程序的主色调
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.value}
              type="button"
              onClick={() => setColorScheme(scheme.value)}
              className={cn(
                'relative flex flex-col items-center p-4 rounded-md border-2 transition-colors',
                'border-muted-foreground/20 hover:bg-accent hover:text-accent-foreground hover:border-accent',
                colorScheme === scheme.value
                  ? 'border-primary'
                  : 'border-muted-foreground/20'
              )}
            >
              <div className="flex space-x-1 mb-3">
                <div
                  className="w-5 h-5 rounded-full"
                  style={{
                    backgroundColor: scheme.colors.light.primary,
                  }}
                />
                <div
                  className="w-5 h-5 rounded-full"
                  style={{
                    backgroundColor: scheme.colors.dark.primary,
                  }}
                />
              </div>
              <span className="text-xs font-medium">{t(scheme.label)}</span>
              {colorScheme === scheme.value && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Radius Settings */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">圆角设置</h3>
          <p className="text-sm text-muted-foreground">
            调整界面元素的圆角大小
          </p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {radiusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setRadius(option.value)
                setUseCustomRadius(false)
              }}
              className={cn(
                'flex flex-col items-center p-3 rounded-md border-2 transition-colors',
                'border-muted-foreground/20 hover:bg-accent hover:text-accent-foreground hover:border-accent',
                !useCustomRadius && radius === option.value
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-background'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 mb-2 transition-colors',
                  !useCustomRadius && radius === option.value
                    ? 'bg-primary'
                    : 'bg-muted-foreground/60'
                )}
                style={{ borderRadius: option.preview.borderRadius }}
              />
              <span className="text-xs">
                {option.value === 'none'
                  ? '无'
                  : option.value === 'sm'
                    ? '小'
                    : option.value === 'md'
                      ? '中'
                      : option.value === 'lg'
                        ? '大'
                        : option.value === 'xl'
                          ? '特大'
                          : option.value === 'full'
                            ? '圆形'
                            : option.value}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Custom Radius Slider */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">自定义圆角</h3>
          <p className="text-sm text-muted-foreground">
            精确控制界面元素的圆角大小
          </p>
        </div>
        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <label className="text-base font-medium">使用自定义圆角</label>
            <p className="text-sm text-muted-foreground">
              开启后可以使用滑动条精确调整圆角大小
            </p>
          </div>
          <Switch
            checked={useCustomRadius}
            onCheckedChange={(checked) => {
              setUseCustomRadius(checked)
              if (checked) {
                setRadius('md')
              }
            }}
          />
        </div>
        {useCustomRadius && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-medium">圆角大小: {customRadius}px</label>
              <div
                className="w-4 h-4 bg-primary rounded"
                style={{ borderRadius: `${customRadius}px` }}
              />
            </div>
            <Slider
              value={[customRadius]}
              onValueChange={(values) => setCustomRadius(values[0])}
              min={0}
              max={32}
              step={1}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              拖动滑块调整圆角大小 (0-32px)
            </p>
          </div>
        )}
      </div>

      <Separator className="my-8" />

      {/* Font Size Settings */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">字体大小</h3>
          <p className="text-sm text-muted-foreground">
            调整应用程序的整体字体大小
          </p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setFontSize(size)}
              className={cn(
                'flex flex-col items-center p-4 rounded-md border-2 transition-colors',
                'border-muted-foreground/20 hover:bg-accent hover:text-accent-foreground hover:border-accent',
                fontSize === size
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-background'
              )}
            >
              <div
                className={cn(
                  'mb-2 font-medium',
                  size === 'xs' && 'text-xs',
                  size === 'sm' && 'text-sm',
                  size === 'md' && 'text-base',
                  size === 'lg' && 'text-lg',
                  size === 'xl' && 'text-xl'
                )}
              >
                Aa
              </div>
              <span className="text-xs">
                {size === 'xs'
                  ? '极小'
                  : size === 'sm'
                    ? '小'
                    : size === 'md'
                      ? '中'
                      : size === 'lg'
                        ? '大'
                        : size === 'xl'
                          ? '特大'
                          : size}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Page Transition Settings */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">页面切换动画</h3>
          <p className="text-sm text-muted-foreground">
            设置页面之间的切换动画效果
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(
            ['none', 'fade', 'slide', 'slide-up', 'zoom', 'blur-fade'] as const
          ).map((transition) => (
            <button
              key={transition}
              type="button"
              onClick={() => setPageTransition(transition)}
              className={cn(
                'flex flex-col items-center p-4 rounded-md border-2 transition-colors',
                'border-muted-foreground/20 hover:bg-accent hover:text-accent-foreground hover:border-accent',
                pageTransition === transition
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-background'
              )}
            >
              <div className="mb-2 w-8 h-8 relative flex items-center justify-center">
                {transition === 'none' && (
                  <div className="w-6 h-6 bg-current opacity-60 rounded-sm" />
                )}
                {transition === 'fade' && (
                  <div className="w-6 h-6 bg-current opacity-60 rounded-sm animate-pulse" />
                )}
                {transition === 'slide' && (
                  <div className="flex space-x-1">
                    <div className="w-2 h-6 bg-current opacity-40 rounded-sm" />
                    <div className="w-2 h-6 bg-current opacity-80 rounded-sm transform animate-pulse" />
                  </div>
                )}
                {transition === 'slide-up' && (
                  <div className="flex flex-col space-y-1">
                    <div className="w-6 h-2 bg-current opacity-40 rounded-sm" />
                    <div className="w-6 h-2 bg-current opacity-80 rounded-sm animate-pulse" />
                  </div>
                )}
                {transition === 'zoom' && (
                  <div className="relative">
                    <div className="w-4 h-4 bg-current opacity-40 rounded-sm absolute inset-0 m-auto" />
                    <div className="w-6 h-6 bg-current opacity-60 rounded-sm animate-pulse transform scale-110" />
                  </div>
                )}
                {transition === 'blur-fade' && (
                  <div className="relative">
                    <div className="w-5 h-5 bg-current opacity-30 rounded-sm blur-sm absolute inset-0 m-auto" />
                    <div className="w-4 h-4 bg-current opacity-70 rounded-sm animate-pulse" />
                  </div>
                )}
              </div>
              <span className="text-xs text-center">
                {transition === 'none'
                  ? '无动画'
                  : transition === 'fade'
                    ? '渐变'
                    : transition === 'slide'
                      ? '水平滑动'
                      : transition === 'slide-up'
                        ? '垂直滑动'
                        : transition === 'zoom'
                          ? '缩放'
                          : transition === 'blur-fade'
                            ? '模糊渐变'
                            : transition}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Bottom Buttons */}
      <div className="flex gap-4 pt-8">
        <Button onClick={handleSubmit}>
          {t('settings.appearance.updateAppearance')}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          重置为默认
        </Button>
      </div>
    </div>
  )
}