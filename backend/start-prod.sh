#!/bin/bash

# ChatX 生产环境启动脚本

echo "🚀 正在启动 ChatX 生产环境..."

# 检查是否存在 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在从 .env.example 创建..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据生产环境需要修改配置"
    echo "⚠️  特别注意修改以下配置："
    echo "  - SECRET_KEY (使用强随机密钥)"
    echo "  - 数据库密码"
    echo "  - DOMAIN_NAME (设置实际域名)"
    echo "  - DEBUG=false"
    echo "  - ENVIRONMENT=production"
    exit 1
fi

# 检查是否需要生成 SSL 证书
if [ ! -f "./nginx/ssl/fullchain.pem" ] || [ ! -f "./nginx/ssl/privkey.pem" ]; then
    echo "🔐 SSL 证书不存在，正在生成自签名证书..."
    chmod +x generate-ssl.sh
    ./generate-ssl.sh
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

echo "📦 正在启动生产环境服务..."

# 构建并启动所有服务 (生产模式)
$COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml up --build -d

echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo "📋 服务状态："
$COMPOSE_CMD ps

echo ""
echo "🔍 检查服务连接..."

# 检查各个服务
services=("postgres:PostgreSQL" "redis:Redis" "minio:MinIO" "neo4j:Neo4j" "weaviate:Weaviate" "nginx:Nginx")

for service in "${services[@]}"; do
    service_name="${service%:*}"
    display_name="${service#*:}"
    
    if $COMPOSE_CMD exec $service_name echo "test" &> /dev/null; then
        echo "✅ $display_name: 运行正常"
    else
        echo "❌ $display_name: 连接失败"
    fi
done

# 检查应用健康状态
if curl -sf http://localhost/health &> /dev/null; then
    echo "✅ FastAPI 应用: 运行正常"
else
    echo "❌ FastAPI 应用: 连接失败"
fi

echo ""
echo "🎉 ChatX 生产环境启动完成！"
echo ""
echo "📚 服务地址："
echo "  - 🌐 主入口: https://$(grep DOMAIN_NAME .env | cut -d'=' -f2)"
echo "  - 📖 API 文档: https://$(grep DOMAIN_NAME .env | cut -d'=' -f2)/docs"
echo "  - 🔗 API 根路径: https://$(grep DOMAIN_NAME .env | cut -d'=' -f2)/api"
echo ""
echo "🔧 管理界面 (仅限管理员访问)："
echo "  - 📦 MinIO 控制台: https://$(grep DOMAIN_NAME .env | cut -d'=' -f2)/minio"
echo "  - 🕸️  Neo4j 浏览器: https://$(grep DOMAIN_NAME .env | cut -d'=' -f2)/neo4j"
echo ""
echo "📋 生产环境管理命令："
echo "  - 查看日志: $COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo "  - 重启应用: $COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml restart app"
echo "  - 停止所有服务: $COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml down"
echo "  - 备份数据: $COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml exec postgres pg_dump -U chatx_user chatx_db > backup.sql"
echo ""
echo "⚠️  安全提醒："
echo "  - 确保防火墙只开放必要端口 (80, 443)"
echo "  - 定期更新系统和容器镜像"
echo "  - 监控日志文件异常"
echo "  - 定期备份数据库"