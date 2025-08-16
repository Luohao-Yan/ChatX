#!/usr/bin/env python3
"""
数据库完全重置脚本
警告：这将删除所有数据！仅在开发环境使用！

使用方法:
    python reset_database.py
"""

import os
import sys
import logging
from pathlib import Path
from sqlalchemy import create_engine, text
import glob

# 添加项目根目录到路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def confirm_reset(force=False):
    """确认重置操作"""
    print("⚠️  警告：这将完全删除数据库中的所有数据！")
    print("⚠️  这个操作不可逆转！")
    print(f"⚠️  目标数据库: {settings.DATABASE_URL}")
    
    if force:
        print("🚀 强制模式：跳过确认")
        return
    
    response = input("\n确定要继续吗？请输入 'YES' 确认: ")
    if response != 'YES':
        print("❌ 操作已取消")
        sys.exit(0)


def reset_database():
    """重置数据库"""
    logger.info("开始重置数据库...")
    
    try:
        engine = create_engine(settings.DATABASE_URL)
        
        with engine.connect() as conn:
            # 使用事务
            trans = conn.begin()
            try:
                logger.info("删除 public schema...")
                conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
                
                logger.info("重新创建 public schema...")
                conn.execute(text("CREATE SCHEMA public"))
                
                # 获取当前用户并授予权限
                current_user_result = conn.execute(text("SELECT current_user"))
                current_user = current_user_result.scalar()
                logger.info(f"当前数据库用户: {current_user}")
                
                conn.execute(text(f"GRANT ALL ON SCHEMA public TO {current_user}"))
                conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
                
                trans.commit()
                logger.info("✅ 数据库清理完成")
                
            except Exception as e:
                trans.rollback()
                raise e
                
    except Exception as e:
        logger.error(f"❌ 数据库重置失败: {e}")
        return False
    
    return True


def clean_migration_files():
    """清理迁移文件"""
    logger.info("清理 Alembic 迁移文件...")
    
    versions_dir = project_root / "alembic" / "versions"
    migration_files = glob.glob(str(versions_dir / "*.py"))
    
    for file in migration_files:
        try:
            os.remove(file)
            logger.info(f"删除迁移文件: {Path(file).name}")
        except Exception as e:
            logger.error(f"删除文件失败 {file}: {e}")
            return False
    
    logger.info("✅ 迁移文件清理完成")
    return True


def run_alembic_commands():
    """运行 Alembic 命令"""
    logger.info("生成新的迁移文件...")
    
    # 生成迁移
    result = os.system("alembic revision --autogenerate -m 'initial migration with all models'")
    if result != 0:
        logger.error("❌ 迁移文件生成失败")
        return False
    
    logger.info("应用迁移...")
    result = os.system("alembic upgrade head")
    if result != 0:
        logger.error("❌ 迁移应用失败")
        return False
    
    logger.info("✅ 数据库迁移完成")
    return True


def run_initialization():
    """运行系统初始化"""
    logger.info("运行系统初始化...")
    
    result = os.system("python init_system.py init")
    if result != 0:
        logger.error("❌ 系统初始化失败")
        return False
    
    logger.info("✅ 系统初始化完成")
    return True


def main():
    """主函数"""
    logger.info("=== ChatX 数据库重置工具 ===")
    
    # 检查是否有强制参数
    force = len(sys.argv) > 1 and sys.argv[1] == '--force'
    
    # 确认操作
    confirm_reset(force)
    
    # 重置数据库
    if not reset_database():
        sys.exit(1)
    
    # 清理迁移文件
    if not clean_migration_files():
        sys.exit(1)
    
    # 运行 Alembic 命令
    if not run_alembic_commands():
        sys.exit(1)
    
    # 运行初始化
    if not run_initialization():
        sys.exit(1)
    
    logger.info("🎉 数据库重置完成！")
    logger.info("📝 你现在可以使用超级管理员账户登录系统")


if __name__ == "__main__":
    main()