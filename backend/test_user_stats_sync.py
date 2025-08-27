#!/usr/bin/env python3
"""
测试用户统计 - 同步版本
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.infrastructure.persistence.database import get_db
from app.models.user_models import User
from app.models.org_models import UserOrganization
from datetime import datetime, timedelta, timezone

def test_user_statistics_sync():
    """同步测试用户统计功能"""
    
    db_generator = get_db()
    db = next(db_generator)
    
    try:
        print("=== 测试用户统计（同步版本） ===")
        
        # 测试1: 只按租户过滤（公共租户）
        print("\n1. 公共租户统计（无组织过滤）:")
        query1 = db.query(User).filter(
            User.current_tenant_id == "public",
            User.deleted_at.is_(None)
        )
        users1 = query1.all()
        active1 = len([u for u in users1 if u.is_active])
        inactive1 = len(users1) - active1
        
        # 计算本月新增
        one_month_ago = datetime.now(timezone.utc) - timedelta(days=30)
        new_this_month1 = len([u for u in users1 if u.created_at and u.created_at >= one_month_ago])
        
        print(f"   总用户数: {len(users1)}")
        print(f"   活跃用户: {active1}")
        print(f"   非活跃用户: {inactive1}")
        print(f"   本月新增: {new_this_month1}")
        
        # 测试2: 按租户和组织过滤（公共租户 + 公共组织）
        print("\n2. 公共租户 + 公共组织统计:")
        query2 = db.query(User).join(UserOrganization).filter(
            and_(
                User.current_tenant_id == "public",
                User.deleted_at.is_(None),
                UserOrganization.organization_id == "public-org",
                UserOrganization.is_active == True
            )
        )
        users2 = query2.all()
        active2 = len([u for u in users2 if u.is_active])
        inactive2 = len(users2) - active2
        new_this_month2 = len([u for u in users2 if u.created_at and u.created_at >= one_month_ago])
        
        print(f"   总用户数: {len(users2)}")
        print(f"   活跃用户: {active2}")
        print(f"   非活跃用户: {inactive2}")
        print(f"   本月新增: {new_this_month2}")
        
        # 测试3: 检查用户详情
        print("\n3. 用户详细信息:")
        for user in users1:
            user_orgs = db.query(UserOrganization).filter(
                UserOrganization.user_id == user.id,
                UserOrganization.is_active == True
            ).all()
            org_names = []
            for uo in user_orgs:
                from app.models.org_models import Organization
                org = db.query(Organization).filter(Organization.id == uo.organization_id).first()
                if org:
                    org_names.append(org.name)
            
            print(f"   用户: {user.username}")
            print(f"     租户: {user.current_tenant_id}")
            print(f"     激活: {user.is_active}")
            print(f"     组织: {', '.join(org_names)}")
            print(f"     创建时间: {user.created_at}")
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    test_user_statistics_sync()