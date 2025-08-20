#!/usr/bin/env python3
"""
修正用户-组织关系为更现实的分配
每个用户应该只属于一个或少数几个组织，而不是所有组织
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from app.infrastructure.persistence.database import engine
from app.models.user_models import User
from app.models.org_models import UserOrganization, Organization

def fix_realistic_organization_relationships():
    """修正用户-组织关系为更现实的分配"""
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("开始修正用户-组织关系...")
        
        # 清除现有的 UserOrganization 关系
        db.query(UserOrganization).delete()
        print("已清除现有的用户-组织关系")
        
        # 获取组织
        orgs = {}
        all_orgs = db.query(Organization).filter(Organization.deleted_at.is_(None)).all()
        for org in all_orgs:
            orgs[org.name] = org
            print(f"组织: {org.name} (ID: {org.id}, Level: {org.level})")
        
        # 获取用户
        users = db.query(User).filter(User.deleted_at.is_(None)).all()
        
        # 现实化的用户-组织分配
        user_org_assignments = {
            "superadmin": ["强盛集团"],  # 超级管理员只属于顶级组织
            "test01": ["办公室一部"],     # test01 属于具体部门
            "test02": ["总裁室"]          # test02 属于另一个部门
        }
        
        for user in users:
            assigned_orgs = user_org_assignments.get(user.username, ["强盛集团"])  # 默认分配到顶级组织
            
            print(f"\n为用户 {user.username} 分配组织:")
            for org_name in assigned_orgs:
                if org_name in orgs:
                    org = orgs[org_name]
                    
                    # 创建用户-组织关系
                    user_org = UserOrganization(
                        tenant_id=user.current_tenant_id,
                        user_id=user.id,
                        organization_id=org.id,
                        role="admin" if user.is_superuser else "member",
                        is_admin=user.is_superuser,
                        is_active=True
                    )
                    db.add(user_org)
                    print(f"  ✓ 添加到组织: {org_name} (角色: {'admin' if user.is_superuser else 'member'})")
                else:
                    print(f"  ❌ 组织 {org_name} 不存在")
        
        # 提交更改
        db.commit()
        print("\n✅ 用户-组织关系修正完成")
        
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
        print(f"❌ 修正过程中出错: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_realistic_organization_relationships()