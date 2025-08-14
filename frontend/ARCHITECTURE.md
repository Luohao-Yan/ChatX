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

## 重构后的目录结构

 我建议采用这样的分层：

  src/
  ├── services/              # 基础设施服务层（跨模块）
  │   ├── http/             # HTTP 客户端和拦截器
  │   ├── auth/             # 认证基础服务
  │   ├── storage/          # 存储服务
  │   ├── websocket/        # WebSocket 服务
  │   └── upload/           # 文件上传服务
  ├── features/             # 业务功能模块
  │   ├── chat/
  │   │   ├── services/     # 聊天业务 API（调用基础 services）
  │   │   ├── components/
  │   │   └── hooks/
  ├── shared/               # 跨功能共享资源
  │   ├── components/       # 通用业务组件
  │   ├── hooks/           # 通用 hooks
  │   └── utils/           # 工具函数
  ├── components/           # 纯 UI 组件库
  │   └── ui/              # shadcn/ui 组件

  这样的好处是：

- 清晰分层：基础设施 → 业务功能 → UI展示
- 避免重复：基础服务统一管理，业务服务专注业务逻辑
- 依赖清晰：features 依赖 services，而不是相互依赖

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
