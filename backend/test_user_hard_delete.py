#!/usr/bin/env python3
"""
测试用户彻底删除功能
验证是否能够完全清理用户的所有关联数据
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.infrastructure.persistence.database import get_db
from app.models.user_models import User, UserProfile, UserSession, UserActivity, UserVerification
from app.models.org_models import UserOrganization, UserTeam
from app.models.rbac_models import UserPermission
from app.models.tenant_models import TenantUser
from app.models.file_models import FileComment, FileOperationLog
from app.models.relationship_models import user_role_association, user_group_association
from app.infrastructure.repositories.user_repository_impl import UserRepository
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_user_associations(db, user_id: str):
    """检查用户的关联数据"""
    associations = {}
    
    # 检查各种关联表
    associations['profiles'] = db.query(UserProfile).filter(UserProfile.user_id == user_id).count()
    associations['sessions'] = db.query(UserSession).filter(UserSession.user_id == user_id).count()
    associations['activities'] = db.query(UserActivity).filter(UserActivity.user_id == user_id).count()
    associations['verifications'] = db.query(UserVerification).filter(UserVerification.user_id == user_id).count()
    associations['organizations'] = db.query(UserOrganization).filter(UserOrganization.user_id == user_id).count()
    associations['teams'] = db.query(UserTeam).filter(UserTeam.user_id == user_id).count()
    associations['permissions'] = db.query(UserPermission).filter(UserPermission.user_id == user_id).count()
    associations['tenants'] = db.query(TenantUser).filter(TenantUser.user_id == user_id).count()
    associations['file_comments'] = db.query(FileComment).filter(FileComment.user_id == user_id).count()
    associations['file_logs'] = db.query(FileOperationLog).filter(FileOperationLog.user_id == user_id).count()
    
    # 检查关联表
    associations['user_roles'] = db.execute(
        user_role_association.select().where(user_role_association.c.user_id == user_id)
    ).fetchall()
    associations['user_groups'] = db.execute(
        user_group_association.select().where(user_group_association.c.user_id == user_id)
    ).fetchall()
    
    return associations

def test_hard_delete():
    """测试彻底删除功能"""
    db = next(get_db())
    
    try:
        # 查找一个已删除的测试用户
        deleted_user = db.query(User).filter(
            User.deleted_at.isnot(None)
        ).first()
        
        if not deleted_user:
            logger.info("没有找到已删除的用户进行测试")
            # 创建一个测试用户进行删除测试
            logger.info("创建测试用户进行删除测试...")
            return create_test_user_and_delete(db)
            
        user_id = deleted_user.id
        logger.info(f"找到已删除的测试用户: {deleted_user.email} (ID: {user_id})")
        
        # 检查删除前的关联数据
        logger.info("检查删除前的关联数据...")
        before_associations = check_user_associations(db, user_id)
        
        total_associations = 0
        for key, value in before_associations.items():
            if isinstance(value, list):
                count = len(value)
            else:
                count = value
            total_associations += count
            if count > 0:
                logger.info(f"  {key}: {count}")
                
        logger.info(f"总关联记录数: {total_associations}")
        
        if total_associations == 0:
            logger.info("该用户没有关联数据，无法测试彻底删除")
            return True
            
        # 执行彻底删除
        logger.info("执行彻底删除...")
        user_repo = UserRepository(db)
        success = await user_repo.hard_delete(user_id)
        
        if success:
            logger.info("✅ 彻底删除操作成功")
            
            # 检查删除后的关联数据
            logger.info("检查删除后的关联数据...")
            after_associations = check_user_associations(db, user_id)
            
            total_remaining = 0
            for key, value in after_associations.items():
                if isinstance(value, list):
                    count = len(value)
                else:
                    count = value
                total_remaining += count
                if count > 0:
                    logger.warning(f"  剩余 {key}: {count}")
                    
            # 检查用户主记录是否被删除
            user_exists = db.query(User).filter(User.id == user_id).first()
            if user_exists:
                logger.error("❌ 用户主记录未被删除!")
                total_remaining += 1
                
            if total_remaining == 0:
                logger.info("🎉 彻底删除完全成功，所有关联数据已清理")
                return True
            else:
                logger.error(f"❌ 仍有 {total_remaining} 条关联数据未被删除")
                return False
        else:
            logger.error("❌ 彻底删除操作失败")
            return False
            
    except Exception as e:
        logger.error(f"测试过程中出现异常: {e}")
        return False
        
    finally:
        db.close()

def create_test_user_and_delete(db):
    """创建测试用户并进行删除测试"""
    # 这里可以添加创建测试用户的逻辑
    logger.info("请先在系统中创建一些测试用户并删除到回收站，然后再运行此测试")
    return True

async def main():
    """主函数"""
    logger.info("=" * 50)
    logger.info("用户彻底删除功能测试")
    logger.info("=" * 50)
    
    success = test_hard_delete()
    
    if success:
        logger.info("🎉 测试通过")
    else:
        logger.error("❌ 测试失败")
        sys.exit(1)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())