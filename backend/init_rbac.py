#!/usr/bin/env python3
"""
ChatX RBAC权限系统初始化脚本
手动执行脚本，用于初始化角色和权限系统

使用方法:
    python init_rbac.py

注意事项:
    1. 确保数据库连接正常
    2. 确保已运行数据库迁移
    3. 此脚本可以重复执行，不会重复创建数据
    4. 建议在系统首次部署时执行
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.core.rbac_init import initialize_rbac_system
from app.core.database import SessionLocal
from app.models.user_models import User, Role, Permission
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('rbac_init.log', encoding='utf-8')
    ]
)

logger = logging.getLogger(__name__)

def print_banner():
    """打印启动横幅"""
    banner = """
 ██████╗██╗  ██╗ █████╗ ████████╗██╗  ██╗    ██████╗ ██████╗  █████╗  ██████╗
██╔════╝██║  ██║██╔══██╗╚══██╔══╝╚██╗██╔╝    ██╔══██╗██╔══██╗██╔══██╗██╔════╝
██║     ███████║███████║   ██║    ╚███╔╝     ██████╔╝██████╔╝███████║██║     
██║     ██╔══██║██╔══██║   ██║    ██╔██╗     ██╔══██╗██╔══██╗██╔══██║██║     
╚██████╗██║  ██║██║  ██║   ██║   ██╔╝ ██╗    ██║  ██║██████╔╝██║  ██║╚██████╗
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝

                    RBAC 权限系统初始化工具 v1.0
    """
    print(banner)
    print("=" * 80)
    print("ChatX 基于角色的访问控制(RBAC)系统初始化")
    print("=" * 80)

def check_database_connection():
    """检查数据库连接"""
    print("\n🔍 检查数据库连接...")
    try:
        db = SessionLocal()
        # 尝试执行一个简单查询
        db.execute("SELECT 1")
        db.close()
        print("✅ 数据库连接正常")
        return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def check_tables_exist():
    """检查必要的表是否存在"""
    print("\n🔍 检查数据表结构...")
    try:
        db = SessionLocal()
        
        # 检查关键表是否存在
        tables_to_check = [
            ("sys_users", User),
            ("sys_roles", Role), 
            ("sys_permissions", Permission)
        ]
        
        missing_tables = []
        for table_name, model_class in tables_to_check:
            try:
                db.query(model_class).first()
            except Exception:
                missing_tables.append(table_name)
        
        db.close()
        
        if missing_tables:
            print(f"❌ 缺少数据表: {', '.join(missing_tables)}")
            print("   请先运行数据库迁移: alembic upgrade head")
            return False
        else:
            print("✅ 数据表结构完整")
            return True
            
    except Exception as e:
        print(f"❌ 检查数据表失败: {e}")
        return False

def show_current_status():
    """显示当前RBAC系统状态"""
    print("\n📊 当前系统状态:")
    try:
        db = SessionLocal()
        
        # 统计用户数
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        users_without_roles = db.query(User).filter(~User.roles.any(), User.is_active == True).count()
        
        # 统计角色数
        total_roles = db.query(Role).count()
        system_roles = db.query(Role).filter(Role.is_system == True).count()
        active_roles = db.query(Role).filter(Role.is_active == True).count()
        
        # 统计权限数
        total_permissions = db.query(Permission).count()
        system_permissions = db.query(Permission).filter(Permission.is_system == True).count()
        active_permissions = db.query(Permission).filter(Permission.is_active == True).count()
        
        db.close()
        
        print(f"   👥 用户统计: 总数 {total_users}, 活跃 {active_users}, 无角色 {users_without_roles}")
        print(f"   🎭 角色统计: 总数 {total_roles}, 系统角色 {system_roles}, 活跃 {active_roles}")
        print(f"   🔐 权限统计: 总数 {total_permissions}, 系统权限 {system_permissions}, 活跃 {active_permissions}")
        
        return {
            "users_without_roles": users_without_roles,
            "system_roles": system_roles,
            "system_permissions": system_permissions
        }
        
    except Exception as e:
        print(f"   ❌ 获取系统状态失败: {e}")
        return None

def confirm_initialization(status):
    """确认是否执行初始化"""
    print("\n" + "=" * 50)
    print("🚀 准备执行RBAC系统初始化")
    print("=" * 50)
    
    if status:
        if status["system_roles"] > 0 or status["system_permissions"] > 0:
            print("⚠️  检测到系统已存在RBAC数据:")
            if status["system_roles"] > 0:
                print(f"   • 已有 {status['system_roles']} 个系统角色")
            if status["system_permissions"] > 0:
                print(f"   • 已有 {status['system_permissions']} 个系统权限")
            print("   • 初始化脚本会跳过已存在的数据，不会重复创建")
        
        if status["users_without_roles"] > 0:
            print(f"📝 将为 {status['users_without_roles']} 个无角色用户分配默认角色")
    
    print("\n即将执行以下操作:")
    print("1. 创建默认权限 (用户、角色、文件、组织、系统管理权限)")
    print("2. 创建默认角色 (超级管理员、租户管理员、组织管理员等)")
    print("3. 为现有无角色用户分配默认用户角色")
    print("4. 建立角色与权限的关联关系")
    
    while True:
        choice = input("\n是否继续执行初始化? (y/n): ").lower().strip()
        if choice in ['y', 'yes', '是']:
            return True
        elif choice in ['n', 'no', '否']:
            print("❌ 用户取消初始化")
            return False
        else:
            print("请输入 y 或 n")

def main():
    """主函数"""
    print_banner()
    
    # 1. 检查数据库连接
    if not check_database_connection():
        sys.exit(1)
    
    # 2. 检查数据表结构
    if not check_tables_exist():
        sys.exit(1)
    
    # 3. 显示当前状态
    status = show_current_status()
    
    # 4. 确认是否执行初始化
    if not confirm_initialization(status):
        sys.exit(0)
    
    # 5. 执行初始化
    print("\n" + "🚀" * 20 + " 开始执行初始化 " + "🚀" * 20)
    
    try:
        db = SessionLocal()
        success = initialize_rbac_system(db)
        db.close()
        
        if success:
            print("\n" + "✅" * 20 + " 初始化完成 " + "✅" * 20)
            print("🎉 RBAC权限系统初始化成功!")
            
            # 显示最终状态
            print("\n📊 初始化后系统状态:")
            show_current_status()
            
            print("\n📝 后续操作建议:")
            print("1. 创建系统管理员用户")
            print("2. 为用户分配适当的角色")
            print("3. 根据需要创建自定义角色和权限")
            print("4. 运行权限系统测试: python test_rbac.py")
            
        else:
            print("\n❌ RBAC权限系统初始化失败!")
            print("请检查日志文件 rbac_init.log 获取详细错误信息")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n❌ 用户中断初始化过程")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 初始化过程中发生错误: {e}")
        logger.exception("初始化失败")
        sys.exit(1)

if __name__ == "__main__":
    main()