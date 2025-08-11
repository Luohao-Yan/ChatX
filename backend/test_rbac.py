#!/usr/bin/env python3
"""
RBAC权限系统测试脚本
测试角色权限管理功能
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

class RBACTester:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.session = requests.Session()
    
    def print_result(self, test_name, success, message=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name} - {message}")
    
    def login_as_admin(self):
        """以管理员身份登录"""
        login_data = {
            "email": "admin@example.com",
            "password": "admin123456"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/users/login", json=login_data, timeout=5)
            if response.status_code == 200:
                result = response.json()
                self.access_token = result.get("access_token")
                self.refresh_token = result.get("refresh_token")
                
                # 设置认证头
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                
                self.print_result("管理员登录", True, "获取访问令牌成功")
                return True
            else:
                self.print_result("管理员登录", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_result("管理员登录", False, f"请求失败: {e}")
            return False
    
    def test_list_roles(self):
        """测试获取角色列表"""
        try:
            response = self.session.get(f"{BASE_URL}/roles/", timeout=5)
            success = response.status_code == 200
            
            if success:
                roles = response.json()
                message = f"获取到 {len(roles)} 个角色"
            else:
                message = f"Status: {response.status_code}, Response: {response.text}"
            
            self.print_result("获取角色列表", success, message)
            return roles if success else None
            
        except requests.exceptions.RequestException as e:
            self.print_result("获取角色列表", False, f"请求失败: {e}")
            return None
    
    def test_list_permissions(self):
        """测试获取权限列表"""
        try:
            response = self.session.get(f"{BASE_URL}/permissions/", timeout=5)
            success = response.status_code == 200
            
            if success:
                permissions = response.json()
                message = f"获取到 {len(permissions)} 个权限"
            else:
                message = f"Status: {response.status_code}, Response: {response.text}"
            
            self.print_result("获取权限列表", success, message)
            return permissions if success else None
            
        except requests.exceptions.RequestException as e:
            self.print_result("获取权限列表", False, f"请求失败: {e}")
            return None
    
    def test_create_role(self):
        """测试创建角色"""
        role_data = {
            "name": f"test_role_{int(datetime.now().timestamp())}",
            "display_name": "测试角色",
            "description": "这是一个测试角色",
            "role_type": "custom",
            "level": 30
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/roles/", json=role_data, timeout=5)
            success = response.status_code == 200
            
            if success:
                role = response.json()
                message = f"创建角色成功: {role.get('display_name')}"
                return role
            else:
                message = f"Status: {response.status_code}, Response: {response.text}"
            
            self.print_result("创建角色", success, message)
            return role if success else None
            
        except requests.exceptions.RequestException as e:
            self.print_result("创建角色", False, f"请求失败: {e}")
            return None
    
    def test_assign_permissions_to_role(self, role_id, permission_ids):
        """测试为角色分配权限"""
        if not role_id or not permission_ids:
            self.print_result("为角色分配权限", False, "跳过 - 缺少角色或权限ID")
            return False
        
        assignment_data = {
            "permission_ids": permission_ids[:3]  # 只分配前3个权限
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/roles/{role_id}/permissions", 
                json=assignment_data, 
                timeout=5
            )
            success = response.status_code == 200
            
            if success:
                result = response.json()
                message = result.get("message", "权限分配成功")
            else:
                message = f"Status: {response.status_code}, Response: {response.text}"
            
            self.print_result("为角色分配权限", success, message)
            return success
            
        except requests.exceptions.RequestException as e:
            self.print_result("为角色分配权限", False, f"请求失败: {e}")
            return False
    
    def test_get_role_permissions(self, role_id):
        """测试获取角色权限"""
        if not role_id:
            self.print_result("获取角色权限", False, "跳过 - 缺少角色ID")
            return None
        
        try:
            response = self.session.get(f"{BASE_URL}/roles/{role_id}/permissions", timeout=5)
            success = response.status_code == 200
            
            if success:
                permissions = response.json()
                message = f"角色拥有 {len(permissions)} 个权限"
            else:
                message = f"Status: {response.status_code}, Response: {response.text}"
            
            self.print_result("获取角色权限", success, message)
            return permissions if success else None
            
        except requests.exceptions.RequestException as e:
            self.print_result("获取角色权限", False, f"请求失败: {e}")
            return None
    
    def test_permission_categories(self):
        """测试获取权限分类"""
        try:
            response = self.session.get(f"{BASE_URL}/permissions/categories/", timeout=5)
            success = response.status_code == 200
            
            if success:
                categories = response.json()
                message = f"获取到 {len(categories)} 个权限分类"
                if categories:
                    category_names = [cat.get('name') for cat in categories]
                    message += f": {', '.join(category_names)}"
            else:
                message = f"Status: {response.status_code}, Response: {response.text}"
            
            self.print_result("获取权限分类", success, message)
            return categories if success else None
            
        except requests.exceptions.RequestException as e:
            self.print_result("获取权限分类", False, f"请求失败: {e}")
            return None
    
    def test_rbac_initialization(self):
        """测试RBAC系统是否正确初始化"""
        print("\n=== 测试RBAC系统初始化状态 ===")
        
        # 检查默认角色是否存在
        roles = self.test_list_roles()
        if roles:
            role_names = [role.get('name') for role in roles]
            default_roles = ['super_admin', 'tenant_admin', 'org_admin', 'user', 'guest']
            
            existing_default_roles = [role for role in default_roles if role in role_names]
            
            if len(existing_default_roles) >= 3:  # 至少有3个默认角色
                self.print_result("默认角色检查", True, 
                    f"发现默认角色: {', '.join(existing_default_roles)}")
            else:
                self.print_result("默认角色检查", False, 
                    f"默认角色不完整，只找到: {', '.join(existing_default_roles)}")
        
        # 检查权限分类
        categories = self.test_permission_categories()
        if categories and len(categories) >= 4:  # 至少有4个分类
            self.print_result("权限分类检查", True, f"权限分类完整")
        else:
            self.print_result("权限分类检查", False, "权限分类不完整")
    
    def run_all_tests(self):
        """运行所有RBAC测试"""
        print("=== ChatX RBAC权限系统测试 ===")
        print("注意: 需要确保后端服务正在运行且RBAC系统已初始化")
        print()
        
        # 1. 管理员登录
        if not self.login_as_admin():
            print("管理员登录失败，请检查是否有默认管理员用户")
            return
        
        # 2. 测试RBAC初始化状态
        self.test_rbac_initialization()
        
        # 3. 获取权限列表
        permissions = self.test_list_permissions()
        
        # 4. 创建测试角色
        test_role = self.test_create_role()
        
        # 5. 为角色分配权限
        if test_role and permissions:
            permission_ids = [perm.get('id') for perm in permissions[:5]]  # 前5个权限
            self.test_assign_permissions_to_role(test_role.get('id'), permission_ids)
            
            # 6. 获取角色权限
            self.test_get_role_permissions(test_role.get('id'))
        
        print()
        print("=== RBAC测试完成 ===")
        print("如果所有测试都通过，说明RBAC权限系统基本正常。")
        print("如果有失败的测试，请检查：")
        print("1. 后端服务是否正在运行")
        print("2. 数据库是否正确迁移")
        print("3. RBAC初始化脚本是否执行")
        print("4. 是否有适当权限的管理员用户")


def main():
    tester = RBACTester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()