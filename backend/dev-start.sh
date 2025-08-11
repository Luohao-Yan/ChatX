#!/bin/bash

# ChatX 本地 Python 开发环境启动脚本

echo "🐍 ChatX 本地开发环境启动..."

# 检查是否在虚拟环境中
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  请先激活虚拟环境！"
    echo ""
    echo "创建并激活虚拟环境："
    echo "  python3 -m venv chatx-service"
    echo "  source chatx-service/bin/activate"
    echo "  pip install -r requirements.txt"
    echo "  pip install -r requirements-dev.txt"
    echo ""
    exit 1
fi

echo "✅ 虚拟环境已激活: $VIRTUAL_ENV"

# 检查是否存在 .env.dev 文件
if [ ! -f .env.dev ]; then
    echo "📋 创建开发环境配置文件..."
    cp .env.example .env.dev
    
    # 修改开发配置
    sed -i '' 's/DEBUG=true/DEBUG=true/' .env.dev
    sed -i '' 's/SECRET_KEY=your-secret-key-change-in-production/SECRET_KEY=dev-secret-key-change-in-production/' .env.dev
    sed -i '' 's/ACCESS_TOKEN_EXPIRE_MINUTES=30/ACCESS_TOKEN_EXPIRE_MINUTES=60/' .env.dev
    
    echo "✅ 已创建 .env.dev 开发配置文件"
fi

# 检查外部服务是否运行
echo "🔍 检查外部服务..."

# 读取环境变量获取端口配置
export $(cat .env 2>/dev/null | grep -v ^# | xargs) 2>/dev/null || true

# 使用环境变量或默认值
POSTGRES_PORT=${POSTGRES_PORT:-5432}
REDIS_PORT=${REDIS_PORT:-6379}
MINIO_PORT=${MINIO_PORT:-9000}
NEO4J_BOLT_PORT=${NEO4J_BOLT_PORT:-7687}
WEAVIATE_PORT=${WEAVIATE_PORT:-8080}

services_to_check=(
    "postgres:$POSTGRES_PORT" 
    "redis:$REDIS_PORT" 
    "minio:$MINIO_PORT" 
    "neo4j:$NEO4J_BOLT_PORT" 
    "weaviate:$WEAVIATE_PORT"
)
missing_services=()

for service in "${services_to_check[@]}"; do
    service_name=${service%:*}
    port=${service#*:}
    
    if ! nc -z localhost $port 2>/dev/null; then
        missing_services+=($service_name)
    else
        echo "  ✅ $service_name: 运行正常"
    fi
done

if [ ${#missing_services[@]} -gt 0 ]; then
    echo ""
    echo "❌ 以下服务未运行: ${missing_services[*]}"
    echo ""
    echo "请先启动外部服务："
    echo "  docker-compose -f docker-compose.services.yml up -d"
    echo ""
    read -p "是否现在启动外部服务？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 启动外部服务..."
        docker-compose -f docker-compose.services.yml up -d
        echo "⏳ 等待服务启动..."
        sleep 10
    else
        echo "请手动启动外部服务后再运行此脚本"
        exit 1
    fi
fi

# 检查数据库迁移
echo "🗃️ 检查数据库迁移..."
export $(cat .env.dev | grep -v ^# | xargs)

if ! alembic current &>/dev/null; then
    echo "📊 运行数据库迁移..."
    alembic upgrade head
else
    echo "  ✅ 数据库迁移已完成"
fi

echo ""
echo "🎉 开发环境准备完成！"
echo ""
echo "🚀 启动 FastAPI 应用 (http://localhost:8000)..."
echo "   按 Ctrl+C 停止应用"
echo ""

# 启动应用
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env.dev