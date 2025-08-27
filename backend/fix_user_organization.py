#!/usr/bin/env python3
"""
修复用户组织关联脚本
用于将没有组织关联的用户添加到公共租户的公共组织中
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
from app.models.user_models import User
from app.models.org_models import Organization, UserOrganization
from app.models.tenant_models import Tenant
import uuid

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_user_info(db: Session, user_id: str):
    """获取用户信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.error(f"用户 {user_id} 不存在")
        return None
    
    logger.info(f"用户信息:")
    logger.info(f"  ID: {user.id}")
    logger.info(f"  用户名: {user.username}")
    logger.info(f"  邮箱: {user.email}")
    logger.info(f"  当前租户ID: {user.current_tenant_id}")
    logger.info(f"  是否激活: {user.is_active}")
    logger.info(f"  创建时间: {user.created_at}")
    
    # 检查组织关联
    user_orgs = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id
    ).all()
    
    logger.info(f"  关联组织数量: {len(user_orgs)}")
    for org_rel in user_orgs:
        org = db.query(Organization).filter(Organization.id == org_rel.organization_id).first()
        logger.info(f"    - 组织: {org.name if org else 'Unknown'} (ID: {org_rel.organization_id})")
    
    return user


def delete_user(db: Session, user_id: str):
    """删除用户（软删除）"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"用户 {user_id} 不存在")
            return False
        
        from datetime import datetime, timezone
        user.deleted_at = datetime.now(timezone.utc)
        user.deleted_by = "admin"
        user.is_active = False
        
        db.commit()
        logger.info(f"✅ 用户 {user.username} ({user_id}) 已删除")
        return True
        
    except Exception as e:
        logger.error(f"❌ 删除用户失败: {e}")
        db.rollback()
        return False


def add_user_to_public_org(db: Session, user_id: str):
    """将用户添加到公共组织"""
    try:
        # 1. 检查用户是否存在
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"用户 {user_id} 不存在")
            return False
        
        # 2. 获取公共租户
        public_tenant = db.query(Tenant).filter(Tenant.name == "public").first()
        if not public_tenant:
            logger.error("公共租户不存在")
            return False
        
        # 3. 获取公共组织
        public_org = db.query(Organization).filter(
            Organization.tenant_id == public_tenant.id,
            Organization.name == "公共组织"
        ).first()
        
        if not public_org:
            logger.error("公共组织不存在")
            return False
        
        # 4. 检查是否已存在关联
        existing_relation = db.query(UserOrganization).filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == public_org.id
        ).first()
        
        if existing_relation:
            logger.info(f"用户 {user.username} 已关联到公共组织")
            return True
        
        # 5. 更新用户的租户信息
        user.current_tenant_id = public_tenant.id
        if not user.tenant_ids or public_tenant.id not in user.tenant_ids:
            user.tenant_ids = user.tenant_ids or []
            user.tenant_ids.append(public_tenant.id)
        
        # 6. 创建用户-组织关联
        user_org_relation = UserOrganization(
            id=uuid.uuid4(),
            tenant_id=public_tenant.id,
            user_id=user_id,
            organization_id=public_org.id,
            role="member",  # 普通成员
            is_admin=False,
            is_active=True
        )
        
        db.add(user_org_relation)
        db.commit()
        
        logger.info(f"✅ 用户 {user.username} ({user_id}) 已添加到公共组织")
        logger.info(f"   租户: {public_tenant.display_name}")
        logger.info(f"   组织: {public_org.display_name}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 添加用户到公共组织失败: {e}")
        db.rollback()
        return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="用户组织关联修复工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python fix_user_organization.py info 63a210c2-c356-461e-b525-30c8fee58e01     # 查看用户信息
  python fix_user_organization.py delete 63a210c2-c356-461e-b525-30c8fee58e01   # 删除用户
  python fix_user_organization.py fix 63a210c2-c356-461e-b525-30c8fee58e01      # 将用户添加到公共组织
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # info命令
    info_parser = subparsers.add_parser('info', help='查看用户信息')
    info_parser.add_argument('user_id', help='用户ID')
    
    # delete命令
    delete_parser = subparsers.add_parser('delete', help='删除用户')
    delete_parser.add_argument('user_id', help='用户ID')
    
    # fix命令  
    fix_parser = subparsers.add_parser('fix', help='将用户添加到公共组织')
    fix_parser.add_argument('user_id', help='用户ID')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # 获取数据库会话
    db_generator = get_db()
    db: Session = next(db_generator)
    
    try:
        if args.command == 'info':
            get_user_info(db, args.user_id)
            
        elif args.command == 'delete':
            logger.info(f"准备删除用户: {args.user_id}")
            if delete_user(db, args.user_id):
                logger.info("✅ 删除操作完成")
            else:
                logger.error("❌ 删除操作失败")
                sys.exit(1)
                
        elif args.command == 'fix':
            logger.info(f"准备将用户添加到公共组织: {args.user_id}")
            if add_user_to_public_org(db, args.user_id):
                logger.info("✅ 修复操作完成")
            else:
                logger.error("❌ 修复操作失败")
                sys.exit(1)
                
    except Exception as e:
        logger.error(f"操作失败: {e}")
        sys.exit(1)
        
    finally:
        db.close()


if __name__ == "__main__":
    main()