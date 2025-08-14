# ChatX 产品功能手册

## 系统架构概览

**技术栈:**

- **后端**: FastAPI + SQLAlchemy + PostgreSQL + Redis + Celery
- **前端**: React 19 + TypeScript + TanStack Router + Tailwind CSS + shadcn/ui
- **数据存储**: PostgreSQL + Redis + MinIO + Weaviate + Neo4j
- **认证**: JWT + Session + RBAC权限管理

---

## 核心功能模块

| 功能模块 | 子功能 | 描述 | 后端API | 前端路由 | 状态 |
|---------|--------|------|---------|---------|------|
| **用户认证管理** | 用户注册 | 邮箱/用户名注册，密码加密存储 | `POST /auth/register` | `/sign-up` | ✅ 已实现 |
| | 用户登录 | 支持邮箱/用户名登录，设备信息追踪 | `POST /auth/login` | `/sign-in` | ✅ 已实现 |
| | 密码重置 | 忘记密码，邮箱验证码重置 | `POST /auth/forgot-password`<br>`POST /auth/reset-password` | `/forgot-password`<br>`/reset-password` | ✅ 已实现 |
| | 邮箱验证 | OTP验证码验证邮箱 | `POST /auth/verify-email` | `/otp` | ✅ 已实现 |
| | 会话管理 | 多设备会话管理，令牌刷新 | `GET /auth/sessions`<br>`DELETE /auth/sessions/{id}` | 用户下拉菜单 | ✅ 已实现 |
| | 退出登录 | 单设备/全部设备退出 | `POST /auth/logout`<br>`POST /auth/logout-all` | 用户下拉菜单 | ✅ 已实现 |
| **用户管理** | 用户信息管理 | 查看、编辑用户基本信息 | `GET /users/me`<br>`PUT /users/{id}` | `/settings/account` | ✅ 已实现 |
| | 用户列表管理 | 管理员查看所有用户 | `GET /users/` | `/users` | ✅ 已实现 |
| | 用户删除 | 软删除用户到回收站 | `DELETE /users/{id}` | `/users` | ✅ 已实现 |
| **权限管理 (RBAC)** | 角色管理 | 创建、编辑、删除角色 | `POST /roles/`<br>`PUT /roles/{id}`<br>`DELETE /roles/{id}` | `/management/roles` | ✅ 已实现 |
| | 权限管理 | 权限增删改查、层级管理 | `POST /permissions/`<br>`GET /permissions/hierarchy` | `/management/permissions` | ✅ 已实现 |
| | 角色分配 | 给用户分配/撤销角色 | `POST /roles/{id}/users`<br>`DELETE /roles/{id}/users/{user_id}` | 用户管理页面 | ✅ 已实现 |
| **文件管理系统** | 文件上传 | 单文件/批量文件上传 | `POST /files/upload`<br>`POST /files/upload-multiple` | 文件上传组件 | ✅ 已实现 |
| | 文件管理 | 文件搜索、分类、详情查看 | `GET /files/search`<br>`GET /files/{id}` | `/documents` | ✅ 已实现 |
| | 文件下载 | 文件下载、权限控制 | `GET /files/{id}/download` | 文件列表 | ✅ 已实现 |
| | 文件夹管理 | 文件夹创建、树形结构 | `POST /files/folders`<br>`GET /files/folders/tree` | `/documents` | ✅ 已实现 |
| | 文件分享 | 文件分享链接管理 | `POST /files/{id}/share`<br>`GET /files/shared-with-me` | `/documents/shared` | ✅ 已实现 |
| | 文件统计 | 存储分析、使用统计 | `GET /files/statistics/overview` | `/documents/storage` | ✅ 已实现 |
| **AI模型管理平台** | 模型接入管理 | 统一管理多种AI模型提供商 | `POST /ai-models/`<br>`GET /ai-models/providers` | `/settings/ai-models` | 🚧 规划中 |
| | 模型配置 | OpenAI、Azure、AWS、Gemini等配置 | `PUT /ai-models/{id}/config` | AI模型设置页面 | 🚧 规划中 |
| | 模型切换 | 动态切换AI模型和参数调优 | `POST /ai-models/switch` | AI聊天界面 | 🚧 规划中 |
| | 使用统计 | AI模型调用统计和成本分析 | `GET /ai-models/statistics` | AI仪表板 | 🚧 规划中 |
| **MCP协议支持** | MCP集成 | Model Context Protocol协议支持 | `POST /mcp/connect`<br>`GET /mcp/contexts` | MCP管理页面 | 🚧 规划中 |
| | 上下文管理 | 跨模型上下文共享和管理 | `POST /mcp/contexts` | AI聊天界面 | 🚧 规划中 |
| **数据连接器平台** | 连接器管理 | Connect框架多数据源连接器 | `POST /connectors/`<br>`GET /connectors/types` | `/settings/connectors` | 🚧 规划中 |
| | 数据源配置 | MySQL、MongoDB、API等数据源 | `POST /connectors/{id}/config` | 数据源配置页面 | 🚧 规划中 |
| | 数据同步 | 实时数据同步和ETL处理 | `POST /connectors/{id}/sync` | 数据同步监控 | 🚧 规划中 |
| | 连接器监控 | 连接状态监控和错误处理 | `GET /connectors/{id}/status` | 连接器仪表板 | 🚧 规划中 |
| **AI聊天系统** | AI对话 | 智能对话、消息历史管理 | 模拟实现 | `/ai-chats` | ✅ 已实现 |
| | 消息管理 | 消息气泡、复制、点赞、重新生成 | 前端实现 | AI聊天界面 | ✅ 已实现 |
| | 欢迎屏幕 | 新用户引导界面 | 前端实现 | AI聊天首页 | ✅ 已实现 |
| **知识管理中心** | 文档管理 | 我的文档、最近文档 | 文件API | `/documents`<br>`/documents/recent` | ✅ 已实现 |
| | 知识库 | 组织库、部门库管理 | 待开发 | `/knowledge/organizations`<br>`/knowledge/departments` | 🚧 开发中 |
| | 知识图谱 | 知识关系可视化 | Neo4j集成 | `/knowledge/graph` | 🚧 开发中 |
| | 收藏管理 | 文档收藏、网页博客知识 | 待开发 | `/documents/favorites`<br>`/knowledge/web-blogs` | 🚧 开发中 |
| | 微信知识 | 微信群聊知识管理 | 待开发 | `/knowledge/wechat` | 🚧 开发中 |
| | 知识设置 | 分类管理、质量评估 | 部分实现 | `/documents/settings/categories`<br>`/documents/settings/knowledgeQualityAssessment` | 🚧 开发中 |
| **回收站系统** | 回收站管理 | 查看已删除项目 | `GET /recycle-bin/` | `/documents/trash` | ✅ 已实现 |
| | 批量恢复 | 批量恢复删除的项目 | `POST /recycle-bin/restore` | 回收站页面 | ✅ 已实现 |
| | 永久删除 | 永久删除项目 | `DELETE /recycle-bin/permanent` | 回收站页面 | ✅ 已实现 |
| | 回收站统计 | 删除项目统计信息 | `GET /recycle-bin/stats` | 回收站页面 | ✅ 已实现 |
| **缓存管理** | 缓存统计 | API缓存、用户缓存统计 | `GET /cache/stats` | 管理员面板 | ✅ 已实现 |
| | 缓存清理 | 分类清理各种缓存 | `DELETE /cache/clear` | 管理员面板 | ✅ 已实现 |
| | 限流管理 | 用户访问限流控制 | `GET /cache/rate-limit/{id}`<br>`DELETE /cache/rate-limit/{id}` | 管理员面板 | ✅ 已实现 |
| **系统设置** | 个人设置 | 账户信息、外观设置 | 前端实现 | `/settings/account`<br>`/settings/appearance` | ✅ 已实现 |
| | 通知设置 | 消息通知偏好设置 | 待开发 | `/settings/notifications` | 🚧 开发中 |
| | 显示设置 | 界面显示偏好设置 | 前端实现 | `/settings/display` | ✅ 已实现 |
| **国际化支持** | 多语言 | 中文/英文切换 | 前端实现 | 全局语言切换器 | ✅ 已实现 |
| | 主题切换 | 明暗主题切换 | 前端实现 | 全局主题切换器 | ✅ 已实现 |
| **错误处理** | 错误页面 | 401/403/404/500/503错误页面 | 前端实现 | `/401`、`/403`、`/404`、`/500`、`/503` | ✅ 已实现 |
| **仪表板** | 数据概览 | 收入、订阅、销售统计 | 模拟数据 | `/` (首页) | ✅ 已实现 |
| | 图表展示 | 数据可视化图表 | ECharts集成 | 仪表板页面 | ✅ 已实现 |

---

## 系统特性

| 特性类别 | 功能描述 | 实现状态 |
|---------|---------|---------|
| **安全性** | JWT认证 + Session管理 + RBAC权限控制 | ✅ 已实现 |
| | 密码加密存储 (Argon2 + Bcrypt) | ✅ 已实现 |
| | API限流保护 | ✅ 已实现 |
| | CSRF保护 | ✅ 已实现 |
| **性能优化** | Redis缓存系统 | ✅ 已实现 |
| | 数据库连接池 | ✅ 已实现 |
| | 异步任务处理 (Celery) | ✅ 已实现 |
| | 文件存储优化 (MinIO) | ✅ 已实现 |
| **用户体验** | 响应式设计 | ✅ 已实现 |
| | 暗黑模式支持 | ✅ 已实现 |
| | 多语言支持 | ✅ 已实现 |
| | 实时消息推送 | 🚧 开发中 |
| **数据管理** | 软删除机制 | ✅ 已实现 |
| | 数据备份恢复 | ✅ 已实现 |
| | 文件版本管理 | 🚧 规划中 |
| | 数据导入导出 | 🚧 规划中 |

---

## 后端API接口文档

### 认证相关接口

#### 用户认证

- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/refresh` - 刷新访问令牌
- `POST /auth/logout` - 用户登出
- `POST /auth/logout-all` - 退出所有设备
- `GET /auth/me` - 获取当前用户信息

#### 密码管理

- `POST /auth/forgot-password` - 忘记密码，发送重置验证码
- `POST /auth/reset-password` - 重置密码

#### 会话管理

- `GET /auth/sessions` - 获取用户会话列表
- `DELETE /auth/sessions/{session_id}` - 注销指定会话

### 用户管理接口

- `GET /users/` - 获取用户列表
- `GET /users/{user_id}` - 获取单个用户信息
- `PUT /users/{user_id}` - 更新用户信息
- `DELETE /users/{user_id}` - 删除用户
- `POST /users/verify-email` - 邮箱验证

### 角色权限管理接口

#### 角色管理

- `POST /roles/` - 创建角色
- `GET /roles/` - 获取角色列表
- `GET /roles/{role_id}` - 获取角色详情
- `PUT /roles/{role_id}` - 更新角色
- `DELETE /roles/{role_id}` - 删除角色
- `GET /roles/hierarchy` - 获取角色层级结构

#### 权限管理

- `POST /permissions/` - 创建权限
- `GET /permissions/` - 获取权限列表
- `PUT /permissions/{permission_id}` - 更新权限
- `DELETE /permissions/{permission_id}` - 删除权限
- `GET /permissions/hierarchy` - 获取权限层级结构

#### 角色分配

- `POST /roles/{role_id}/users` - 分配用户角色
- `DELETE /roles/{role_id}/users/{user_id}` - 撤销用户角色
- `GET /roles/{role_id}/users` - 获取角色用户列表

### 文件管理接口

#### 文件上传

- `POST /files/upload` - 单文件上传
- `POST /files/upload-multiple` - 批量文件上传

#### 文件管理

- `GET /files/search` - 搜索和筛选文件
- `GET /files/{file_id}` - 获取文件详情
- `PUT /files/{file_id}` - 更新文件信息
- `DELETE /files/{file_id}` - 删除文件
- `GET /files/{file_id}/download` - 下载文件

#### 文件夹管理

- `POST /files/folders` - 创建文件夹
- `GET /files/folders/tree` - 获取文件夹树形结构
- `GET /files/folders/{folder_id}/files` - 获取文件夹下的文件

#### 文件分享

- `POST /files/{file_id}/share` - 分享文件
- `GET /files/{file_id}/shares` - 获取文件的分享列表
- `GET /files/shared-with-me` - 获取分享给我的文件

#### 文件统计

- `GET /files/statistics/overview` - 获取文件统计信息

### AI模型管理接口

#### 模型配置管理
- `POST /ai-models/` - 创建AI模型配置
- `GET /ai-models/` - 获取所有AI模型配置
- `GET /ai-models/providers` - 获取支持的AI模型提供商列表
- `PUT /ai-models/{model_id}/config` - 更新模型配置
- `DELETE /ai-models/{model_id}` - 删除模型配置
- `POST /ai-models/{model_id}/test` - 测试模型连接

#### 模型调用管理
- `POST /ai-models/switch` - 切换当前使用的AI模型
- `POST /ai-models/{model_id}/chat` - 调用指定模型进行对话
- `GET /ai-models/{model_id}/statistics` - 获取模型使用统计
- `GET /ai-models/usage-report` - 获取所有模型使用报告

### MCP协议接口

- `POST /mcp/connect` - 建立MCP连接
- `GET /mcp/contexts` - 获取MCP上下文列表
- `POST /mcp/contexts` - 创建新的MCP上下文
- `PUT /mcp/contexts/{context_id}` - 更新MCP上下文
- `DELETE /mcp/contexts/{context_id}` - 删除MCP上下文
- `GET /mcp/protocols` - 获取支持的MCP协议版本

### 数据连接器接口

#### 连接器管理
- `POST /connectors/` - 创建新的数据连接器
- `GET /connectors/` - 获取连接器列表
- `GET /connectors/types` - 获取支持的连接器类型
- `PUT /connectors/{connector_id}` - 更新连接器配置
- `DELETE /connectors/{connector_id}` - 删除连接器

#### 连接器操作
- `POST /connectors/{connector_id}/connect` - 建立数据源连接
- `POST /connectors/{connector_id}/disconnect` - 断开数据源连接
- `GET /connectors/{connector_id}/status` - 获取连接器状态
- `POST /connectors/{connector_id}/test` - 测试连接器连通性

#### 数据同步
- `POST /connectors/{connector_id}/sync` - 启动数据同步
- `GET /connectors/{connector_id}/sync-status` - 获取同步状态
- `POST /connectors/{connector_id}/sync/stop` - 停止数据同步
- `GET /connectors/{connector_id}/sync-history` - 获取同步历史

### 回收站管理接口

- `GET /recycle-bin/` - 获取回收站项目列表
- `POST /recycle-bin/restore` - 批量恢复项目
- `DELETE /recycle-bin/permanent` - 批量永久删除项目
- `GET /recycle-bin/stats` - 获取回收站统计信息

### 缓存管理接口

- `GET /cache/stats` - 获取缓存统计信息
- `DELETE /cache/clear` - 清理缓存
- `GET /cache/user/{user_id}` - 获取用户缓存信息
- `DELETE /cache/user/{user_id}` - 清理特定用户的缓存
- `GET /cache/rate-limit/{identifier}` - 获取限流状态
- `DELETE /cache/rate-limit/{identifier}` - 清理限流记录
- `POST /cache/warmup` - 预热缓存

---

## 前端路由结构

### 认证相关页面

- `/sign-in` - 登录页面
- `/sign-in-2` - 登录页面（双列布局）
- `/sign-up` - 注册页面
- `/forgot-password` - 忘记密码页面
- `/reset-password` - 重置密码页面
- `/otp` - OTP验证页面

### 主要功能页面

#### AI聊天系统

- `/ai-chats` - AI聊天主页面

#### 文档管理

- `/documents` - 我的文档
- `/documents/recent` - 最近文档
- `/documents/favorites` - 收藏文档
- `/documents/shared` - 分享给我的文档
- `/documents/trash` - 回收站
- `/documents/storage` - 存储分析

#### 知识管理

- `/knowledge/organizations` - 组织知识库
- `/knowledge/departments` - 部门知识库
- `/knowledge/graph` - 知识图谱
- `/knowledge/web-blogs` - 网页博客知识
- `/knowledge/wechat` - 微信知识

#### 管理中心

- `/management/users` - 用户管理
- `/management/roles` - 角色管理
- `/management/permissions` - 权限管理
- `/management/organizations` - 组织管理
- `/management/departments` - 部门管理

#### 系统设置

- `/settings` - 设置首页
- `/settings/account` - 账户设置
- `/settings/appearance` - 外观设置
- `/settings/display` - 显示设置
- `/settings/notifications` - 通知设置
- `/settings/ai-models` - AI模型管理
- `/settings/connectors` - 数据连接器管理
- `/settings/mcp` - MCP协议配置

#### 其他功能

- `/users` - 用户列表
- `/tasks` - 任务管理
- `/help-center` - 帮助中心

### 错误页面

- `/401` - 未授权
- `/403` - 禁止访问
- `/404` - 页面未找到
- `/500` - 服务器错误
- `/503` - 维护中

---

## 技术亮点

### 1. 现代化技术栈

- **React 19**: 使用最新版本的React，支持并发特性和最新Hooks
- **TypeScript**: 完整的类型安全支持
- **TanStack Router**: 现代化的文件系统路由解决方案
- **FastAPI**: 高性能的Python异步Web框架
- **shadcn/ui**: 基于Radix UI的现代化组件库

### 2. 完善的权限系统

- **RBAC模型**: 基于角色的访问控制
- **细粒度权限**: 支持资源级别的权限控制
- **权限继承**: 支持角色层级和权限继承
- **动态权限**: 运行时权限验证和路由保护

### 3. 多数据库架构

- **PostgreSQL**: 主数据库，存储用户、文件等结构化数据
- **Redis**: 缓存和会话存储
- **MinIO**: 对象存储，处理文件上传下载
- **Weaviate**: 向量数据库，支持AI搜索
- **Neo4j**: 图数据库，支持知识图谱

### 4. AI模型统一管理

- **多模型支持**: OpenAI、Azure OpenAI、AWS Bedrock、Google Gemini、通义千问、vLLM、Ollama、硅基流动
- **智能路由**: 基于成本、性能、可用性的智能模型选择
- **负载均衡**: 多模型实例负载均衡和故障转移
- **成本控制**: 实时监控模型调用成本和使用量

### 5. MCP协议集成

- **标准化接口**: 支持Model Context Protocol标准
- **跨模型兼容**: 实现不同AI模型间的上下文共享
- **插件生态**: 兼容MCP生态的工具和扩展
- **协议升级**: 支持MCP协议版本升级和兼容性管理

### 6. 数据连接器平台

- **多源连接**: 支持MySQL、PostgreSQL、MongoDB、Elasticsearch、ClickHouse等
- **实时同步**: 基于CDC的实时数据同步
- **ETL处理**: 内置数据转换和清洗功能
- **连接监控**: 实时监控连接状态和数据同步健康度

### 7. 优雅的UI设计

- **响应式设计**: 支持桌面端和移动端
- **暗黑模式**: 完整的明暗主题切换
- **国际化**: 中英文双语支持
- **无障碍访问**: 遵循WCAG指南

### 8. 安全特性

- **密码加密**: 使用Argon2和Bcrypt双重加密
- **JWT认证**: 无状态的令牌认证
- **会话管理**: 多设备会话控制
- **API限流**: 防止API滥用
- **CSRF保护**: 跨站请求伪造保护

### 9. 性能优化

- **Redis缓存**: 多层缓存策略
- **数据库优化**: 连接池和查询优化
- **异步处理**: Celery任务队列
- **CDN支持**: 静态资源加速
- **懒加载**: 按需加载组件和数据

---

## 开发状态说明

### ✅ 已完成功能

- 用户认证和会话管理
- RBAC权限管理体系
- 文件上传下载管理
- AI聊天界面和交互
- 回收站和缓存管理
- 国际化和主题切换
- 错误处理和页面

### 🚧 开发中功能

- 知识图谱可视化
- 微信知识管理
- 实时消息推送
- 通知系统
- 高级搜索功能

### 🔮 规划中功能

- 文件版本管理
- 数据导入导出
- API文档生成
- 性能监控
- 日志审计

---

## 产品发展路线图

### 2025年第一季度 (Q1) - 智能化升级

| 功能 | 优先级 | 预计完成时间 | 说明 |
|------|--------|-------------|------|
| **AI模型管理平台** | 🔥 高 | 2025年1月 | 统一AI模型接入管理（OpenAI、Azure、AWS、Gemini等） |
| **MCP协议集成** | 🔥 高 | 2025年2月 | 支持Model Context Protocol，增强AI模型互操作性 |
| **多数据源连接器** | 🔥 高 | 2025年2月 | Connect框架支持MySQL、MongoDB、API等多种数据源 |
| **AI聊天增强** | 🔥 高 | 2025年2月 | 集成真实LLM模型，支持多轮对话上下文 |
| **智能文档处理** | 🔥 高 | 2025年2月 | PDF/Word文档智能解析和摘要生成 |
| **知识图谱可视化** | 🟡 中 | 2025年3月 | 基于Neo4j的知识关系图谱展示 |
| **向量搜索** | 🟡 中 | 2025年3月 | 基于Weaviate的语义搜索功能 |
| **实时消息推送** | 🟡 中 | 2025年3月 | WebSocket实时通知系统 |

### 2025年第二季度 (Q2) - 协作与集成

| 功能 | 优先级 | 预计完成时间 | 说明 |
|------|--------|-------------|------|
| **团队协作** | 🔥 高 | 2025年4月 | 多人实时协作编辑文档 |
| **微信知识集成** | 🔥 高 | 2025年4月 | 微信群聊内容自动抓取和知识提取 |
| **连接器生态扩展** | 🔥 高 | 2025年4月 | 扩展更多数据源连接器（Elasticsearch、ClickHouse等） |
| **AI模型负载均衡** | 🟡 中 | 2025年5月 | 多模型智能负载均衡和故障转移 |
| **API集成平台** | 🟡 中 | 2025年5月 | 第三方API集成管理（钉钉、飞书等） |
| **MCP生态集成** | 🟡 中 | 2025年5月 | 集成更多MCP兼容的AI工具和服务 |
| **工作流引擎** | 🟡 中 | 2025年6月 | 自定义业务流程自动化 |
| **移动端应用** | 🟢 低 | 2025年6月 | React Native移动端App |

### 2025年第三季度 (Q3) - 企业级功能

| 功能 | 优先级 | 预计完成时间 | 说明 |
|------|--------|-------------|------|
| **数据分析仪表板** | 🔥 高 | 2025年7月 | 企业数据可视化和报表系统 |
| **高级权限管理** | 🔥 高 | 2025年7月 | 部门级权限控制和数据隔离 |
| **文件版本管理** | 🟡 中 | 2025年8月 | Git风格的文件版本控制 |
| **审计日志系统** | 🟡 中 | 2025年8月 | 完整的操作审计和合规性支持 |
| **SSO单点登录** | 🟡 中 | 2025年9月 | SAML/OAuth2企业级身份认证 |

### 2025年第四季度 (Q4) - 智能化与优化

| 功能 | 优先级 | 预计完成时间 | 说明 |
|------|--------|-------------|------|
| **AI助手进阶** | 🔥 高 | 2025年10月 | 支持代码生成、数据分析等专业任务 |
| **智能推荐系统** | 🔥 高 | 2025年10月 | 基于用户行为的个性化内容推荐 |
| **多语言扩展** | 🟡 中 | 2025年11月 | 支持日语、韩语、法语等多语言 |
| **性能监控系统** | 🟡 中 | 2025年11月 | APM性能监控和错误追踪 |
| **数据备份恢复** | 🟢 低 | 2025年12月 | 自动化数据备份和灾难恢复 |

### 2026年展望 - 生态化发展

| 功能类别 | 主要方向 | 说明 |
|---------|---------|------|
| **AI生态** | AGI集成 | 支持多模态AI、语音识别、图像理解 |
| **开放平台** | 插件系统 | 第三方开发者插件生态 |
| **行业解决方案** | 垂直化 | 教育、医疗、金融等行业定制方案 |
| **国际化** | 全球部署 | 多区域部署和本地化服务 |

### 技术债务与优化计划

| 优化项目 | 计划时间 | 重要性 | 描述 |
|---------|---------|--------|------|
| **数据库性能优化** | 2025年Q1 | 🔥 高 | 查询优化、索引重构、分库分表 |
| **前端性能优化** | 2025年Q2 | 🟡 中 | 代码分割、懒加载、CDN优化 |
| **安全加固** | 2025年Q3 | 🔥 高 | 安全扫描、漏洞修复、加密升级 |
| **代码重构** | 2025年Q4 | 🟡 中 | 架构优化、代码规范、测试覆盖 |

### 风险评估与应对策略

| 风险类型 | 风险等级 | 应对策略 |
|---------|---------|---------|
| **技术风险** | 🟡 中等 | 技术选型保守、充分测试、渐进式升级 |
| **人力风险** | 🔥 高 | 团队扩招、知识文档化、关键技能备份 |
| **市场风险** | 🟡 中等 | 快速迭代、用户反馈驱动、功能MVP验证 |
| **安全风险** | 🔥 高 | 安全审计、渗透测试、应急响应机制 |

### 里程碑节点

- **📍 2025年3月**: 知识管理平台MVP发布
- **📍 2025年6月**: 企业协作功能上线
- **📍 2025年9月**: 移动端和企业级功能完善
- **📍 2025年12月**: AI智能化全面升级
- **📍 2026年6月**: 生态平台和行业解决方案

### 成功指标 (KPIs)

| 指标类别 | 目标值 | 时间节点 |
|---------|--------|---------|
| **用户增长** | 10,000+ 活跃用户 | 2025年底 |
| **功能完成度** | 90%+ 规划功能上线 | 2025年底 |
| **系统性能** | 99.9% 可用性 | 持续目标 |
| **用户满意度** | 4.5+ 星级评分 | 2025年底 |

---

## 部署和运行

### 后端启动

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端启动

```bash
cd frontend
pnpm install
pnpm dev
```

### Docker部署

```bash
docker-compose up -d
```

---

## 项目结构

### 后端结构

```
backend/
├── app/
│   ├── api/              # API路由
│   ├── application/      # 应用服务层
│   ├── domain/          # 领域模型
│   ├── infrastructure/  # 基础设施层
│   ├── models/         # 数据模型
│   ├── schemas/        # API模式
│   └── utils/          # 工具函数
├── alembic/            # 数据库迁移
└── requirements.txt    # 依赖管理
```

### 前端结构

```
frontend/
├── src/
│   ├── components/     # 公共组件
│   ├── features/      # 功能模块
│   ├── routes/        # 路由页面
│   ├── hooks/         # 自定义Hooks
│   ├── lib/           # 工具库
│   ├── stores/        # 状态管理
│   └── locales/       # 国际化文件
└── package.json       # 依赖管理
```

---

**版本**: v1.4.2  
**最后更新**: 2025年1月  
**文档状态**: 🟢 最新
