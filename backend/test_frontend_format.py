#!/usr/bin/env python3
"""
测试模拟前端发送的exact格式
"""

import requests
import json

# API配置
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1/auth"

def test_frontend_exact_format():
    """测试前端可能发送的确切格式"""
    
    # 模拟前端实际发送的数据
    login_data = {
        "identifier": "superadmin",
        "password": "ChatX@Admin123!",
        "rememberMe": True,
        "device_info": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Test Browser"
    }
    
    print("🧪 测试前端确切格式")
    print(f"发送数据: {json.dumps(login_data, indent=2)}")
    
    try:
        response = requests.post(f"{API_URL}/login", json=login_data)
        
        print(f"\n状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 登录成功！")
            print(f"access_token: {data['access_token'][:50]}...")
            
            # 检查token过期时间
            try:
                import base64
                payload_part = data['access_token'].split('.')[1]
                payload_part += '=' * (4 - len(payload_part) % 4)
                payload = json.loads(base64.b64decode(payload_part))
                
                from datetime import datetime
                exp_timestamp = payload.get('exp')
                if exp_timestamp:
                    exp_date = datetime.fromtimestamp(exp_timestamp)
                    now = datetime.now()
                    duration = exp_date - now
                    print(f"token过期时间: {exp_date}")
                    print(f"有效时长: {duration.days}天 {duration.seconds//3600}小时")
                    
                    if duration.days >= 29:
                        print("✅ rememberMe生效：30天token")
                    else:
                        print("⚠️ rememberMe可能未生效")
                        
            except Exception as e:
                print(f"解析token失败: {e}")
                
        elif response.status_code == 422:
            print("❌ 验证错误 (422)")
            error_data = response.json()
            print(f"错误详情: {json.dumps(error_data, indent=2)}")
        else:
            print(f"❌ 其他错误: {response.status_code}")
            print(f"响应: {response.text}")
            
    except Exception as e:
        print(f"💥 请求异常: {e}")

if __name__ == "__main__":
    test_frontend_exact_format()