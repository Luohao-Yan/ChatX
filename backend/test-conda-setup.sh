#!/bin/bash

# ChatX Conda环境测试脚本

echo "🧪 测试Conda环境设置..."

# 检查conda是否安装
if ! command -v conda &> /dev/null; then
    echo "❌ conda命令未找到"
    echo "请确保已安装Anaconda或Miniconda并初始化shell"
    echo "初始化命令: conda init bash (或zsh)"
    exit 1
fi

echo "✅ conda命令可用"

# 初始化conda
eval "$(conda shell.bash hook)"

# 检查环境是否存在
CONDA_ENV_NAME="chatx-backend"

if conda env list | grep -q "^${CONDA_ENV_NAME}"; then
    echo "✅ conda环境 $CONDA_ENV_NAME 已存在"
    
    # 激活环境并检查Python版本
    conda activate $CONDA_ENV_NAME
    echo "✅ 当前环境: $CONDA_DEFAULT_ENV"
    echo "✅ Python版本: $(python --version)"
    
    # 检查关键包
    echo "📦 检查关键依赖包:"
    pip show fastapi uvicorn sqlalchemy 2>/dev/null | grep -E "Name:|Version:" || echo "   部分包未安装"
else
    echo "ℹ️  conda环境 $CONDA_ENV_NAME 不存在"
    echo "   运行 ./dev-start.sh 将自动创建环境"
fi

echo ""
echo "🎯 测试完成!"