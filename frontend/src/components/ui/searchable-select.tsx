import React, { useState, useEffect, useRef } from 'react'
import { IconChevronDown, IconCheck, IconX, IconSearch } from '@tabler/icons-react'
import { cn } from '@/utils/utils'

export interface SelectOption {
  value: string
  label: string
  description?: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value?: string[]
  defaultValue?: string[]
  placeholder?: string
  searchPlaceholder?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
  onValueChange?: (value: string[]) => void
  onSearch?: (query: string) => void
  loading?: boolean
  emptyText?: string
  maxSelectedDisplay?: number
}

export function SearchableSelect({
  options = [],
  value,
  defaultValue = [],
  placeholder = "请选择...",
  searchPlaceholder = "搜索...",
  multiple = false,
  disabled = false,
  className,
  onValueChange,
  onSearch,
  loading = false,
  emptyText = "暂无数据",
  maxSelectedDisplay = 2
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [internalValue, setInternalValue] = useState<string[]>(value || defaultValue)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 同步外部value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
    }
  }, [value])

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 处理选择
  const handleSelect = (optionValue: string) => {
    let newValue: string[]
    
    if (multiple) {
      if (internalValue.includes(optionValue)) {
        newValue = internalValue.filter(v => v !== optionValue)
      } else {
        newValue = [...internalValue, optionValue]
      }
    } else {
      newValue = [optionValue]
      setIsOpen(false)
    }
    
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  // 移除选中项
  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newValue = internalValue.filter(v => v !== optionValue)
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  // 清空所有选择
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInternalValue([])
    onValueChange?.([])
  }

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 打开时聚焦搜索框
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // 获取显示的标签
  const getDisplayLabel = () => {
    if (internalValue.length === 0) {
      return placeholder
    }

    const selectedOptions = options.filter(option => internalValue.includes(option.value))
    
    if (!multiple) {
      return selectedOptions[0]?.label || placeholder
    }

    if (selectedOptions.length === 1) {
      return selectedOptions[0].label
    }

    if (selectedOptions.length <= maxSelectedDisplay) {
      return selectedOptions.map(option => option.label).join(', ')
    }

    return `已选择 ${selectedOptions.length} 项`
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* 选择框主体 */}
      <div
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
          isOpen && "ring-1 ring-ring"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 flex items-center gap-1 min-w-0">
          {multiple && internalValue.length > 0 && internalValue.length <= maxSelectedDisplay ? (
            // 多选标签模式
            <div className="flex flex-wrap gap-1">
              {internalValue.map(val => {
                const option = options.find(opt => opt.value === val)
                return option ? (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
                  >
                    {option.label}
                    <IconX
                      size={12}
                      className="cursor-pointer hover:text-primary/70"
                      onClick={(e) => handleRemove(val, e)}
                    />
                  </span>
                ) : null
              })}
            </div>
          ) : (
            // 普通文本模式
            <span className={cn(
              "truncate",
              internalValue.length === 0 && "text-muted-foreground"
            )}>
              {getDisplayLabel()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {internalValue.length > 0 && (
            <IconX
              size={16}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={handleClear}
            />
          )}
          <IconChevronDown
            size={16}
            className={cn(
              "text-muted-foreground transition-transform",
              isOpen && "transform rotate-180"
            )}
          />
        </div>
      </div>

      {/* 下拉选项 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
          {/* 搜索框 */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <IconSearch size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* 选项列表 */}
          <div className="max-h-60 overflow-auto">
            {loading ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                加载中...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {searchQuery ? "未找到匹配项" : emptyText}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = internalValue.includes(option.value)
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    {multiple && (
                      <div className={cn(
                        "w-4 h-4 border border-primary rounded-sm flex items-center justify-center",
                        isSelected && "bg-primary border-primary"
                      )}>
                        {isSelected && <IconCheck size={12} className="text-primary-foreground" />}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {option.description}
                        </div>
                      )}
                    </div>

                    {!multiple && isSelected && (
                      <IconCheck size={16} className="text-primary" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}