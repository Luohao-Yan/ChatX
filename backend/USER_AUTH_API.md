# 用户认证 API 文档

本文档描述了ChatX系统的用户认证功能实现，包括用户注册、登录、登出和密码找回等核心功能。

## 已实现的API端点

### 1. 用户注册 
**POST** `/api/v1/users/register`

注册新用户账号，会发送邮箱验证码。

**请求体：**
```json
{
    "email": "user@example.com",
    "username": "testuser",
    "full_name": "Test User", 
    "password": "SecurePassword123!"
}
```

**响应：**
```json
{
    "id": 1,
    "email": "user@example.com",
    "username": "testuser",
    "full_name": "Test User",
    "is_active": true,
    "is_verified": false,
    "created_at": "2025-01-01T00:00:00Z"
}
```

### 2. 用户登录
**POST** `/api/v1/users/login`

用户登录，获取访问令牌和刷新令牌。

**请求体：**
```json
{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "device_info": "Chrome Browser"
}
```

**响应：**
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "bearer",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 3. 刷新令牌
**POST** `/api/v1/users/refresh`

使用刷新令牌获取新的访问令牌。

**请求体：**
```json
{
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**响应：**
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "bearer"
}
```

### 4. 用户登出
**POST** `/api/v1/users/logout`

退出当前会话。

**请求体：**
```json
{
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**响应：**
```json
{
    "message": "退出登录成功"
}
```

### 5. 退出所有设备
**POST** `/api/v1/users/logout-all`

退出该用户的所有活跃会话。需要认证。

**请求头：**
```
Authorization: Bearer {access_token}
```

**响应：**
```json
{
    "message": "已退出所有设备"
}
```

### 6. 邮箱验证
**POST** `/api/v1/users/verify-email`

验证用户邮箱地址。

**请求体：**
```json
{
    "email": "user@example.com",
    "verification_code": "123456"
}
```

**响应：**
```json
{
    "message": "邮箱验证成功"
}
```

### 7. 忘记密码
**POST** `/api/v1/users/forgot-password`

发送密码重置验证码到用户邮箱。

**请求体：**
```json
{
    "email": "user@example.com"
}
```

**响应：**
```json
{
    "message": "如果该邮箱存在，我们已发送重置密码链接"
}
```

### 8. 重置密码
**POST** `/api/v1/users/reset-password`

使用验证码重置用户密码。

**请求体：**
```json
{
    "email": "user@example.com",
    "verification_code": "123456",
    "new_password": "NewSecurePassword123!"
}
```

**响应：**
```json
{
    "message": "密码重置成功"
}
```

### 9. 获取用户会话列表
**GET** `/api/v1/users/sessions`

获取当前用户的所有活跃会话。需要认证。

**请求头：**
```
Authorization: Bearer {access_token}
```

**响应：**
```json
[
    {
        "id": 1,
        "device_info": "Chrome Browser",
        "ip_address": "192.168.1.1",
        "created_at": "2025-01-01T00:00:00Z",
        "last_used": "2025-01-01T01:00:00Z",
        "is_current": true
    }
]
```

### 10. 注销指定会话
**DELETE** `/api/v1/users/sessions/{session_id}`

注销指定的用户会话。需要认证。

**请求头：**
```
Authorization: Bearer {access_token}
```

**响应：**
```json
{
    "message": "会话已注销"
}
```

## 安全特性

1. **密码强度验证**：要求密码至少8位，包含大写字母、小写字母、数字、特殊字符中至少3种
2. **JWT令牌**：使用JWT实现无状态认证，支持访问令牌和刷新令牌
3. **会话管理**：跟踪用户的登录会话，支持单设备或多设备登出
4. **验证码系统**：邮箱验证和密码重置使用验证码，有效期1小时
5. **安全响应**：密码重置等敏感操作不会泄露用户是否存在的信息
6. **多租户支持**：支持多租户架构的用户隔离

## 错误响应

所有API在出错时都会返回标准的HTTP错误码和错误信息：

```json
{
    "detail": "错误详细信息"
}
```

常见错误码：
- `400` - 请求参数错误
- `401` - 认证失败
- `403` - 权限不足
- `404` - 资源不存在
- `422` - 数据验证失败

## 测试

使用提供的测试脚本 `test_auth.py` 可以快速验证所有认证功能：

```bash
python test_auth.py
```

注意：测试前需要确保后端服务正在运行在 http://localhost:8000

## 数据库模型

系统使用以下主要数据模型：

- **User**: 用户基本信息
- **UserSession**: 用户会话管理
- **UserVerification**: 验证码管理
- **Tenant**: 多租户支持

详细的数据模型定义请参考 `app/models/user_models.py`。