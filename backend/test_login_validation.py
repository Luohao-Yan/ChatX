#!/usr/bin/env python3
"""
测试登录API的数据验证
模拟前端发送的exact数据格式
"""

import requests
import json

# API配置
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1/auth"

def test_login_validation():
    """测试各种登录数据格式的验证"""
    
    test_cases = [
        {
            "name": "完整的正确格式",
            "data": {
                "identifier": "superadmin",
                "password": "ChatX@Admin123!",
                "rememberMe": True,
                "device_info": "Test Browser"
            }
        },
        {
            "name": "缺少device_info",
            "data": {
                "identifier": "superadmin", 
                "password": "ChatX@Admin123!",
                "rememberMe": True
            }
        },
        {
            "name": "使用email字段（向后兼容）",
            "data": {
                "email": "admin@chatx.com",
                "password": "ChatX@Admin123!",
                "rememberMe": False
            }
        },
        {
            "name": "使用username字段（向后兼容）",
            "data": {
                "username": "superadmin",
                "password": "ChatX@Admin123!",
                "rememberMe": False
            }
        },
        {
            "name": "错误：缺少密码",
            "data": {
                "identifier": "superadmin",
                "rememberMe": True
            }
        },
        {
            "name": "错误：缺少所有标识符",
            "data": {
                "password": "ChatX@Admin123!",
                "rememberMe": True
            }
        },
        {
            "name": "前端实际发送格式（驼峰命名）",
            "data": {
                "identifier": "superadmin",
                "password": "ChatX@Admin123!", 
                "rememberMe": True,
                "deviceInfo": "Test Browser"  # 错误的字段名
            }
        }
    ]
    
    print(f"🧪 测试登录API数据验证")
    print(f"API地址: {API_URL}/login")
    print("=" * 60)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['name']}")
        print(f"   数据: {json.dumps(test_case['data'], indent=2)}")
        
        try:
            response = requests.post(f"{API_URL}/login", json=test_case['data'])
            
            if response.status_code == 200:
                print(f"   ✅ 成功 (200)")
            elif response.status_code == 422:
                print(f"   ❌ 验证失败 (422)")
                try:
                    error_detail = response.json()
                    if 'detail' in error_detail:
                        print(f"   错误详情: {error_detail['detail']}")
                except:
                    print(f"   原始错误: {response.text}")
            elif response.status_code == 400:
                print(f"   ❌ 业务逻辑错误 (400)")
                try:
                    error_detail = response.json()
                    print(f"   错误信息: {error_detail.get('detail', response.text)}")
                except:
                    print(f"   原始错误: {response.text}")
            else:
                print(f"   ⚠️ 其他状态码: {response.status_code}")
                print(f"   响应: {response.text}")
                
        except Exception as e:
            print(f"   💥 请求异常: {e}")

if __name__ == "__main__":
    test_login_validation()