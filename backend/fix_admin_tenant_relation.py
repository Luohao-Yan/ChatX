#!/usr/bin/env python3
"""
修复超级管理员和租户关联关系
解决租户ID不一致的问题
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.infrastructure.persistence.database import get_db
from app.models.user_models import User
from app.models.tenant_models import Tenant
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_admin_tenant_relation():
    """修复超级管理员和租户关联关系"""
    db = next(get_db())
    
    try:
        # 1. 查找超级管理员
        admin = db.query(User).filter(User.email == settings.SUPER_ADMIN_EMAIL).first()
        if not admin:
            logger.error("❌ 找不到超级管理员用户")
            return False
            
        logger.info(f"找到超级管理员: {admin.email} (ID: {admin.id})")
        
        # 2. 查找system租户
        system_tenant = db.query(Tenant).filter(Tenant.name == "system").first()
        if not system_tenant:
            logger.error("❌ 找不到system租户")
            return False
            
        logger.info(f"找到system租户: {system_tenant.name} (ID: {system_tenant.id})")
        
        # 3. 查找public租户
        public_tenant = db.query(Tenant).filter(Tenant.name == "public").first()
        if not public_tenant:
            logger.error("❌ 找不到public租户")
            return False
            
        logger.info(f"找到public租户: {public_tenant.name} (ID: {public_tenant.id})")
        
        # 4. 修复超级管理员的租户关联
        old_tenant_id = admin.current_tenant_id
        admin.current_tenant_id = system_tenant.id
        admin.tenant_ids = [system_tenant.id]
        
        logger.info(f"更新超级管理员租户关联: {old_tenant_id} -> {system_tenant.id}")
        
        # 5. 修复system租户的所有者
        old_owner = system_tenant.owner_id
        system_tenant.owner_id = admin.id
        
        logger.info(f"更新system租户所有者: {old_owner} -> {admin.id}")
        
        # 6. 修复public租户的所有者（可以保持为system，或设为管理员ID）
        public_tenant.owner_id = admin.id
        logger.info(f"更新public租户所有者为超级管理员ID: {admin.id}")
        
        # 7. 提交更改
        db.commit()
        
        # 8. 验证修复结果
        db.refresh(admin)
        db.refresh(system_tenant)
        db.refresh(public_tenant)
        
        logger.info("✅ 修复完成，验证结果:")
        logger.info(f"  超级管理员当前租户: {admin.current_tenant_id}")
        logger.info(f"  超级管理员租户列表: {admin.tenant_ids}")
        logger.info(f"  System租户所有者: {system_tenant.owner_id}")
        logger.info(f"  Public租户所有者: {public_tenant.owner_id}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 修复过程中出现异常: {e}")
        db.rollback()
        return False
        
    finally:
        db.close()

def check_current_status():
    """检查当前状态"""
    db = next(get_db())
    
    try:
        logger.info("=" * 50)
        logger.info("当前系统状态检查")
        logger.info("=" * 50)
        
        # 检查超级管理员
        admin = db.query(User).filter(User.email == settings.SUPER_ADMIN_EMAIL).first()
        if admin:
            logger.info(f"超级管理员: {admin.email}")
            logger.info(f"  ID: {admin.id}")
            logger.info(f"  用户类型: {admin.user_type}")
            logger.info(f"  当前租户: {admin.current_tenant_id}")
            logger.info(f"  租户列表: {admin.tenant_ids}")
            logger.info(f"  是否超管: {admin.is_superuser}")
        else:
            logger.error("❌ 超级管理员不存在")
            
        # 检查所有租户
        tenants = db.query(Tenant).all()
        logger.info(f"\n系统中的所有租户 ({len(tenants)}个):")
        for tenant in tenants:
            logger.info(f"  租户: {tenant.name} (ID: {tenant.id})")
            logger.info(f"    显示名: {tenant.display_name}")
            logger.info(f"    所有者: {tenant.owner_id}")
            logger.info(f"    状态: {tenant.status}")
            
    except Exception as e:
        logger.error(f"状态检查失败: {e}")
        
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="修复超级管理员和租户关联关系")
    parser.add_argument("action", choices=["check", "fix"], help="执行动作：check(检查) 或 fix(修复)")
    
    args = parser.parse_args()
    
    if args.action == "check":
        check_current_status()
    elif args.action == "fix":
        logger.info("开始修复超级管理员和租户关联关系...")
        if fix_admin_tenant_relation():
            logger.info("🎉 修复成功完成!")
            logger.info("\n验证修复结果:")
            check_current_status()
        else:
            logger.error("修复失败!")
            sys.exit(1)