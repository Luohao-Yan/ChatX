import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { radiusOptions, type RadiusSize, radiusSliderConfig, sliderValueToRadius } from '@/config/radius-settings'
import { cn } from '@/utils/utils'

interface RadiusSliderProps {
  radius: RadiusSize
  customRadius: number
  useCustomRadius: boolean
  onRadiusChange: (radius: RadiusSize) => void
  onCustomRadiusChange: (radius: number) => void
  onUseCustomRadiusChange: (use: boolean) => void
}

export function RadiusSlider({
  radius,
  customRadius,
  useCustomRadius,
  onRadiusChange,
  onCustomRadiusChange,
  onUseCustomRadiusChange,
}: RadiusSliderProps) {
  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-sm font-medium mb-2'>圆角设置</h3>
        <p className='text-xs text-muted-foreground mb-4'>
          调整界面元素的圆角大小
        </p>
      </div>

      {/* 预设圆角选项 */}
      <div className='space-y-4'>
        <Label className='text-sm'>预设圆角</Label>
        <div className='grid grid-cols-3 sm:grid-cols-6 gap-3'>
          {radiusOptions.map((option) => (
            <button
              key={option.value}
              type='button'
              onClick={() => {
                onRadiusChange(option.value)
                onUseCustomRadiusChange(false)
              }}
              className={cn(
                'flex flex-col items-center p-3 rounded-md border-2 transition-colors',
                'border-muted hover:border-accent',
                !useCustomRadius && radius === option.value && 'border-primary',
                useCustomRadius && 'opacity-50'
              )}
            >
              <div
                className='w-8 h-8 bg-primary'
                style={{ borderRadius: option.preview.borderRadius }}
              />
              <span className='text-xs mt-2'>
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

      {/* 自定义圆角开关 */}
      <div className='flex items-center space-x-2'>
        <Switch
          id='use-custom-radius'
          checked={useCustomRadius}
          onCheckedChange={onUseCustomRadiusChange}
        />
        <Label htmlFor='use-custom-radius' className='text-sm'>
          使用自定义圆角
        </Label>
      </div>

      {/* 自定义圆角滑动条 */}
      {useCustomRadius && (
        <div className='space-y-4'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label className='text-sm'>自定义圆角大小</Label>
              <span className='text-xs text-muted-foreground'>
                {sliderValueToRadius(customRadius)}
              </span>
            </div>
            <Slider
              value={[customRadius]}
              onValueChange={([value]) => onCustomRadiusChange(value)}
              min={radiusSliderConfig.min}
              max={radiusSliderConfig.max}
              step={radiusSliderConfig.step}
              className='w-full'
            />
          </div>
          
          {/* 预览 */}
          <div className='flex justify-center'>
            <div
              className='w-16 h-16 bg-primary'
              style={{ borderRadius: sliderValueToRadius(customRadius) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}