#!/bin/bash

# SSL 证书统一管理脚本
# 功能: 生成自签名证书、申请/续租 Let's Encrypt 证书、检查证书状态、安装定时任务

SSL_DIR="./docker-data/nginx/ssl"
CERTBOT_DIR="./docker-data/certbot"
DOMAIN_NAME=${DOMAIN_NAME:-localhost}
EMAIL=${SSL_EMAIL:-admin@localhost}
STAGING=${STAGING:-false}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

show_usage() {
    echo "🔐 SSL 证书统一管理脚本"
    echo ""
    echo "用法: $0 <命令> [选项]"
    echo ""
    echo "命令:"
    echo "  generate     生成自签名证书 (开发环境)"
    echo "  obtain       申请 Let's Encrypt 证书"
    echo "  renew        续租 Let's Encrypt 证书"
    echo "  status       检查证书状态"
    echo "  install-cron 安装自动续租定时任务"
    echo "  help         显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  DOMAIN_NAME  域名 (默认: localhost)"
    echo "  SSL_EMAIL    邮箱 (默认: admin@localhost)"
    echo "  STAGING      测试模式 (默认: false)"
    echo ""
    echo "示例:"
    echo "  export DOMAIN_NAME=example.com"
    echo "  export SSL_EMAIL=admin@example.com"
    echo "  $0 obtain     # 申请证书"
    echo "  $0 status     # 检查状态"
    echo "  $0 install-cron # 安装定时任务"
}

init_dirs() {
    mkdir -p $SSL_DIR
    mkdir -p $CERTBOT_DIR/www
    mkdir -p $CERTBOT_DIR/conf
    mkdir -p ./docker-data/nginx/logs
}

generate_self_signed() {
    log "🔐 生成自签名证书..."
    init_dirs
    
    # 生成私钥
    openssl genrsa -out $SSL_DIR/privkey.pem 2048
    
    # 生成证书
    openssl req -new -key $SSL_DIR/privkey.pem -out $SSL_DIR/cert.csr \
        -subj "/C=CN/ST=State/L=City/O=Organization/CN=$DOMAIN_NAME"
    
    openssl x509 -req -days 365 -in $SSL_DIR/cert.csr \
        -signkey $SSL_DIR/privkey.pem -out $SSL_DIR/fullchain.pem
    
    # 设置权限
    chmod 600 $SSL_DIR/privkey.pem
    chmod 644 $SSL_DIR/fullchain.pem
    
    # 清理临时文件
    rm $SSL_DIR/cert.csr
    
    success "✅ 自签名证书生成完成！"
    warn "⚠️  注意: 这是自签名证书，仅用于开发和测试！"
}

obtain_letsencrypt() {
    if [ "$DOMAIN_NAME" = "localhost" ]; then
        error "不能为 localhost 申请 Let's Encrypt 证书！"
        error "请设置: export DOMAIN_NAME=your-domain.com"
        return 1
    fi
    
    log "🚀 申请 Let's Encrypt 证书..."
    init_dirs
    
    local staging_flag=""
    if [ "$STAGING" = "true" ]; then
        staging_flag="--staging"
        warn "🧪 使用测试环境"
    fi
    
    docker run --rm \
        -v "$PWD/$CERTBOT_DIR/conf:/etc/letsencrypt" \
        -v "$PWD/$CERTBOT_DIR/www:/var/www/certbot" \
        certbot/certbot \
        certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        $staging_flag \
        -d $DOMAIN_NAME
    
    if [ $? -eq 0 ]; then
        copy_certificates
        restart_nginx
        success "✅ Let's Encrypt 证书申请成功！"
    else
        error "❌ 证书申请失败！请检查域名解析和网络连接"
        return 1
    fi
}

renew_certificate() {
    if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
        warn "未找到现有证书，尝试申请新证书..."
        obtain_letsencrypt
        return
    fi
    
    # 检查是否需要续租
    local days_to_expiry=$(get_days_to_expiry)
    if [ $days_to_expiry -gt 30 ]; then
        info "证书仍然有效，剩余 $days_to_expiry 天"
        return 0
    fi
    
    log "🔄 续租证书 (剩余 $days_to_expiry 天)..."
    
    if [ "$DOMAIN_NAME" != "localhost" ]; then
        obtain_letsencrypt
    else
        warn "localhost 域名，重新生成自签名证书"
        generate_self_signed
    fi
}

copy_certificates() {
    if [ -d "$CERTBOT_DIR/conf/live/$DOMAIN_NAME" ]; then
        log "📋 复制证书到 Nginx 目录..."
        cp "$CERTBOT_DIR/conf/live/$DOMAIN_NAME/fullchain.pem" "$SSL_DIR/"
        cp "$CERTBOT_DIR/conf/live/$DOMAIN_NAME/privkey.pem" "$SSL_DIR/"
        chmod 644 $SSL_DIR/fullchain.pem
        chmod 600 $SSL_DIR/privkey.pem
        success "证书复制完成"
    fi
}

restart_nginx() {
    if command -v docker-compose &> /dev/null; then
        log "🔄 重启 Nginx 容器..."
        docker-compose restart nginx
    else
        warn "docker-compose 未找到，请手动重启 Nginx"
    fi
}

get_days_to_expiry() {
    if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
        echo "0"
        return
    fi
    
    local end_date=$(openssl x509 -in $SSL_DIR/fullchain.pem -noout -enddate | cut -d= -f2)
    local end_timestamp=$(date -d "$end_date" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$end_date" +%s 2>/dev/null)
    local current_timestamp=$(date +%s)
    echo $(( ($end_timestamp - $current_timestamp) / 86400 ))
}

check_status() {
    echo "========================================="
    echo "🔐 SSL 证书状态检查"
    echo "📅 检查时间: $(date)"
    echo "🌐 域名: $DOMAIN_NAME"
    echo "📁 证书目录: $SSL_DIR"
    echo "========================================="
    
    if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
        error "证书文件不存在"
        return 1
    fi
    
    success "证书文件存在"
    
    # 证书信息
    local issuer=$(openssl x509 -in $SSL_DIR/fullchain.pem -noout -issuer | sed 's/issuer=//')
    local subject=$(openssl x509 -in $SSL_DIR/fullchain.pem -noout -subject | sed 's/subject=//')
    local start_date=$(openssl x509 -in $SSL_DIR/fullchain.pem -noout -startdate | cut -d= -f2)
    local end_date=$(openssl x509 -in $SSL_DIR/fullchain.pem -noout -enddate | cut -d= -f2)
    
    echo "📜 颁发者: $issuer"
    echo "🏷️  主体: $subject"
    echo "🗓️  生效时间: $start_date"
    echo "⏰ 到期时间: $end_date"
    
    # 剩余天数
    local days_to_expiry=$(get_days_to_expiry)
    echo "⏳ 剩余天数: $days_to_expiry 天"
    
    # 状态判断
    if [ $days_to_expiry -lt 0 ]; then
        error "❌ 证书已过期！"
        return 2
    elif [ $days_to_expiry -lt 7 ]; then
        error "🚨 证书即将过期！"
        return 2
    elif [ $days_to_expiry -lt 30 ]; then
        warn "⚠️  证书将在 $days_to_expiry 天后过期"
        return 1
    else
        success "✅ 证书状态正常"
    fi
    
    # 检查私钥匹配
    local cert_modulus=$(openssl x509 -noout -modulus -in $SSL_DIR/fullchain.pem | md5sum)
    local key_modulus=$(openssl rsa -noout -modulus -in $SSL_DIR/privkey.pem 2>/dev/null | md5sum)
    
    if [ "$cert_modulus" = "$key_modulus" ]; then
        success "🔑 私钥与证书匹配"
    else
        error "❌ 私钥与证书不匹配！"
        return 3
    fi
    
    echo "========================================="
}

install_cron() {
    local script_path=$(realpath "$0")
    local project_path=$(dirname "$script_path")
    
    log "📅 安装自动续租定时任务..."
    
    # 创建临时 crontab 文件
    local temp_cron=$(mktemp)
    
    # 保留现有的 crontab（如果有）
    crontab -l 2>/dev/null > "$temp_cron" || true
    
    # 检查是否已经存在 SSL 续租任务
    if grep -q "ssl-manager.sh renew" "$temp_cron" 2>/dev/null; then
        warn "SSL 续租任务已存在，跳过安装"
        rm "$temp_cron"
        return 0
    fi
    
    # 添加新的定时任务
    cat >> "$temp_cron" << EOF

# SSL证书自动续租 - 每天凌晨2点检查
0 2 * * * cd $project_path && ./ssl-manager.sh renew >> ./docker-data/nginx/logs/ssl-renewal.log 2>&1
EOF
    
    # 安装 crontab
    crontab "$temp_cron"
    rm "$temp_cron"
    
    success "✅ 定时任务安装完成"
    info "💡 可使用 'crontab -l' 查看已安装的任务"
    info "📝 日志位置: ./docker-data/nginx/logs/ssl-renewal.log"
}

# 主函数
main() {
    case "${1:-help}" in
        "generate")
            generate_self_signed
            ;;
        "obtain")
            obtain_letsencrypt
            ;;
        "renew")
            renew_certificate
            ;;
        "status")
            check_status
            ;;
        "install-cron")
            install_cron
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# 执行主函数
main "$@"