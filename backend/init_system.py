#!/usr/bin/env python3
"""
ChatX系统初始化脚本
统一初始化系统所需的基础数据：租户、超级管理员、权限、角色等

使用方法：
python init_system.py init
"""

import sys
import argparse
import logging
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from app.infrastructure.persistence.database import get_db
from app.domain.initialization.tenant_init import initialize_default_tenants
from app.domain.initialization.admin_init import initialize_super_admin, check_super_admin_exists, get_super_admin_info
from app.domain.initialization.rbac_init import initialize_rbac_system
from app.core.config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def init_system():
    """完整初始化系统"""
    logger.info("=" * 50)
    logger.info("ChatX 系统初始化开始")
    logger.info("=" * 50)
    
    success_steps = []
    failed_steps = []
    
    # 获取数据库会话
    db_generator = get_db()
    db: Session = next(db_generator)
    
    try:
        # 步骤1: 初始化默认租户
        logger.info("\n📂 步骤1: 初始化默认租户...")
        if initialize_default_tenants(db):
            success_steps.append("默认租户初始化")
            logger.info("✅ 默认租户初始化成功")
        else:
            failed_steps.append("默认租户初始化")
            logger.error("❌ 默认租户初始化失败")
            
        # 步骤2: 初始化RBAC系统
        logger.info("\n🔐 步骤2: 初始化RBAC权限系统...")
        if initialize_rbac_system(db):
            success_steps.append("RBAC系统初始化")
            logger.info("✅ RBAC系统初始化成功")
        else:
            failed_steps.append("RBAC系统初始化")
            logger.error("❌ RBAC系统初始化失败")
            
        # 步骤3: 初始化超级管理员
        logger.info("\n👤 步骤3: 初始化超级管理员...")
        if initialize_super_admin(db):
            success_steps.append("超级管理员初始化")
            logger.info("✅ 超级管理员初始化成功")
        else:
            failed_steps.append("超级管理员初始化")
            logger.error("❌ 超级管理员初始化失败")
            
        # 输出初始化结果
        logger.info("\n" + "=" * 50)
        logger.info("系统初始化完成")
        logger.info("=" * 50)
        
        if success_steps:
            logger.info(f"✅ 成功步骤 ({len(success_steps)}):")
            for step in success_steps:
                logger.info(f"   - {step}")
                
        if failed_steps:
            logger.info(f"❌ 失败步骤 ({len(failed_steps)}):")
            for step in failed_steps:
                logger.info(f"   - {step}")
            return False
        else:
            # 显示管理员登录信息
            admin_info = get_super_admin_info(db)
            if admin_info["exists"]:
                logger.info("\n🔑 超级管理员登录信息:")
                logger.info(f"   邮箱: {admin_info['email']}")
                logger.info(f"   用户名: {admin_info['username']}")
                logger.info(f"   默认密码: {settings.SUPER_ADMIN_PASSWORD}")
                logger.info("   ⚠️ 请登录后立即修改默认密码!")
            
            logger.info("\n🎉 系统初始化完全成功!")
            return True
            
    except Exception as e:
        logger.error(f"系统初始化过程中出现异常: {e}")
        db.rollback()
        return False
        
    finally:
        db.close()


def check_system_status():
    """检查系统状态"""
    logger.info("检查系统状态...")
    
    db_generator = get_db()
    db: Session = next(db_generator)
    
    try:
        # 检查超级管理员
        admin_exists = check_super_admin_exists(db)
        logger.info(f"超级管理员状态: {'✅ 已存在' if admin_exists else '❌ 不存在'}")
        
        if admin_exists:
            admin_info = get_super_admin_info(db)
            logger.info(f"管理员邮箱: {admin_info['email']}")
            logger.info(f"管理员用户名: {admin_info['username']}")
            logger.info(f"激活状态: {'✅ 已激活' if admin_info['is_active'] else '❌ 未激活'}")
            logger.info(f"创建时间: {admin_info['created_at']}")
            
        return admin_exists
        
    except Exception as e:
        logger.error(f"检查系统状态失败: {e}")
        return False
        
    finally:
        db.close()


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="ChatX系统初始化工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python init_system.py init        # 完整初始化系统
  python init_system.py status      # 检查系统状态
  python init_system.py --help      # 显示帮助信息
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # init命令
    init_parser = subparsers.add_parser('init', help='初始化系统')
    
    # status命令  
    status_parser = subparsers.add_parser('status', help='检查系统状态')
    
    args = parser.parse_args()
    
    if args.command == 'init':
        logger.info("开始系统初始化...")
        success = init_system()
        sys.exit(0 if success else 1)
        
    elif args.command == 'status':
        logger.info("检查系统状态...")
        check_system_status()
        
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()