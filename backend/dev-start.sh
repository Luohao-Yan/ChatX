#!/bin/bash

# ChatX 本地 Python 开发环境启动脚本 (Conda版本)

# 解析命令行参数
FORCE_UPDATE=false
if [[ "$1" == "--force-update" ]] || [[ "$1" == "-f" ]]; then
    FORCE_UPDATE=true
    echo "🔄 强制更新模式启动..."
fi

echo "🐍 ChatX 本地开发环境启动..."

# 环境名称
CONDA_ENV_NAME="chatx-backend"

# 检查是否安装了conda
if ! command -v conda &> /dev/null; then
    echo "❌ 未找到 conda 命令！"
    echo ""
    echo "请先安装 Anaconda 或 Miniconda："
    echo "  - Anaconda: https://www.anaconda.com/download"
    echo "  - Miniconda: https://docs.conda.io/en/latest/miniconda.html"
    echo ""
    echo "或者如果您想使用传统虚拟环境，请运行："
    echo "  python3 -m venv chatx-service"
    echo "  source chatx-service/bin/activate"
    echo "  pip install -r requirements.txt"
    echo "  pip install -r requirements-dev.txt"
    echo ""
    exit 1
fi

# 初始化conda（确保在脚本中可用）
eval "$(conda shell.bash hook)"

# 检查conda环境是否存在
if ! conda env list | grep -q "^${CONDA_ENV_NAME}"; then
    echo "📦 首次运行：创建conda虚拟环境 $CONDA_ENV_NAME"
    
    echo "   正在创建Python 3.11环境..."
    conda create -n $CONDA_ENV_NAME python=3.11 -y
    
    echo "   激活环境..."
    conda activate $CONDA_ENV_NAME
    
    echo "   安装生产依赖..."
    pip install -r requirements.txt
    
    echo "   安装开发依赖..."  
    pip install -r requirements-dev.txt
    
    echo "✅ Conda环境创建完成!"
else
    echo "📦 激活现有conda环境: $CONDA_ENV_NAME"
    conda activate $CONDA_ENV_NAME
fi

# 检查是否在正确的conda环境中
if [[ "$CONDA_DEFAULT_ENV" != "$CONDA_ENV_NAME" ]]; then
    echo "⚠️  conda环境激活失败！"
    echo ""
    echo "请手动运行以下命令："
    echo "  conda activate $CONDA_ENV_NAME"
    echo "  ./dev-start.sh"
    echo ""
    exit 1
fi

echo "✅ Conda虚拟环境已激活: $CONDA_DEFAULT_ENV (Python $(python --version 2>&1 | cut -d' ' -f2))"

# 统一的依赖管理逻辑
DEPS_INSTALLED_FLAG="$CONDA_PREFIX/.chatx_deps_installed"

# 检查是否需要安装/更新依赖
need_update=false

if [ "$FORCE_UPDATE" = true ]; then
    need_update=true
    echo "🔄 强制更新依赖..."
elif [ ! -f "$DEPS_INSTALLED_FLAG" ]; then
    need_update=true
    echo "🔄 首次使用环境，安装依赖..."
elif [[ requirements.txt -nt "$DEPS_INSTALLED_FLAG" ]] || [[ requirements-dev.txt -nt "$DEPS_INSTALLED_FLAG" ]]; then
    need_update=true
    echo "🔄 检测到依赖文件更新，正在更新包..."
fi

if [ "$need_update" = true ]; then
    pip install -r requirements.txt --upgrade
    pip install -r requirements-dev.txt --upgrade
    # 创建/更新状态文件
    touch "$DEPS_INSTALLED_FLAG"
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已是最新版本"
fi

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
export $(cat .env.dev 2>/dev/null | grep -v ^# | xargs) 2>/dev/null || true

# 使用环境变量或默认值
POSTGRES_PORT=${POSTGRES_PORT:-5433}
REDIS_PORT=${REDIS_PORT:-6380}
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
echo "📋 Conda环境管理命令："
echo "  - 查看所有环境: conda env list"
echo "  - 激活环境: conda activate $CONDA_ENV_NAME" 
echo "  - 删除环境: conda env remove -n $CONDA_ENV_NAME"
echo "  - 更新依赖: pip install -r requirements.txt --upgrade"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env.dev