# 前端架构说明

## 项目概述

ChatX 前端采用现代化的 React 技术栈，基于功能模块化的架构设计，旨在提供清晰的代码组织、良好的可维护性和扩展性。

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **路由**: TanStack Router
- **状态管理**: Zustand
- **数据获取**: TanStack Query
- **UI库**: shadcn/ui + Tailwind CSS
- **表单**: React Hook Form + Zod
- **国际化**: i18next

## 架构原则

### 1. 模块化设计

- 按功能领域划分模块，每个模块自包含
- 通过共享层实现代码复用
- 最小化模块间依赖

### 2. 类型安全

- 全面的 TypeScript 类型定义
- API 接口类型化
- 运行时数据验证

### 3. 性能优化

- 路由级别的代码分割
- 组件懒加载
- 查询缓存和优化

### 4. 可维护性

- 清晰的目录结构
- 统一的编码规范
- 完善的文档体系

## 目录结构

```
src/
├── api/              # API服务层
│   ├── services/    # 业务API服务
│   ├── types/       # API类型定义
│   └── interceptors/ # 请求拦截器
├── components/       # UI组件库
│   ├── ui/          # 基础UI组件
│   ├── layout/      # 布局组件
│   ├── forms/       # 表单组件
│   ├── feedback/    # 反馈组件
│   ├── navigation/  # 导航组件
│   └── business/    # 业务通用组件
├── config/          # 配置管理
│   ├── app.ts       # 应用配置
│   ├── api.ts       # API配置
│   ├── auth.ts      # 认证配置
│   └── constants.ts # 常量定义
├── context/         # React Context
├── features/        # 功能模块
│   ├── core/        # 核心功能
│   ├── chat/        # 聊天功能
│   ├── documents/   # 文档管理
│   ├── knowledge/   # 知识管理
│   ├── users/       # 用户管理
│   └── tasks/       # 任务管理
├── hooks/           # 全局Hooks
├── lib/             # 工具库
├── shared/          # 共享资源
│   ├── components/  # 通用组件
│   ├── hooks/       # 通用Hooks
│   ├── utils/       # 工具函数
│   └── constants/   # 共享常量
├── stores/          # 状态管理
│   ├── auth/        # 认证状态
│   ├── app/         # 应用状态
│   ├── chat/        # 聊天状态
│   └── user/        # 用户状态
├── types/           # 类型定义
│   ├── api/         # API类型
│   ├── entities/    # 实体类型
│   └── common/      # 通用类型
├── routes/          # 路由定义
└── utils/           # 工具函数
```

## 🏗️ 重构后的架构设计

基于现代前端最佳实践，我们采用了清晰的分层架构：

```
src/
├── 🏭 services/              # 基础设施服务层（跨模块共享）
│   ├── 📡 http/             # HTTP 客户端和拦截器
│   │   ├── request.ts       # 核心 HTTP 客户端
│   │   ├── auth-interceptor.ts # 认证拦截器
│   │   └── index.ts         # 服务导出
│   ├── 🔐 auth/             # 认证基础服务
│   │   ├── auth-utils.ts    # 认证工具和验证器
│   │   └── index.ts         # 认证服务导出
│   ├── 💾 storage/          # 存储服务（预留）
│   ├── 🔌 websocket/        # WebSocket 服务（预留）
│   └── 📤 upload/           # 文件上传服务（预留）
│
├── 🎯 features/             # 业务功能模块
│   ├── 🔒 core/             # 核心应用功能
│   │   ├── auth/            # 认证与授权
│   │   ├── dashboard/       # 主仪表板
│   │   └── settings/        # 应用设置
│   ├── 💬 chat/             # 聊天功能
│   │   ├── ai-chat/         # AI 对话功能
│   │   │   ├── components/  # AI 聊天组件
│   │   │   └── hooks/       # AI 聊天 hooks
│   │   └── conversations/   # 用户对话管理
│   │       ├── components/  # 对话组件
│   │       └── data/        # 对话数据
│   ├── 📁 documents/        # 文档管理
│   ├── 🧠 knowledge/        # 知识管理
│   ├── 👥 users/            # 用户管理
│   │   ├── components/      # 用户管理组件
│   │   ├── context/         # 用户上下文
│   │   └── data/           # 用户数据
│   └── ✅ tasks/            # 任务管理
│       ├── components/      # 任务组件
│       ├── context/         # 任务上下文
│       └── data/           # 任务数据
│
├── 🎨 components/           # UI 组件库
│   ├── 🧩 ui/              # 基础 UI 组件 (shadcn/ui)
│   ├── 🏗️ layout/          # 布局组件
│   ├── 📝 forms/           # 表单组件
│   ├── 💬 feedback/        # 反馈组件
│   ├── 🧭 navigation/      # 导航组件
│   ├── 💼 business/        # 业务通用组件
│   └── 🤝 shared/          # 跨模块共享组件
│
├── 🛠️ utils/               # 工具函数库
│   ├── format.ts           # 数据格式化工具
│   ├── logger.ts           # 日志工具
│   ├── utils.ts            # 通用工具函数
│   ├── api-config.ts       # API 配置
│   └── app-config.ts       # 应用配置
│
├── 📦 stores/              # 状态管理
│   ├── auth/               # 认证状态
│   ├── app/                # 全局应用状态
│   ├── chat/               # 聊天相关状态
│   └── user/               # 用户特定状态
│
├── ⚙️ config/              # 配置管理
│   ├── api.ts              # API 端点
│   ├── auth-config.ts      # 认证配置
│   └── constants.ts        # 应用常量
│
├── 📐 types/               # TypeScript 类型定义
│   ├── api/                # API 接口类型
│   ├── entities/           # 业务实体类型
│   └── common/             # 通用共享类型
│
└── 🛣️ routes/              # 应用路由
    ├── (auth)/             # 认证路由
    ├── _authenticated/     # 受保护路由
    └── (errors)/           # 错误页面
```

### 🎯 架构优势

#### 🏗️ **清晰的分层架构**
```
┌─────────────────────────────────────────┐
│             🎨 UI 层                    │  ← Components & Routes
├─────────────────────────────────────────┤
│           🎯 业务功能层                  │  ← Features & Business Logic
├─────────────────────────────────────────┤
│         🏭 基础设施层                    │  ← Services & Utilities
└─────────────────────────────────────────┘
```

#### 📦 **依赖关系清晰**
```
Features ──依赖──→ Services
    ↓                ↓
Components ──依赖──→ Utils
```

#### 🔗 **职责分离明确**
- **🏭 Services**: 跨功能的基础设施服务（HTTP、认证、存储）
- **🎯 Features**: 自包含的业务功能模块
- **🎨 Components**: 可复用的 UI 元素
- **🛠️ Utils**: 纯工具函数
- **📦 Stores**: 应用状态管理

#### ✅ **架构收益**
- **🚀 可扩展性**: 轻松添加新功能模块
- **🔧 可维护性**: 清晰的边界和职责划分
- **🧪 可测试性**: 隔离的模块便于单元测试
- **👥 团队协作**: 直观的组织结构，便于多人开发
- **📚 学习曲线**: 标准化的结构，新成员容易理解

## 核心概念

### 功能模块 (Features)

每个功能模块遵循以下结构：

```
feature/
├── components/      # 模块专用组件
├── hooks/          # 模块专用Hooks
├── services/       # 模块API服务
├── types/          # 模块类型定义
├── utils/          # 模块工具函数
└── index.tsx       # 模块入口
```

### 状态管理

采用 Zustand 进行状态管理，按功能域分割：

- `auth/` - 用户认证状态
- `app/` - 应用全局状态  
- `chat/` - 聊天相关状态
- `user/` - 用户信息状态

### 类型系统

三层类型定义：

- `common/` - 通用类型和接口
- `entities/` - 业务实体类型
- `api/` - API接口类型

### 配置管理

集中式配置管理：

- `app.ts` - 应用基础配置
- `api.ts` - API端点配置
- `constants.ts` - 应用常量

## 开发指南

### 添加新功能

1. 在 `features/` 下创建功能模块
2. 实现组件和业务逻辑
3. 添加类型定义
4. 配置路由
5. 编写测试
6. 更新文档

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 规则
- 组件使用函数式写法
- 优先使用自定义 Hooks

### 性能优化

- 使用 React.memo 优化组件渲染
- 合理使用 useCallback 和 useMemo
- 实现虚拟滚动处理大列表
- 图片懒加载和压缩

### 测试策略

- 单元测试覆盖工具函数
- 组件测试验证UI行为
- 集成测试检查功能流程
- E2E测试保证用户体验

## 部署和构建

### 开发环境

```bash
npm run dev    # 启动开发服务器
npm run build  # 构建生产版本
npm run preview # 预览构建结果
```

### 代码质量

```bash
npm run lint    # 代码检查
npm run format  # 代码格式化
npm run type-check # 类型检查
```

## 最佳实践

1. **组件设计**
   - 保持组件单一职责
   - 优先使用组合模式
   - 提供完整的 Props 类型

2. **状态管理**
   - 保持状态结构扁平
   - 避免过度抽象
   - 合理使用本地状态

3. **性能优化**
   - 懒加载非关键资源
   - 缓存计算结果
   - 减少重渲染

4. **用户体验**
   - 提供加载状态
   - 优雅的错误处理
   - 响应式设计
