/**
 * 密码验证工具
 * 根据后端密码策略进行前端验证
 */

export interface PasswordPolicyRule {
  name: string
  message: string
  validator: (password: string) => boolean
}

export const DEFAULT_PASSWORD_RULES: PasswordPolicyRule[] = [
  {
    name: 'minLength',
    message: '密码长度至少8位',
    validator: (password: string) => password.length >= 8
  },
  {
    name: 'hasLowercase',
    message: '密码必须包含至少一个小写字母',
    validator: (password: string) => /[a-z]/.test(password)
  },
  {
    name: 'hasUppercase', 
    message: '密码必须包含至少一个大写字母',
    validator: (password: string) => /[A-Z]/.test(password)
  },
  {
    name: 'hasNumber',
    message: '密码必须包含至少一个数字',
    validator: (password: string) => /\d/.test(password)
  },
  {
    name: 'hasSpecialChar',
    message: '密码必须包含至少一个特殊字符 (!@#$%^&*)',
    validator: (password: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  },
  {
    name: 'noCommonPatterns',
    message: '密码不能包含常见的弱密码模式',
    validator: (password: string) => {
      const commonPatterns = [
        /^password/i,
        /^123456/,
        /^qwerty/i,
        /^admin/i,
        /^letmein/i,
        /^welcome/i,
        /^monkey/i,
        /^dragon/i
      ]
      return !commonPatterns.some(pattern => pattern.test(password))
    }
  }
]

/**
 * 验证密码强度
 * @param password 要验证的密码
 * @param rules 验证规则，默认使用标准规则
 * @returns 验证结果
 */
export function validatePassword(
  password: string, 
  rules: PasswordPolicyRule[] = DEFAULT_PASSWORD_RULES
): {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
} {
  const errors: string[] = []
  
  // 执行所有验证规则
  rules.forEach(rule => {
    if (!rule.validator(password)) {
      errors.push(rule.message)
    }
  })
  
  // 计算密码强度
  const passedRules = rules.filter(rule => rule.validator(password)).length
  const totalRules = rules.length
  const strengthPercentage = (passedRules / totalRules) * 100
  
  let strength: 'weak' | 'medium' | 'strong'
  if (strengthPercentage >= 80) {
    strength = 'strong'
  } else if (strengthPercentage >= 60) {
    strength = 'medium'
  } else {
    strength = 'weak'
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  }
}

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否为有效邮箱
 */
export function validateEmail(email: string): {
  isValid: boolean
  error?: string
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    return { isValid: false, error: '邮箱地址不能为空' }
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: '请输入有效的邮箱地址' }
  }
  
  // 检查邮箱长度
  if (email.length > 254) {
    return { isValid: false, error: '邮箱地址过长' }
  }
  
  // 检查本地部分长度
  const localPart = email.split('@')[0]
  if (localPart.length > 64) {
    return { isValid: false, error: '邮箱用户名部分过长' }
  }
  
  return { isValid: true }
}

/**
 * 验证用户名格式
 * @param username 用户名
 * @returns 是否为有效用户名
 */
export function validateUsername(username: string): {
  isValid: boolean
  error?: string
} {
  if (!username) {
    return { isValid: false, error: '用户名不能为空' }
  }
  
  if (username.length < 3) {
    return { isValid: false, error: '用户名至少需要3个字符' }
  }
  
  if (username.length > 20) {
    return { isValid: false, error: '用户名不能超过20个字符' }
  }
  
  // 只允许字母、数字、下划线、连字符
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { isValid: false, error: '用户名只能包含字母、数字、下划线和连字符' }
  }
  
  // 不能以数字开头
  if (/^\d/.test(username)) {
    return { isValid: false, error: '用户名不能以数字开头' }
  }
  
  return { isValid: true }
}