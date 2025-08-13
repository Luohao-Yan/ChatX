#!/usr/bin/env python3
"""
系统初始化脚本
初始化RBAC系统和超级管理员
"""

import asyncio
import logging
import sys
from sqlalchemy.orm import Session
from app.infrastructure.persistence.database import get_db_session
from app.domain.initialization.rbac_init import initialize_rbac_system
from app.domain.initialization.admin_init import initialize_super_admin, get_super_admin_info
from app.core.config import settings
from app.application.services.email_service import EmailService

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def init_rbac_and_admin():
    """初始化RBAC系统和超级管理员"""
    logger.info("=== ChatX 系统初始化开始 ===")
    
    try:
        # 获取数据库会话
        db: Session = next(get_db_session())
        
        # 1. 初始化RBAC系统（权限和角色）
        logger.info("步骤 1: 初始化RBAC系统...")
        rbac_success = initialize_rbac_system(db)
        
        if rbac_success:
            logger.info("✅ RBAC系统初始化成功")
            
            # 2. 初始化超级管理员
            logger.info("步骤 2: 初始化超级管理员...")
            admin_success = initialize_super_admin(db)
            
            if admin_success:
                logger.info("✅ 超级管理员初始化成功")
                
                # 显示超级管理员信息
                admin_info = get_super_admin_info(db)
                if admin_info["exists"]:
                    logger.info("\n" + "="*50)
                    logger.info("🎉 ChatX 系统初始化完成！")
                    logger.info("="*50)
                    logger.info("超级管理员登录信息：")
                    logger.info(f"  邮箱: {admin_info['email']}")
                    logger.info(f"  用户名: {admin_info['username']}")
                    logger.info(f"  密码: {settings.SUPER_ADMIN_PASSWORD}")
                    logger.info(f"  角色: {', '.join(admin_info['roles'])}")
                    logger.info("="*50)
                    logger.info("⚠️  请登录后立即修改默认密码！")
                    logger.info("🚀 现在可以启动应用了：python -m app.main")
                    logger.info("="*50)
                else:
                    logger.error("❌ 获取超级管理员信息失败")
                    return False
            else:
                logger.error("❌ 超级管理员初始化失败")
                return False
        else:
            logger.error("❌ RBAC系统初始化失败")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 系统初始化失败: {e}")
        return False
    finally:
        db.close()


def check_system_status():
    """检查系统状态"""
    logger.info("=== 检查系统状态 ===")
    
    try:
        db: Session = next(get_db_session())
        
        # 检查超级管理员
        admin_info = get_super_admin_info(db)
        
        if admin_info["exists"]:
            logger.info("✅ 系统已初始化")
            logger.info(f"超级管理员邮箱: {admin_info['email']}")
            logger.info(f"超级管理员用户名: {admin_info['username']}")
            logger.info(f"拥有角色: {', '.join(admin_info['roles'])}")
            
            # 检查邮件配置
            if settings.SMTP_ENABLED:
                logger.info(f"✅ SMTP邮件服务已启用: {settings.SMTP_SERVER}:{settings.SMTP_PORT}")
            else:
                logger.info("⚠️  SMTP邮件服务未启用（验证码将在控制台显示）")
            
            return True
        else:
            logger.info("❌ 系统未初始化，请运行初始化")
            return False
            
    except Exception as e:
        logger.error(f"检查系统状态失败: {e}")
        return False
    finally:
        db.close()


def show_email_configs():
    """显示支持的邮件配置"""
    
    logger.info("\n=== 支持的邮件服务配置 ===")
    logger.info("可以在 .env 文件中配置以下邮件服务：\n")
    
    configs = EmailService.SMTP_CONFIGS
    
    for provider, config in configs.items():
        logger.info(f"📧 {provider.upper()}")
        logger.info(f"   SMTP_SERVER={config['server']}")
        logger.info(f"   SMTP_PORT={config['port']}")
        logger.info(f"   SMTP_USE_TLS={config['use_tls']}")
        logger.info(f"   SMTP_USE_SSL={config['use_ssl']}")
        logger.info(f"   SMTP_ENABLED=true")
        logger.info(f"   SMTP_USERNAME=your_email@{provider}.com")
        logger.info(f"   SMTP_PASSWORD=your_app_password")
        logger.info(f"   SMTP_FROM_EMAIL=your_email@{provider}.com")
        logger.info("")
    
    logger.info("注意：")
    logger.info("- Gmail 需要使用应用专用密码")
    logger.info("- QQ邮箱需要开启SMTP服务并获取授权码")
    logger.info("- 企业邮箱请联系管理员获取SMTP配置")


def main():
    """主函数"""
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "init":
            success = init_rbac_and_admin()
            sys.exit(0 if success else 1)
        
        elif command == "status":
            success = check_system_status()
            sys.exit(0 if success else 1)
        
        elif command == "email-configs":
            show_email_configs()
            sys.exit(0)
        
        elif command == "help":
            print("ChatX 系统初始化工具")
            print("\n用法：")
            print("  python init_system.py init          # 初始化系统")
            print("  python init_system.py status        # 检查系统状态")
            print("  python init_system.py email-configs # 显示邮件配置")
            print("  python init_system.py help          # 显示帮助")
            sys.exit(0)
        
        else:
            print(f"未知命令: {command}")
            print("使用 'python init_system.py help' 查看帮助")
            sys.exit(1)
    
    else:
        # 默认执行状态检查，如果未初始化则执行初始化
        if not check_system_status():
            print("\n系统未初始化，正在执行初始化...")
            success = init_rbac_and_admin()
            sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()