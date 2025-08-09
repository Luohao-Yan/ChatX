// 测试配置系统
import { initializeAppConfig } from './app-config'

// 在浏览器控制台中测试配置
export const testAppConfig = () => {
  console.log('=== Testing App Config System ===')
  
  // 测试初始化
  const config = initializeAppConfig(false)
  console.log('Initial config:', config)
  
  // 测试颜色方案应用
  console.log('Available color schemes:', ['default', 'emerald', 'blue', 'indigo', 'purple', 'red', 'orange'])
  
  // 测试圆角应用
  console.log('Available radius options:', ['none', 'sm', 'md', 'lg', 'xl', 'full'])
  
  console.log('Test completed. Check CSS variables in DevTools!')
}

// 自动运行测试（仅在开发环境）
if (import.meta.env.DEV) {
  // 延迟执行，确保 DOM 已准备好
  setTimeout(() => {
    console.log('App config system initialized')
    
    // 将测试函数添加到全局对象，方便在控制台调用
    ;(window as any).testAppConfig = testAppConfig
    console.log('Run testAppConfig() in console to test the config system')
  }, 1000)
}