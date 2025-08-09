import { cn } from '@/lib/utils'
import { colorSchemes, type ColorScheme } from '@/config/color-schemes'
import { useTranslation } from 'react-i18next'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FormItem, FormLabel, FormControl } from '@/components/ui/form'

interface ColorSchemeSelectorProps {
  value: ColorScheme
  onValueChange: (value: ColorScheme) => void
}

export function ColorSchemeSelector({ value, onValueChange }: ColorSchemeSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-sm font-medium mb-2'>颜色方案</h3>
        <p className='text-xs text-muted-foreground mb-4'>
          选择应用程序的主色调
        </p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        className='grid grid-cols-2 sm:grid-cols-3 gap-4'
      >
        {colorSchemes.map((scheme) => (
          <FormItem key={scheme.value}>
            <FormLabel className='[&:has([data-state=checked])>div]:border-primary cursor-pointer flex flex-col'>
              <FormControl>
                <RadioGroupItem value={scheme.value} className='sr-only' />
              </FormControl>
              <div className='border-muted hover:border-accent items-center rounded-md border-2 p-3'>
                <div className='flex space-x-2 justify-center'>
                  {/* 颜色预览圆点 */}
                  <div
                    className='w-4 h-4 rounded-full'
                    style={{ backgroundColor: scheme.colors.light.primary }}
                  />
                  <div
                    className='w-4 h-4 rounded-full'
                    style={{ backgroundColor: scheme.colors.dark.primary }}
                  />
                </div>
              </div>
              <span className='block w-full p-2 text-center text-xs font-normal'>
                {scheme.value === 'default' ? '默认灰色' : 
                 scheme.value === 'emerald' ? '翠绿色' :
                 scheme.value === 'blue' ? '蔚蓝色' :
                 scheme.value === 'purple' ? '紫罗兰' :
                 scheme.value === 'red' ? '朱红色' :
                 scheme.value === 'orange' ? '橙黄色' : scheme.value}
              </span>
            </FormLabel>
          </FormItem>
        ))}
      </RadioGroup>
    </div>
  )
}