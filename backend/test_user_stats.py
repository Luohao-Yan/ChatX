#!/usr/bin/env python3
"""
测试用户统计API
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from app.infrastructure.persistence.database import get_db
from app.infrastructure.repositories.user_repository_impl import UserRepository

def test_user_statistics():
    """测试用户统计功能"""
    
    db_generator = get_db()
    db = next(db_generator)
    
    try:
        repo = UserRepository(db)
        
        print("=== 测试用户统计 ===")
        
        # 测试1: 只按租户过滤（公共租户）
        print("\n1. 公共租户统计（无组织过滤）:")
        stats1 = repo.get_user_statistics(tenant_id="public")
        print(f"   总用户数: {stats1['total']}")
        print(f"   活跃用户: {stats1['active']}")
        print(f"   非活跃用户: {stats1['inactive']}")
        print(f"   本月新增: {stats1['new_this_month']}")
        
        # 测试2: 按租户和组织过滤（公共租户 + 公共组织）
        print("\n2. 公共租户 + 公共组织统计:")
        stats2 = repo.get_user_statistics(tenant_id="public", organization_id="public-org")
        print(f"   总用户数: {stats2['total']}")
        print(f"   活跃用户: {stats2['active']}")
        print(f"   非活跃用户: {stats2['inactive']}")
        print(f"   本月新增: {stats2['new_this_month']}")
        
        # 测试3: 不过滤（所有用户）
        print("\n3. 所有用户统计（无过滤）:")
        stats3 = repo.get_user_statistics()
        print(f"   总用户数: {stats3['total']}")
        print(f"   活跃用户: {stats3['active']}")
        print(f"   非活跃用户: {stats3['inactive']}")
        print(f"   本月新增: {stats3['new_this_month']}")
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    test_user_statistics()