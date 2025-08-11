#!/usr/bin/env python3
"""
简单的用户认证功能测试脚本
测试用户注册、登录、登出和密码找回功能
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1/users"

def print_result(test_name, success, message=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name} - {message}")

def test_user_registration():
    """测试用户注册"""
    test_data = {
        "email": f"test_user_{datetime.now().timestamp()}@example.com",
        "username": f"testuser_{int(datetime.now().timestamp())}",
        "full_name": "Test User",
        "password": "TestPassword123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=test_data, timeout=5)
        success = response.status_code == 200
        message = f"Status: {response.status_code}"
        if not success:
            message += f", Response: {response.text}"
        print_result("用户注册", success, message)
        return test_data if success else None
    except requests.exceptions.RequestException as e:
        print_result("用户注册", False, f"请求失败: {e}")
        return None

def test_user_login(user_data):
    """测试用户登录"""
    if not user_data:
        print_result("用户登录", False, "跳过 - 注册失败")
        return None
    
    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_data, timeout=5)
        success = response.status_code == 200
        message = f"Status: {response.status_code}"
        
        if success:
            result = response.json()
            access_token = result.get("access_token")
            message += f", Token: {'获得' if access_token else '未获得'}"
            print_result("用户登录", success, message)
            return {
                "access_token": access_token,
                "refresh_token": result.get("refresh_token")
            }
        else:
            message += f", Response: {response.text}"
            print_result("用户登录", success, message)
            return None
    except requests.exceptions.RequestException as e:
        print_result("用户登录", False, f"请求失败: {e}")
        return None

def test_user_logout(token_data):
    """测试用户登出"""
    if not token_data or not token_data.get("refresh_token"):
        print_result("用户登出", False, "跳过 - 登录失败或无refresh_token")
        return
    
    logout_data = {
        "refresh_token": token_data["refresh_token"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/logout", json=logout_data, timeout=5)
        success = response.status_code == 200
        message = f"Status: {response.status_code}"
        if not success:
            message += f", Response: {response.text}"
        print_result("用户登出", success, message)
    except requests.exceptions.RequestException as e:
        print_result("用户登出", False, f"请求失败: {e}")

def test_password_reset():
    """测试密码找回"""
    reset_data = {
        "email": "nonexistent@example.com"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/forgot-password", json=reset_data, timeout=5)
        # 密码重置应该返回200即使用户不存在（安全考虑）
        success = response.status_code == 200
        message = f"Status: {response.status_code}"
        if not success:
            message += f", Response: {response.text}"
        print_result("密码找回", success, message)
    except requests.exceptions.RequestException as e:
        print_result("密码找回", False, f"请求失败: {e}")

def main():
    """主测试函数"""
    print("=== ChatX 用户认证功能测试 ===")
    print("注意: 需要确保后端服务正在运行 (http://localhost:8000)")
    print()
    
    # 测试用户注册
    user_data = test_user_registration()
    
    # 测试用户登录
    token_data = test_user_login(user_data)
    
    # 测试用户登出
    test_user_logout(token_data)
    
    # 测试密码找回
    test_password_reset()
    
    print()
    print("=== 测试完成 ===")
    print("如果所有测试都通过，说明用户认证功能基本正常。")
    print("如果有失败的测试，请检查：")
    print("1. 后端服务是否正在运行")
    print("2. 数据库连接是否正常")
    print("3. API 路径是否正确")

if __name__ == "__main__":
    main()