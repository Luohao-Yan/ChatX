/**
 * 格式化工具函数
 */

/**
 * 格式化数字
 */
export const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat('zh-CN', options).format(num)
}

/**
 * 格式化货币
 */
export const formatCurrency = (amount: number, currency = 'CNY'): string => {
  return formatNumber(amount, {
    style: 'currency',
    currency,
  })
}

/**
 * 格式化百分比
 */
export const formatPercentage = (value: number, fractionDigits = 2): string => {
  return formatNumber(value / 100, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 格式化时间相对显示
 */
export const formatTimeAgo = (date: Date | string): string => {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return '刚刚'
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}分钟前`
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}小时前`
  } else if (diffInSeconds < 2592000) {
    return `${Math.floor(diffInSeconds / 86400)}天前`
  } else {
    return targetDate.toLocaleDateString('zh-CN')
  }
}

/**
 * 格式化用户名显示
 */
export const formatUsername = (user: { full_name?: string; username: string }): string => {
  return user.full_name || user.username
}

/**
 * 截断文本
 */
export const truncateText = (text: string, maxLength: number, suffix = '...'): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + suffix
}

/**
 * 首字母大写
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * 格式化手机号
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/)
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`
  }
  return phone
}

/**
 * 格式化邮箱显示（部分隐藏）
 */
export const formatEmailMask = (email: string): string => {
  const [name, domain] = email.split('@')
  if (name.length <= 2) return email
  
  const maskedName = name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
  return `${maskedName}@${domain}`
}