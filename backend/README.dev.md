# ChatX 后端开发指南

## 🏗️ Docker Compose 文件说明

项目包含多个 Docker Compose 文件，用途不同：

| 文件名 | 用途 | 包含服务 | 挂载策略 |
|--------|------|---------|----------|
| `docker-compose.yml` | **完整应用部署** | 所有服务（包括FastAPI应用） | 开发模式：代码只读挂载 |
| `docker-compose.services.yml` | **外部依赖服务** | 仅数据库和中间件服务 | 仅数据卷，无代码挂载 |
| `docker-compose.prod.yml` | **生产环境覆盖** | 生产环境配置覆盖 | 移除代码挂载，仅日志数据 |

### 🔒 挂载安全优化

**开发环境 (`docker-compose.yml`)**：

```yaml
volumes:
  - ./app:/app/app:ro  # 只读挂载，防止容器修改源码
  - app_logs:/app/logs # 日志持久化
  - app_tmp:/app/tmp   # 临时文件隔离
```

**生产环境 (`docker-compose.prod.yml`)**：

```yaml
volumes:
  - app_logs:/app/logs  # 仅日志持久化，无源码挂载
  - app_tmp:/app/tmp    # 临时文件隔离
```

**数据安全**：

- 所有外部服务使用Docker命名卷，数据不会污染源码目录
- 应用容器以非root用户(appuser)运行，增强安全性
- 开发环境代码挂载为只读，防止意外修改

## 🚀 启动方式选择

### 方式一：完整Docker环境（适合快速体验）

**用途**：一键启动所有服务，包括FastAPI应用
**优势**：简单、快速、无需本地Python环境
**缺点**：代码修改需要重新构建

```bash
# 1. 进入项目目录
cd /Users/yanluohao/开发/chatx-main/backend

# 2. 一键启动（使用完整compose文件）
chmod +x start.sh
./start.sh
```

**访问地址**：

- API文档: <http://localhost/docs>
- API接口: <http://localhost/api/>*

---

### 方式二：混合开发环境（推荐开发者使用）

**用途**：外部服务用Docker，FastAPI应用本地运行
**优势**：代码热重载、便于调试、性能好
**缺点**：需要本地Python环境

```bash
# 1. 进入项目目录
cd /Users/yanluohao/开发/chatx-main/backend

# 2. 启动外部服务（仅数据库和中间件）
docker-compose -f docker-compose.services.yml up -d

# 3. 本地运行应用（自动处理虚拟环境）
chmod +x dev-start.sh
./dev-start.sh
```

**访问地址**：

- API文档: <http://localhost:8000/docs>  
- API接口: <http://localhost:8000/api/>*

---

### 方式三：手动精确控制（高级用户）

**用途**：完全手动控制每个组件的启动
**优势**：最大控制力、可选择性启动服务
**缺点**：步骤较多

#### 3.1 启动外部服务

```bash
# 启动所有外部服务
docker-compose -f docker-compose.services.yml up -d

# 或选择性启动服务
docker-compose -f docker-compose.services.yml up postgres redis -d
docker-compose -f docker-compose.services.yml up minio weaviate neo4j -d
```

#### 3.2 本地Python环境

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 数据库迁移
alembic upgrade head

# 启动应用
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3.3 Celery任务（可选）

```bash
# 启动Worker（新终端）
celery -A app.celery worker --loglevel=info

# 启动Beat定时任务（新终端）
celery -A app.celery beat --loglevel=info
```

## 🔧 常用开发命令

### 服务管理

```bash
# 查看外部服务状态
docker-compose -f docker-compose.services.yml ps

# 查看服务日志
docker-compose -f docker-compose.services.yml logs -f postgres

# 停止外部服务
docker-compose -f docker-compose.services.yml down

# 完全清理（包括数据）
docker-compose -f docker-compose.services.yml down -v
```

### 数据库操作

```bash
# 连接数据库
docker-compose -f docker-compose.services.yml exec postgres psql -U chatx_user -d chatx_db

# 创建迁移
alembic revision --autogenerate -m "描述变更"

# 应用迁移
alembic upgrade head

# 回退迁移
alembic downgrade -1
```

### 代码质量

```bash
# 代码格式化
black app/
isort app/

# 代码检查
flake8 app/
mypy app/

# 运行测试
pytest
```

## 🌐 服务访问地址

### 外部服务（docker-compose.services.yml）

| 服务 | 地址 | 用户名/密码 | 说明 |
|------|------|------------|------|
| PostgreSQL | localhost:5432 | chatx_user/chatx_password | 主数据库 |
| Redis | localhost:6379 | - | 缓存和会话 |
| MinIO | localhost:9000 | chatx_minio/chatx_minio_password | 对象存储 |
| MinIO控制台 | localhost:9001 | 同上 | Web管理界面 |
| Neo4j HTTP | localhost:7474 | neo4j/chatx_neo4j_password | 图数据库Web界面 |
| Neo4j Bolt | localhost:7687 | 同上 | 图数据库连接 |
| Weaviate | localhost:8080 | - | 向量数据库 |

### 完整应用（docker-compose.yml + Nginx）

| 服务 | 地址 | 说明 |
|------|------|------|
| 主入口 | <http://localhost> | Nginx统一入口 |
| API文档 | <http://localhost/docs> | FastAPI文档 |
| API接口 | <http://localhost/api/>* | REST API |
| MinIO控制台 | <http://localhost/minio> | 通过代理访问 |
| Neo4j浏览器 | <http://localhost/neo4j> | 通过代理访问 |

## 🐛 常见问题

### 1. 端口冲突

```bash
# 检查端口占用
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :8000  # FastAPI

# 修改端口（编辑 .env 文件）
POSTGRES_PORT=5433
REDIS_PORT=6380
```

### 2. 服务连接失败

```bash
# 检查服务状态
docker-compose -f docker-compose.services.yml ps

# 查看服务日志
docker-compose -f docker-compose.services.yml logs postgres

# 重启单个服务
docker-compose -f docker-compose.services.yml restart postgres
```

### 3. 数据库迁移问题

```bash
# 检查迁移状态
alembic current

# 重新生成迁移
alembic revision --autogenerate -m "fix migration"

# 强制重建数据库（慎用，会丢失数据）
docker-compose -f docker-compose.services.yml down -v
docker-compose -f docker-compose.services.yml up -d
alembic upgrade head
```

### 4. 虚拟环境问题

```bash
# 删除旧环境，重新创建
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 📁 开发环境文件结构

```
按照DDD分层原则

  📂 建议的新目录结构：

  app/
  ├── core/                          # 🔧 核心基础设施 (保留最基础的)
  │   ├── config.py                  # ✅ 配置管理
  │   ├── exceptions.py              # ✅ 异常定义
  │   ├── logging_config.py          # ✅ 日志配置
  │   └── banner.py                  # ✅ 启动横幅
  │
  ├── infrastructure/                # 🔧 基础设施层 (扩展)
  │   ├── clients/                   # 外部服务客户端
  │   │   ├── minio_client.py        # 📦 对象存储客户端
  │   │   ├── neo4j_client.py        # 🕸️ 图数据库客户端
  │   │   ├── weaviate_client.py     # 🔍 向量数据库客户端
  │   │   └── redis.py               # ⚡ Redis客户端
  │   ├── persistence/               # 数据持久化
  │   │   ├── database.py            # 💾 数据库连接
  │   │   └── repositories/          # 已有
  │   └── security/                  # 安全相关
  │       └── security.py            # 🔐 安全工具
  │
  ├── application/                   # 📋 应用层 (扩展)
  │   ├── services/                  # 已有
  │   └── middleware/                # 应用中间件
  │       ├── api_cache_service.py   # 🗄️ API缓存
  │       ├── rate_limiter_service.py # 🚦 限流服务
  │       ├── session_cache_service.py # 💾 会话缓存
  │       └── verification_service.py # 📧 验证服务
  │
  ├── domain/                        # 🎯 领域层 (扩展)
  │   ├── services/                  # 已有
  │   └── initialization/            # 系统初始化
  │       ├── rbac_init.py           # 🛡️ RBAC初始化
  │       ├── admin_init.py          # 👑 管理员初始化
  │       └── permissions.py         # 🔑 权限定义
  │
  └── shared/                        # 🌐 共享层 (新增)
      ├── monitoring/                # 监控相关
      │   ├── metrics.py             # 📊 指标收集
      │   └── exception_handlers.py  # ❌ 异常处理
      └── multi_tenancy/             # 多租户
          └── tenant.py              # 🏢 租户管理

```

## 🎯 开发建议

1. **日常开发**：使用方式二（混合开发环境）
2. **功能测试**：使用方式一（完整Docker环境）  
3. **生产部署**：使用 `docker-compose.yml + docker-compose.prod.yml`
4. **代码修改**：建议使用本地Python环境，性能更好
5. **数据备份**：定期备份数据卷，特别是 `postgres_data`

## 🔄 工作流程建议

1. **启动开发环境**：

   ```bash
   docker-compose -f docker-compose.services.yml up -d
   ./dev-start.sh
   ```

2. **代码开发**：
   - 修改代码（自动热重载）
   - 数据库变更时运行 `alembic revision --autogenerate`
   - 定期运行代码质量检查

3. **功能测试**：

   ```bash
   # 停止开发环境
   Ctrl+C  # 停止FastAPI
   docker-compose -f docker-compose.services.yml down
   
   # 启动完整环境测试
   ./start.sh
   ```

4. **提交代码**：

   ```bash
   # 代码检查
   black app/ && isort app/ && flake8 app/
   
   # 运行测试
   pytest
   
   # 提交代码
   git add . && git commit -m "feat: 添加新功能"
   ```
