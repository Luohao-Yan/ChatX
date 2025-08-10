#!/bin/bash

# ChatX 后端启动脚本

echo "🚀 正在启动 ChatX 后端服务..."

# 检查是否存在 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在从 .env.example 创建..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查 Docker Compose 是否可用
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 使用 docker compose 或 docker-compose
COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    COMPOSE_CMD="docker-compose"
fi

echo "📦 正在启动所有服务..."

# 构建并启动所有服务
$COMPOSE_CMD up --build -d

echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📋 服务状态："
$COMPOSE_CMD ps

# 检查服务健康状态
echo ""
echo "🔍 检查服务连接..."

# 检查 PostgreSQL
if $COMPOSE_CMD exec postgres pg_isready -U chatx_user -d chatx_db &> /dev/null; then
    echo "✅ PostgreSQL: 运行正常"
else
    echo "❌ PostgreSQL: 连接失败"
fi

# 检查 Redis
if $COMPOSE_CMD exec redis redis-cli ping &> /dev/null; then
    echo "✅ Redis: 运行正常"
else
    echo "❌ Redis: 连接失败"
fi

# 检查 MinIO
if curl -sf http://localhost:9000/minio/health/live &> /dev/null; then
    echo "✅ MinIO: 运行正常"
else
    echo "❌ MinIO: 连接失败"
fi

# 检查 Weaviate
if curl -sf http://localhost:8080/v1/.well-known/ready &> /dev/null; then
    echo "✅ Weaviate: 运行正常"
else
    echo "❌ Weaviate: 连接失败"
fi

# 检查 Neo4j
if curl -sf http://localhost:7474/db/data/ &> /dev/null; then
    echo "✅ Neo4j: 运行正常"
else
    echo "❌ Neo4j: 连接失败"
fi

# 检查 Nginx
if curl -sf http://localhost:80/health &> /dev/null; then
    echo "✅ Nginx: 运行正常"
else
    echo "❌ Nginx: 连接失败"
fi

# 检查 FastAPI 应用 (通过 Nginx 代理)
if curl -sf http://localhost/health &> /dev/null; then
    echo "✅ FastAPI 应用 (通过代理): 运行正常"
else
    echo "❌ FastAPI 应用 (通过代理): 连接失败"
fi

echo ""
echo "🎉 ChatX 后端服务启动完成！"
echo ""
echo "📚 服务地址 (通过 Nginx 统一入口)："
echo "  - 🌐 主入口: http://localhost"
echo "  - 📖 API 文档: http://localhost/docs"
echo "  - 🔗 API 根路径: http://localhost/api"
echo "  - 📦 MinIO 控制台: http://localhost/minio"
echo "  - 🕸️  Neo4j 浏览器: http://localhost/neo4j"
echo "  - 🔍 Weaviate: http://localhost/weaviate"
echo ""
echo "📚 直连地址 (开发调试用)："
echo "  - PostgreSQL: localhost:5432 (用户名: chatx_user, 密码: chatx_password)"
echo "  - Redis: localhost:6379"
echo "  - MinIO API: localhost:9000"
echo "  - Neo4j Bolt: localhost:7687"
echo "  - Weaviate API: localhost:8080"
echo ""
echo "📋 有用的命令："
echo "  - 查看日志: $COMPOSE_CMD logs -f"
echo "  - 查看特定服务日志: $COMPOSE_CMD logs -f app"
echo "  - 停止所有服务: $COMPOSE_CMD down"
echo "  - 重启应用: $COMPOSE_CMD restart app"
echo "  - 进入应用容器: $COMPOSE_CMD exec app bash"