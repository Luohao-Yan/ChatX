#!/usr/bin/env python3
"""
测试登录API功能
验证记住我功能是否正常工作
"""

import requests
import json
import sys
from datetime import datetime

# API配置
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1/auth"

def test_login_basic():
    """测试基本登录功能"""
    print("🧪 测试基本登录功能...")
    
    # 使用超级管理员账户进行测试
    login_data = {
        "identifier": "superadmin",  # 使用用户名登录
        "password": "ChatX@Admin123!",
        "rememberMe": False,
        "device_info": "Test Script v1.0"
    }
    
    try:
        response = requests.post(f"{API_URL}/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 基本登录成功")
            print(f"   access_token: {data['access_token'][:50]}...")
            print(f"   refresh_token: {data.get('refresh_token', 'None')[:50] if data.get('refresh_token') else 'None'}...")
            print(f"   token_type: {data.get('token_type', 'None')}")
            return data['access_token']
        else:
            print(f"❌ 基本登录失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ 登录请求异常: {e}")
        return None

def test_login_remember_me():
    """测试记住我功能"""
    print("\n🧪 测试记住我功能...")
    
    login_data = {
        "identifier": "superadmin", 
        "password": "ChatX@Admin123!",
        "rememberMe": True,  # 启用记住我功能
        "device_info": "Test Script v1.0 (Remember Me)"
    }
    
    try:
        response = requests.post(f"{API_URL}/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 记住我登录成功")
            print(f"   access_token: {data['access_token'][:50]}...")
            print(f"   refresh_token: {data.get('refresh_token', 'None')[:50] if data.get('refresh_token') else 'None'}...")
            
            # 检查token过期时间（简单解析JWT payload）
            try:
                import base64
                payload_part = data['access_token'].split('.')[1]
                # 添加padding if needed
                payload_part += '=' * (4 - len(payload_part) % 4)
                payload = json.loads(base64.b64decode(payload_part))
                
                exp_timestamp = payload.get('exp')
                if exp_timestamp:
                    exp_date = datetime.fromtimestamp(exp_timestamp)
                    print(f"   token过期时间: {exp_date}")
                    
                    # 检查是否是30天过期
                    now = datetime.now()
                    duration = exp_date - now
                    print(f"   token有效时长: {duration.days}天 {duration.seconds//3600}小时")
                    
                    if duration.days >= 29:  # 允许一天误差
                        print("✅ 记住我功能：token过期时间正确（约30天）")
                    else:
                        print("⚠️ 记住我功能：token过期时间可能不正确")
                        
            except Exception as e:
                print(f"   ⚠️ 无法解析token过期时间: {e}")
                
            return data['access_token']
        else:
            print(f"❌ 记住我登录失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ 记住我登录请求异常: {e}")
        return None

def test_token_validation(access_token):
    """测试token验证"""
    if not access_token:
        print("\n⚠️ 跳过token验证测试（无有效token）")
        return
        
    print("\n🧪 测试token验证...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    try:
        response = requests.get(f"{API_URL}/me", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Token验证成功")
            print(f"   用户ID: {data.get('id')}")
            print(f"   用户名: {data.get('username')}")
            print(f"   邮箱: {data.get('email')}")
            print(f"   是否超级用户: {data.get('is_superuser', False)}")
        else:
            print(f"❌ Token验证失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
            
    except Exception as e:
        print(f"❌ Token验证请求异常: {e}")

def test_login_with_email():
    """测试邮箱登录"""
    print("\n🧪 测试邮箱登录功能...")
    
    login_data = {
        "identifier": "admin@chatx.com",  # 使用邮箱登录
        "password": "ChatX@Admin123!",
        "rememberMe": False,
        "device_info": "Test Script v1.0 (Email Login)"
    }
    
    try:
        response = requests.post(f"{API_URL}/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 邮箱登录成功")
            return True
        else:
            print(f"❌ 邮箱登录失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 邮箱登录请求异常: {e}")
        return False

def main():
    """主测试函数"""
    print("=" * 50)
    print("ChatX 登录功能测试")
    print("=" * 50)
    print(f"API地址: {API_URL}")
    print(f"测试时间: {datetime.now()}")
    print()
    
    # 测试基本登录
    basic_token = test_login_basic()
    
    # 测试记住我功能
    remember_token = test_login_remember_me()
    
    # 测试邮箱登录
    test_login_with_email()
    
    # 测试token验证
    test_token_validation(remember_token or basic_token)
    
    print("\n" + "=" * 50)
    print("测试完成")
    print("=" * 50)

if __name__ == "__main__":
    main()