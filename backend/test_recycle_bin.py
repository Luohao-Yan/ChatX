#!/usr/bin/env python3
"""
回收站功能测试脚本
测试用户、组织、部门的软删除、恢复、永久删除等功能
"""
import asyncio
import httpx
import json
from datetime import datetime
from typing import Dict, Any, List


class RecycleBinTester:
    def __init__(self, base_url: str = "http://localhost/api/v1"):
        self.base_url = base_url
        self.access_token = None
        self.user_id = None
        self.tenant_id = None
        
    async def authenticate(self, email: str = "admin@test.com", password: str = "admin123"):
        """用户认证获取访问令牌"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/auth/login",
                json={"email": email, "password": password}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.tenant_id = data["user"]["tenant_id"]
                print(f"✅ 认证成功: 用户ID {self.user_id}, 租户ID {self.tenant_id}")
                return True
            else:
                print(f"❌ 认证失败: {response.status_code} - {response.text}")
                return False
    
    def get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def test_user_lifecycle(self):
        """测试用户生命周期：创建 -> 软删除 -> 回收站查看 -> 恢复 -> 永久删除"""
        print("\n🧪 测试用户生命周期...")
        
        async with httpx.AsyncClient() as client:
            # 1. 创建测试用户
            create_data = {
                "email": f"test_user_{datetime.now().timestamp()}@test.com",
                "username": f"testuser_{int(datetime.now().timestamp())}",
                "full_name": "测试用户",
                "password": "Test123456!"
            }
            
            response = await client.post(
                f"{self.base_url}/users/register",
                json=create_data
            )
            
            if response.status_code == 200:
                test_user = response.json()
                test_user_id = test_user["id"]
                print(f"✅ 创建测试用户成功: ID {test_user_id}")
            else:
                print(f"❌ 创建测试用户失败: {response.status_code} - {response.text}")
                return False
            
            # 2. 软删除用户
            response = await client.delete(
                f"{self.base_url}/users/{test_user_id}",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                print(f"✅ 软删除用户成功: {response.json()}")
            else:
                print(f"❌ 软删除用户失败: {response.status_code} - {response.text}")
                return False
            
            # 3. 在回收站中查看已删除用户
            response = await client.get(
                f"{self.base_url}/recycle-bin/?resource_type=user",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                recycle_data = response.json()
                found_user = False
                for item in recycle_data["items"]:
                    if item["resource_id"] == test_user_id:
                        found_user = True
                        print(f"✅ 在回收站找到已删除用户: {item['name']}")
                        break
                
                if not found_user:
                    print("❌ 在回收站中未找到已删除用户")
                    return False
            else:
                print(f"❌ 获取回收站失败: {response.status_code} - {response.text}")
                return False
            
            # 4. 恢复用户
            restore_data = {
                "resource_type": "user",
                "resource_ids": [test_user_id],
                "reason": "测试恢复操作"
            }
            
            response = await client.post(
                f"{self.base_url}/recycle-bin/restore",
                json=restore_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 恢复用户成功: {result['message']}")
            else:
                print(f"❌ 恢复用户失败: {response.status_code} - {response.text}")
                return False
            
            # 5. 再次软删除，然后永久删除
            response = await client.delete(
                f"{self.base_url}/users/{test_user_id}",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                print("✅ 再次软删除用户成功")
            else:
                print(f"❌ 再次软删除用户失败: {response.status_code} - {response.text}")
                return False
            
            # 6. 永久删除用户
            permanent_delete_data = {
                "resource_type": "user",
                "resource_ids": [test_user_id],
                "confirm": True,
                "reason": "测试永久删除操作"
            }
            
            response = await client.delete(
                f"{self.base_url}/recycle-bin/permanent-delete",
                json=permanent_delete_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 永久删除用户成功: {result['message']}")
            else:
                print(f"❌ 永久删除用户失败: {response.status_code} - {response.text}")
                return False
            
            return True
    
    async def test_user_status_management(self):
        """测试用户状态管理"""
        print("\n🧪 测试用户状态管理...")
        
        async with httpx.AsyncClient() as client:
            # 1. 创建测试用户
            create_data = {
                "email": f"status_test_{datetime.now().timestamp()}@test.com",
                "username": f"statustest_{int(datetime.now().timestamp())}",
                "full_name": "状态测试用户",
                "password": "Test123456!"
            }
            
            response = await client.post(
                f"{self.base_url}/users/register",
                json=create_data
            )
            
            if response.status_code == 200:
                test_user = response.json()
                test_user_id = test_user["id"]
                print(f"✅ 创建状态测试用户成功: ID {test_user_id}")
            else:
                print(f"❌ 创建状态测试用户失败: {response.status_code} - {response.text}")
                return False
            
            # 2. 停用用户
            status_data = {
                "status": "inactive",
                "reason": "测试停用功能"
            }
            
            response = await client.patch(
                f"{self.base_url}/recycle-bin/users/{test_user_id}/status",
                json=status_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 停用用户成功: {result['message']}")
            else:
                print(f"❌ 停用用户失败: {response.status_code} - {response.text}")
                return False
            
            # 3. 重新激活用户
            status_data = {
                "status": "active",
                "reason": "测试激活功能"
            }
            
            response = await client.patch(
                f"{self.base_url}/recycle-bin/users/{test_user_id}/status",
                json=status_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 激活用户成功: {result['message']}")
            else:
                print(f"❌ 激活用户失败: {response.status_code} - {response.text}")
                return False
            
            # 4. 清理测试数据
            await client.delete(
                f"{self.base_url}/users/{test_user_id}",
                headers=self.get_headers()
            )
            
            permanent_delete_data = {
                "resource_type": "user",
                "resource_ids": [test_user_id],
                "confirm": True,
                "reason": "清理测试数据"
            }
            
            await client.delete(
                f"{self.base_url}/recycle-bin/permanent-delete",
                json=permanent_delete_data,
                headers=self.get_headers()
            )
            
            return True
    
    async def test_batch_operations(self):
        """测试批量操作"""
        print("\n🧪 测试批量操作...")
        
        async with httpx.AsyncClient() as client:
            # 1. 创建多个测试用户
            test_user_ids = []
            for i in range(3):
                create_data = {
                    "email": f"batch_test_{i}_{datetime.now().timestamp()}@test.com",
                    "username": f"batchtest_{i}_{int(datetime.now().timestamp())}",
                    "full_name": f"批量测试用户{i}",
                    "password": "Test123456!"
                }
                
                response = await client.post(
                    f"{self.base_url}/users/register",
                    json=create_data
                )
                
                if response.status_code == 200:
                    test_user = response.json()
                    test_user_ids.append(test_user["id"])
                    print(f"✅ 创建批量测试用户{i}成功: ID {test_user['id']}")
                else:
                    print(f"❌ 创建批量测试用户{i}失败: {response.status_code} - {response.text}")
                    return False
            
            # 2. 批量软删除
            soft_delete_data = {
                "resource_type": "user",
                "resource_ids": test_user_ids,
                "reason": "批量软删除测试"
            }
            
            response = await client.post(
                f"{self.base_url}/recycle-bin/soft-delete",
                json=soft_delete_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 批量软删除成功: {result['message']}")
            else:
                print(f"❌ 批量软删除失败: {response.status_code} - {response.text}")
                return False
            
            # 3. 批量恢复
            restore_data = {
                "resource_type": "user",
                "resource_ids": test_user_ids[:2],  # 只恢复前两个
                "reason": "批量恢复测试"
            }
            
            response = await client.post(
                f"{self.base_url}/recycle-bin/restore",
                json=restore_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 批量恢复成功: {result['message']}")
            else:
                print(f"❌ 批量恢复失败: {response.status_code} - {response.text}")
                return False
            
            # 4. 批量永久删除（删除所有测试用户）
            # 先确保所有用户都是软删除状态
            for user_id in test_user_ids[:2]:
                await client.delete(
                    f"{self.base_url}/users/{user_id}",
                    headers=self.get_headers()
                )
            
            permanent_delete_data = {
                "resource_type": "user",
                "resource_ids": test_user_ids,
                "confirm": True,
                "reason": "清理批量测试数据"
            }
            
            response = await client.delete(
                f"{self.base_url}/recycle-bin/permanent-delete",
                json=permanent_delete_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 批量永久删除成功: {result['message']}")
            else:
                print(f"❌ 批量永久删除失败: {response.status_code} - {response.text}")
                return False
            
            return True
    
    async def test_recycle_bin_stats(self):
        """测试回收站统计功能"""
        print("\n🧪 测试回收站统计功能...")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/recycle-bin/stats",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                stats = response.json()
                print(f"✅ 回收站统计获取成功:")
                print(f"   总项目数: {stats['total_items']}")
                print(f"   各类型统计: {stats['by_type']}")
                print(f"   按日期统计: {stats['by_date']}")
                print(f"   按删除用户统计: {stats['by_user']}")
                return True
            else:
                print(f"❌ 获取回收站统计失败: {response.status_code} - {response.text}")
                return False
    
    async def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始回收站功能测试...\n")
        
        # 认证
        if not await self.authenticate():
            return False
        
        # 运行各项测试
        tests = [
            ("用户生命周期测试", self.test_user_lifecycle),
            ("用户状态管理测试", self.test_user_status_management),
            ("批量操作测试", self.test_batch_operations),
            ("回收站统计测试", self.test_recycle_bin_stats),
        ]
        
        success_count = 0
        total_count = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                if result:
                    success_count += 1
                    print(f"✅ {test_name} 通过")
                else:
                    print(f"❌ {test_name} 失败")
            except Exception as e:
                print(f"❌ {test_name} 出现异常: {str(e)}")
        
        print(f"\n📊 测试结果: {success_count}/{total_count} 通过")
        print(f"成功率: {success_count/total_count*100:.1f}%")
        
        if success_count == total_count:
            print("🎉 所有测试通过！回收站功能正常工作。")
        else:
            print("⚠️ 部分测试失败，请检查相关功能。")
        
        return success_count == total_count


async def main():
    """主函数"""
    tester = RecycleBinTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())