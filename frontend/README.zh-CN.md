# ChatX

一款采用现代网络技术构建的功能强大的聊天应用程序。

![ChatX 应用程序](public/images/chatx.png)

ChatX 是一款现代化的聊天应用程序，专为无缝沟通和协作而设计。

> 本项目为使用现代网络技术构建聊天应用程序提供了坚实的基础。

## 特性

- 实时消息
- 浅色/深色模式
- 响应式设计
- 无障碍界面
- 现代 UI 组件
- 使用 TypeScript 构建
- 快速高效
- **企业级页面切换动画** - 6种专业动画效果（渐变、水平滑动、垂直滑动、缩放、模糊渐变、无动画）
- **高级外观定制系统** - 颜色方案、圆角设置、自定义圆角、字体大小等全方位定制
- **智能动画降级** - 自动检测用户无障碍设置、错误边界处理、配置安全检查
- **企业级HTTP客户端** - 基于fetch的类型安全请求模块，支持拦截器、重试机制和错误处理
- **全面的文档管理界面** - 以用户为中心的文档管理体验：
  - **我的文档** - 主要文档工作区，支持上传和管理
  - **最近文档** - 快速访问最近使用的文档
  - **收藏夹** - 收藏重要文档以便快速访问
  - **共享给我** - 查看他人分享的文档
  - **回收站** - 恢复意外删除的文档
  - **存储分析** - 查看存储使用统计和优化建议
  - **文档设置** - 分类标签管理和文件夹结构配置

## 技术栈

**UI:** [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)

**构建工具:** [Vite](https://vitejs.dev/)

**路由:** [TanStack Router](https://tanstack.com/router/latest) - 文件系统路由，支持嵌套布局和代码分割

**类型检查:** [TypeScript](https://www.typescriptlang.org/)

**代码检查/格式化:** [Eslint](https://eslint.org/) & [Prettier](https://prettier.io/)

**图标:** [Tabler Icons](https://tabler.io/icons)

**认证 (部分):** [Clerk](https://go.clerk.com/GttUAaK)

**动画:** [Framer Motion](https://www.framer.com/motion/)

**HTTP客户端:** 自定义Fetch请求模块 (替代Axios)

**状态管理:** [Zustand](https://zustand-demo.pmnd.rs/)

**数据请求:** [TanStack Query](https://tanstack.com/query/latest)

## 本地运行

克隆项目

```bash
  git clone git@github.com:Luohao-Yan/ChatX.git
```

进入项目目录

```bash
  cd ChatX
```

安装依赖

```bash
  pnpm install
```

启动服务

```bash
  pnpm run dev
```

## HTTP客户端使用指南

本项目采用基于fetch API构建的企业级HTTP客户端，为Axios提供了现代化的替代方案，具有完整的TypeScript支持。

### 基础用法

```typescript
import { http } from '@/lib/request'

// GET请求
const users = await http.get('/users')

// POST请求
const newUser = await http.post('/users', {
  name: '张三',
  email: 'zhangsan@example.com'
})

// 带查询参数的请求
const filteredUsers = await http.get('/users', {
  params: { page: 1, limit: 10 }
})
```

### 高级功能

```typescript
// 带重试和超时的请求
const data = await http.get('/api/data', {
  retry: 3,           // 失败时重试3次
  retryDelay: 1000,   // 重试间隔1秒
  timeout: 5000,      // 超时时间5秒
})

// 文件上传
const formData = new FormData()
formData.append('file', file)
await http.post('/upload', formData)
```

### 拦截器

```typescript
// 请求拦截器 - 添加认证信息
http.addRequestInterceptor({
  onRequest: (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }
})

// 响应拦截器 - 全局错误处理
http.addResponseInterceptor({
  onResponseError: (error) => {
    if (error.status === 401) {
      // 跳转到登录页面
      window.location.href = '/login'
    }
    throw error
  }
})
```

### 与React Query集成

```typescript
import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/request'

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => http.get('/users').then(res => res.data)
  })
}
```

### 配置

HTTP客户端的环境变量配置：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 当前赞助商

- [Clerk](https://go.clerk.com/GttUAaK) - 支持在本项目中集成 Clerk

## 作者

由 [@Leon](https://github.com/Luohao-Yan) 精心打造 🤍

## 许可证

根据 [MIT 许可证](https://choosealicense.com/licenses/mit/) 授权
