#!/bin/bash

# SSL 证书生成脚本

SSL_DIR="./nginx/ssl"
DOMAIN_NAME=${DOMAIN_NAME:-localhost}

echo "🔐 正在生成 SSL 证书..."

# 创建 SSL 目录
mkdir -p $SSL_DIR

# 生成私钥
openssl genrsa -out $SSL_DIR/privkey.pem 2048

# 生成证书签名请求 (CSR)
openssl req -new -key $SSL_DIR/privkey.pem -out $SSL_DIR/cert.csr -subj "/C=CN/ST=State/L=City/O=Organization/CN=$DOMAIN_NAME"

# 生成自签名证书
openssl x509 -req -days 365 -in $SSL_DIR/cert.csr -signkey $SSL_DIR/privkey.pem -out $SSL_DIR/fullchain.pem

# 设置权限
chmod 600 $SSL_DIR/privkey.pem
chmod 644 $SSL_DIR/fullchain.pem

# 清理临时文件
rm $SSL_DIR/cert.csr

echo "✅ SSL 证书生成完成！"
echo "📁 证书位置: $SSL_DIR/"
echo "📋 证书信息:"
openssl x509 -in $SSL_DIR/fullchain.pem -text -noout | grep -A2 "Subject:"
echo ""
echo "⚠️  注意: 这是自签名证书，仅用于开发和测试环境！"
echo "🏭 生产环境请使用 Let's Encrypt 或购买正式证书"