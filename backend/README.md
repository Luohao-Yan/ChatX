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

## 🚀 快速开始

### 环境要求

- Python 3.11+
- Docker & Docker Compose
- Git

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd chatx-main/backend
   ```

2. **创建虚拟环境**
   ```bash
   python3 -m venv chatx-service
   source chatx-service/bin/activate  # Linux/Mac
   # 或
   chatx-service\Scripts\activate     # Windows
   ```

3. **安装依赖**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

4. **配置环境变量**
   ```bash
   cp .env.example .env
   # 根据需要修改 .env 文件中的配置
   ```

5. **启动外部服务**
   ```bash
   docker-compose -f docker-compose.services.yml up -d
   ```

6. **启动开发环境**
   ```bash
   ./dev-start.sh
   ```

7. **访问应用**
   - API 文档: http://localhost:8000/docs
   - 应用接口: http://localhost:8000

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