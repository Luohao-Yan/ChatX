# ChatX Backend

ChatX 后端服务，基于 FastAPI 构建的现代化微服务架构，集成了多种数据存储和AI服务。

## 🏗️ 技术栈

### 核心框架
- **FastAPI** - 现代化的 Web API 框架
- **Uvicorn** - ASGI 服务器
- **Pydantic** - 数据验证和设置管理
- **SQLAlchemy** - ORM 框架
- **Alembic** - 数据库迁移工具

### 数据存储
- **PostgreSQL** - 关系型数据库
- **Redis** - 缓存和会话存储
- **Neo4j** - 知识图谱数据库
- **Weaviate** - 向量数据库
- **MinIO** - 对象存储

### 其他服务
- **Celery** - 异步任务队列
- **JWT** - 身份验证
- **CORS** - 跨域资源共享
- **SMTP邮件** - 多服务商邮件发送

## 📁 项目结构

```
backend/
├── app/
│   ├── api/                    # API 路由
│   │   ├── auth_api.py        # 认证相关接口
│   │   ├── users_api.py       # 用户管理接口
│   │   └── file_management_api.py # 文件管理接口
│   ├── core/                   # 核心模块
│   │   ├── config.py          # 配置管理
│   │   ├── database.py        # 数据库连接
│   │   ├── security.py        # 安全相关
│   │   ├── redis.py           # Redis 客户端
│   │   ├── neo4j_client.py    # Neo4j 客户端
│   │   ├── weaviate_client.py # Weaviate 客户端
│   │   └── minio_client.py    # MinIO 客户端
│   ├── models/                 # 数据模型
│   │   ├── user_models.py     # 用户模型
│   │   └── file_models.py     # 文件模型
│   ├── schemas/                # Pydantic 模式
│   │   ├── user_schemas.py    # 用户模式
│   │   └── file_schemas.py    # 文件模式
│   ├── services/               # 业务服务
│   │   └── file_service.py    # 文件服务
│   ├── tasks/                  # Celery 任务
│   │   └── user_tasks.py      # 用户相关任务
│   ├── utils/                  # 工具函数
│   │   └── deps.py            # 依赖注入
│   ├── celery.py              # Celery 配置
│   └── main.py                # 应用入口
├── alembic/                    # 数据库迁移
│   └── versions/              # 迁移版本
├── docker-data/                # Docker 数据持久化
├── .env                        # 生产环境配置
├── .env.dev                    # 开发环境配置
├── .env.example               # 配置模板
├── requirements.txt           # 生产依赖
├── requirements-dev.txt       # 开发依赖
├── docker-compose.services.yml # 外部服务
├── docker-compose.yml         # 完整服务编排
├── dev-start.sh              # 开发环境启动脚本
└── start.sh                  # 生产环境启动脚本
```

## ✅ 已完成功能

### 📧 SMTP邮件服务
- **多服务商支持**：Gmail、QQ、163、腾讯企业邮、阿里云、SendGrid
- **邮件服务**：`app/application/services/email_service.py`
- **验证码发送**：支持HTML美化邮件模板
- **开发模式**：`SMTP_ENABLED=false` 时验证码显示在控制台

### 👑 超级管理员系统
- **初始化脚本**：`app/core/admin_init.py`
- **自动创建**：默认租户、组织、部门、超级管理员
- **角色分配**：自动分配超级管理员角色和所有权限

### 🔧 系统初始化工具
- **初始化脚本**：`init_system.py`
- **功能完整**：RBAC系统 + 超级管理员一键设置

### ⚙️ 配置文件
- **环境变量**：完整的 `.env.example` 配置示例
- **多邮件配置**：详细的SMTP配置示例

### 🚀 使用方法

1. **初始化系统**
   ```bash
   cd backend
   python init_system.py init
   ```

2. **检查系统状态**
   ```bash
   python init_system.py status
   ```

3. **查看邮件配置示例**
   ```bash
   python init_system.py email-configs
   ```

4. **启动应用测试**
   ```bash
   python -m app.main
   ```

5. **测试认证功能**
   ```bash
   python test_auth.py
   ```

### 📝 默认超级管理员信息
- **邮箱**：`admin@chatx.com`
- **用户名**：`superadmin`
- **密码**：`ChatX@Admin123!`
- **角色**：超级管理员（拥有所有权限）

### 🔑 验证码获取方式
1. **邮件发送**（SMTP_ENABLED=true）：验证码发送到邮箱
2. **控制台显示**（SMTP_ENABLED=false）：验证码显示在后端日志中，格式：`🔑 验证码: 123456`

### 📋 测试步骤
1. 运行 `python init_system.py` 初始化系统
2. 启动后端服务 `python -m app.main`
3. 使用测试脚本 `python test_auth.py`
4. 使用超级管理员账户登录测试管理功能

## 🚀 超简单启动

### 📋 环境要求

- **Docker**: 用于数据库等基础服务
- **Conda**: 推荐用于Python环境管理
- **Python**: 3.11+ (Conda会自动安装)

### 🎯 一键启动 (智能化)

```bash
# 进入后端目录
cd backend

# 🚀 选择启动方式 (任选其一):

# 方式1: 本地开发环境 (推荐)
./dev-start.sh
# ✅ 自动创建Conda环境 (chatx-backend)
# ✅ 自动安装所有依赖
# ✅ 自动启动Docker服务  
# ✅ 自动运行数据库迁移
# ✅ 自动初始化RBAC权限系统
# ✅ 自动创建超级管理员账户
# ✅ 自动测试邮件服务连接
# ✅ 启动FastAPI应用 (http://localhost:8000)

# 方式2: 完整Docker部署
./start.sh  
# ✅ 完整容器化部署
# ✅ 包含Nginx负载均衡
# ✅ 生产级配置
# ✅ 访问地址: http://localhost
```

### ✨ 启动完成后获得

**🔐 管理员账户**:
- 邮箱: `admin@chatx.com`
- 用户名: `superadmin`  
- 密码: `ChatX@Admin123!`

**📊 重要地址**:
- API文档: http://localhost:8000/docs (dev) 或 http://localhost/docs (docker)
- 健康检查: http://localhost:8000/health (dev) 或 http://localhost/health (docker)
- 系统信息: http://localhost:8000/system/info

### 🔧 可选操作

```bash
# 单独检查系统状态
python init_system.py status

# 重新初始化系统
python init_system.py init

# 查看邮件配置选项
python init_system.py email-configs

# 测试认证功能
python test_auth.py
```

## 🔧 配置说明

### 环境变量配置

项目支持多环境配置：

- `.env` - 生产环境配置
- `.env.dev` - 开发环境配置  
- `.env.example` - 配置模板

主要配置项：

```bash
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5433/chatx_db
REDIS_URL=redis://localhost:6380/0

# 服务端口 (支持自定义避免冲突)
POSTGRES_PORT=5433
REDIS_PORT=6380
MINIO_PORT=9000
NEO4J_BOLT_PORT=7687
WEAVIATE_PORT=8080

# 安全配置
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 外部服务配置
MINIO_ENDPOINT=localhost:9000
NEO4J_URL=bolt://localhost:7687
WEAVIATE_URL=http://localhost:8080
```

### 服务说明

| 服务 | 端口 | 描述 |
|------|------|------|
| PostgreSQL | 5433 | 主数据库 |
| Redis | 6380 | 缓存和会话 |
| MinIO | 9000/9001 | 对象存储 |
| Neo4j | 7474/7687 | 知识图谱 |
| Weaviate | 8080 | 向量数据库 |

## 🔨 开发指南

### 代码规范

项目使用以下工具确保代码质量：

```bash
# 代码格式化
black app/

# 导入排序
isort app/

# 代码检查
flake8 app/

# 类型检查
mypy app/
```

### 数据库迁移

```bash
# 创建迁移
alembic revision --autogenerate -m "描述"

# 应用迁移
alembic upgrade head

# 查看迁移历史
alembic history
```

### 测试

```bash
# 运行测试
pytest

# 生成覆盖率报告
pytest --cov=app tests/
```

## 📚 API 文档

启动应用后，访问以下地址查看 API 文档：

- **Swagger UI**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>
- **OpenAPI JSON**: <http://localhost:8000/openapi.json>

### 主要 API 端点

- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册
- `GET /users/me` - 获取当前用户信息
- `POST /files/upload` - 文件上传
- `GET /files/` - 文件列表

## 🔍 故障排除

### 常见问题

1. **端口冲突**
   - 问题：PostgreSQL 端口 5432 已被占用
   - 解决：修改 `.env` 文件中的端口配置

2. **服务启动失败**
   - 检查 Docker 服务状态：`docker-compose ps`
   - 查看服务日志：`docker-compose logs <service_name>`

3. **数据库连接失败**
   - 确保 PostgreSQL 服务正常运行
   - 检查环境变量中的数据库连接字符串

4. **虚拟环境问题**
   - **Conda环境问题**
     ```bash
     # 检查conda是否安装
     conda --version
     
     # 查看所有环境
     conda env list
     
     # 激活chatx-backend环境
     conda activate chatx-backend
     
     # 删除并重新创建环境
     conda env remove -n chatx-backend
     conda create -n chatx-backend python=3.11 -y
     ```
   - **传统虚拟环境问题**
     - 确保激活了正确的虚拟环境
     - 重新安装依赖：`pip install -r requirements.txt`

### 日志查看

```bash
# 查看应用日志
docker-compose logs -f app

# 查看特定服务日志
docker-compose logs -f postgres
docker-compose logs -f redis

# 查看所有服务状态
docker-compose ps
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有疑问，请：

1. 查看本文档的故障排除部分
2. 搜索现有的 Issues
3. 创建新的 Issue 并提供详细信息

---

**Happy Coding! 🎉**