#!/usr/bin/env python3
"""
测试用户注册功能
"""

from sqlalchemy.orm import Session
from app.infrastructure.persistence.database import get_db_session
from app.models.user_models import User, UserType
from app.models.tenant_models import Tenant
from app.domain.initialization.tenant_init import ensure_public_tenant_exists
from app.infrastructure.securities.security import get_password_hash
import uuid

def test_user_registration():
    """测试个人用户注册流程"""
    print("=== 测试个人用户注册流程 ===")
    
    try:
        # 获取数据库会话
        db: Session = next(get_db_session())
        
        # 1. 确保public租户存在
        public_tenant_id = ensure_public_tenant_exists(db)
        print(f"✅ Public租户ID: {public_tenant_id}")
        
        # 2. 创建测试用户数据
        user_data = {
            "id": str(uuid.uuid4()),
            "email": "testuser003@example.com",
            "username": "testuser003",
            "hashed_password": get_password_hash("TestPassword123!"),
            "user_type": UserType.INDIVIDUAL,  # 个人用户类型
            "current_tenant_id": public_tenant_id,  # 使用public租户
            "tenant_ids": [public_tenant_id],  # 租户列表
            "is_active": True,
            "is_verified": False,
        }
        
        # 3. 创建用户
        user = User(**user_data)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"✅ 用户创建成功！")
        print(f"   用户ID: {user.id}")
        print(f"   用户名: {user.username}")
        print(f"   邮箱: {user.email}")
        print(f"   用户类型: {user.user_type}")
        print(f"   租户ID: {user.current_tenant_id}")
        print(f"   租户列表: {user.tenant_ids}")
        
        # 4. 验证租户信息
        tenant = db.query(Tenant).filter(Tenant.id == public_tenant_id).first()
        if tenant:
            print(f"✅ 租户信息: {tenant.display_name} ({tenant.name})")
        
        return user
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()

def verify_user_organization():
    """验证用户是否关联了组织"""
    print("\n=== 验证个人用户无组织关联 ===")
    
    try:
        db: Session = next(get_db_session())
        
        # 查找刚创建的测试用户
        user = db.query(User).filter(
            User.email == "testuser003@example.com"
        ).first()
        
        if not user:
            print("❌ 找不到测试用户")
            return
        
        # 检查用户组织关联
        from app.models.org_models import UserOrganization
        user_orgs = db.query(UserOrganization).filter(
            UserOrganization.user_id == user.id
        ).all()
        
        if len(user_orgs) == 0:
            print("✅ 个人用户无组织关联（符合预期）")
        else:
            print(f"❌ 个人用户意外关联了 {len(user_orgs)} 个组织")
            for org in user_orgs:
                print(f"   - 组织ID: {org.organization_id}")
        
    except Exception as e:
        print(f"❌ 验证失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    user = test_user_registration()
    if user:
        verify_user_organization()
        print("\n🎉 测试完成！")