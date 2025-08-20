/**
 * 密码强度指示器组件
 * 显示密码强度和验证错误信息
 */

import { cn } from '@/utils/utils'
import { validatePassword, PasswordPolicyRule } from '@/utils/password-validation'
import { IconCheck, IconX } from '@tabler/icons-react'

interface PasswordStrengthIndicatorProps {
  password: string
  rules?: PasswordPolicyRule[]
  className?: string
}

export function PasswordStrengthIndicator({
  password,
  rules,
  className
}: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password, rules)
  
  if (!password) {
    return null
  }
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* 强度条 */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>密码强度</span>
          <span className={cn(
            'font-medium',
            validation.strength === 'strong' ? 'text-green-600' : 
            validation.strength === 'medium' ? 'text-yellow-600' : 
            'text-red-600'
          )}>
            {validation.strength === 'strong' ? '强' : 
             validation.strength === 'medium' ? '中' : '弱'}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              validation.strength === 'strong' ? 'bg-green-500 w-full' :
              validation.strength === 'medium' ? 'bg-yellow-500 w-2/3' :
              'bg-red-500 w-1/3'
            )}
          />
        </div>
      </div>
      
      {/* 验证规则列表 */}
      {rules && (
        <div className="space-y-1">
          {rules.map((rule, index) => {
            const isValid = rule.validator(password)
            return (
              <div
                key={`${rule.name}-${index}`}
                className={cn(
                  'flex items-center gap-2 text-xs',
                  isValid ? 'text-green-600' : 'text-red-600'
                )}
              >
                {isValid ? (
                  <IconCheck className="w-3 h-3" />
                ) : (
                  <IconX className="w-3 h-3" />
                )}
                <span>{rule.message}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}