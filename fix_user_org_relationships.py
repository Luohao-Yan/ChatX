#!/usr/bin/env python3
"""
修复用户-组织关系脚本
确保所有用户都有正确的UserOrganization关系
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from app.infrastructure.persistence.database import engine
from app.models.user_models import User
from app.models.org_models import UserOrganization, Organization
import uuid

def fix_user_organization_relationships():
    """修复用户-组织关系"""
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("开始修复用户-组织关系...")
        
        # 获取所有用户
        users = db.query(User).filter(User.deleted_at.is_(None)).all()
        print(f"找到 {len(users)} 个用户")
        
        # 获取所有组织
        organizations = db.query(Organization).filter(Organization.deleted_at.is_(None)).all()
        print(f"找到 {len(organizations)} 个组织")
        
        if not organizations:
            print("⚠️ 没有找到任何组织，无法建立用户-组织关系")
            return
        
        # 获取默认组织（通常是第一个或最高级的组织）
        default_org = organizations[0]  # 使用第一个组织作为默认
        print(f"使用默认组织: {default_org.name} (ID: {default_org.id})")
        
        # 检查每个用户的组织关系
        for user in users:
            print(f"检查用户: {user.username}")
            
            # 查看是否已有UserOrganization关系
            existing_relationship = db.query(UserOrganization).filter(
                UserOrganization.user_id == user.id,
                UserOrganization.tenant_id == user.current_tenant_id
            ).first()
            
            if existing_relationship:
                print(f"  ✓ 用户 {user.username} 已有组织关系 (组织ID: {existing_relationship.organization_id})")
            else:
                # 创建默认的用户-组织关系
                user_org = UserOrganization(
                    id=uuid.uuid4(),
                    tenant_id=user.current_tenant_id,
                    user_id=user.id,
                    organization_id=default_org.id,
                    role="member",
                    is_admin=user.is_superuser,  # 超级管理员设为组织管理员
                    is_active=True
                )
                db.add(user_org)
                print(f"  ➕ 为用户 {user.username} 创建了组织关系 (组织: {default_org.name})")
        
        # 提交更改
        db.commit()
        print("✅ 用户-组织关系修复完成")
        
        # 验证结果
        print("\n验证结果:")
        for user in users:
            relationships = db.query(UserOrganization).filter(
                UserOrganization.user_id == user.id
            ).all()
            print(f"用户 {user.username}: {len(relationships)} 个组织关系")
            for rel in relationships:
                org = db.query(Organization).filter(Organization.id == rel.organization_id).first()
                org_name = org.name if org else "未知组织"
                print(f"  - 组织: {org_name} (角色: {rel.role})")
        
    except Exception as e:
        print(f"❌ 修复过程中出错: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_user_organization_relationships()