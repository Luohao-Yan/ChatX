import { cn } from '@/utils/utils'
import { useTranslation } from 'react-i18next'

interface LoginLayoutPreviewProps {
  layout: 'single-column' | 'double-column'
  isSelected: boolean
  onSelect: () => void
  className?: string
}

export function LoginLayoutPreview({ layout, isSelected, onSelect, className }: LoginLayoutPreviewProps) {
  const { t } = useTranslation()

  const SingleColumnPreview = () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-md overflow-hidden">
      {/* 浏览器窗口效果 */}
      <div className="w-full h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm shadow-sm">
        {/* 浏览器标题栏 */}
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center px-1">
          <div className="flex space-x-0.5">
            <div className="w-1 h-1 bg-red-400 rounded-full" />
            <div className="w-1 h-1 bg-yellow-400 rounded-full" />
            <div className="w-1 h-1 bg-green-400 rounded-full" />
          </div>
        </div>
        
        {/* 页面内容 */}
        <div className="flex-1 flex items-center justify-center p-2">
          <div className="w-14 h-16 bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-600 rounded shadow-sm flex flex-col items-center justify-center space-y-1">
            {/* Logo区域 */}
            <div className="w-3 h-3 bg-blue-500 rounded mb-1" />
            
            {/* 标题 */}
            <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded" />
            <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-700 rounded" />
            
            {/* 表单区域 */}
            <div className="w-10 h-0.5 bg-slate-100 dark:bg-slate-700 rounded mt-1" />
            <div className="w-10 h-0.5 bg-slate-100 dark:bg-slate-700 rounded" />
            
            {/* 按钮 */}
            <div className="w-8 h-1.5 bg-blue-600 rounded mt-1" />
            
            {/* 分割线 */}
            <div className="w-8 h-px bg-slate-200 dark:bg-slate-600 my-1" />
            
            {/* 社交登录 */}
            <div className="flex space-x-1">
              <div className="w-2 h-1 bg-slate-300 dark:bg-slate-600 rounded-sm" />
              <div className="w-2 h-1 bg-slate-300 dark:bg-slate-600 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const DoubleColumnPreview = () => (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-md overflow-hidden">
      {/* 浏览器窗口效果 */}
      <div className="w-full h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm shadow-sm">
        {/* 浏览器标题栏 */}
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center px-1">
          <div className="flex space-x-0.5">
            <div className="w-1 h-1 bg-red-400 rounded-full" />
            <div className="w-1 h-1 bg-yellow-400 rounded-full" />
            <div className="w-1 h-1 bg-green-400 rounded-full" />
          </div>
        </div>
        
        {/* 页面内容 */}
        <div className="flex-1 flex h-full">
          {/* 左侧图片区域 */}
          <div className="w-1/2 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center rounded-bl-sm">
            <div className="w-6 h-6 bg-white/30 dark:bg-white/10 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white/60 dark:bg-white/20 rounded" />
            </div>
          </div>
          
          {/* 右侧表单区域 */}
          <div className="w-1/2 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-600 flex items-center justify-center p-1 rounded-br-sm">
            <div className="w-12 h-16 bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-600 rounded shadow-sm flex flex-col items-center justify-center space-y-1 py-1">
              {/* Logo区域 */}
              <div className="w-2.5 h-2.5 bg-blue-500 rounded mb-0.5" />
              
              {/* 标题 */}
              <div className="w-7 h-0.5 bg-slate-300 dark:bg-slate-600 rounded" />
              <div className="w-5 h-0.5 bg-slate-200 dark:bg-slate-700 rounded" />
              
              {/* 表单区域 */}
              <div className="w-8 h-0.5 bg-slate-100 dark:bg-slate-700 rounded mt-1" />
              <div className="w-8 h-0.5 bg-slate-100 dark:bg-slate-700 rounded" />
              
              {/* 按钮 */}
              <div className="w-6 h-1.5 bg-blue-600 rounded mt-1" />
              
              {/* 分割线 */}
              <div className="w-6 h-px bg-slate-200 dark:bg-slate-600 my-0.5" />
              
              {/* 社交登录 */}
              <div className="flex space-x-0.5">
                <div className="w-1.5 h-1 bg-slate-300 dark:bg-slate-600 rounded-sm" />
                <div className="w-1.5 h-1 bg-slate-300 dark:bg-slate-600 rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        "group relative cursor-pointer transition-all duration-300 ease-in-out",
        "border-2 rounded-xl p-3 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/80",
        "hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]",
        "backdrop-blur-sm",
        isSelected 
          ? "border-blue-500 ring-4 ring-blue-500/10 shadow-2xl shadow-blue-500/20 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/30 dark:to-slate-900" 
          : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-md",
        className
      )}
      onClick={onSelect}
    >
      {/* 预览区域 */}
      <div className="relative w-36 h-24 mb-3 rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent dark:from-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {layout === 'single-column' ? <SingleColumnPreview /> : <DoubleColumnPreview />}
      </div>
      
      {/* 选中指示器 */}
      <div className={cn(
        "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200",
        isSelected 
          ? "bg-blue-500 scale-100 opacity-100" 
          : "bg-slate-200 dark:bg-slate-600 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-50"
      )}>
        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />}
      </div>
      
      {/* 选择状态角标 */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
      )}
      
      {/* 标签 */}
      <div className="text-center space-y-1">
        <p className={cn(
          "text-sm font-semibold transition-colors duration-200",
          isSelected 
            ? "text-blue-700 dark:text-blue-300" 
            : "text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400"
        )}>
          {layout === 'single-column' 
            ? t('settings.display.singleColumn') 
            : t('settings.display.doubleColumn')
          }
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {layout === 'single-column' 
            ? t('settings.display.singleColumnDescription') 
            : t('settings.display.doubleColumnDescription')
          }
        </p>
      </div>
      
      {/* 悬浮效果背景 */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  )
}

interface LoginLayoutPreviewGroupProps {
  value: 'single-column' | 'double-column'
  onValueChange: (value: 'single-column' | 'double-column') => void
  className?: string
}

export function LoginLayoutPreviewGroup({ value, onValueChange, className }: LoginLayoutPreviewGroupProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl",
      "place-items-center sm:place-items-start",
      className
    )}>
      <LoginLayoutPreview
        layout="single-column"
        isSelected={value === 'single-column'}
        onSelect={() => onValueChange('single-column')}
      />
      <LoginLayoutPreview
        layout="double-column"
        isSelected={value === 'double-column'}
        onSelect={() => onValueChange('double-column')}
      />
    </div>
  )
}