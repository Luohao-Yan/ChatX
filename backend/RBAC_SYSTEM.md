# ChatX RBAC 权限管理系统

本文档描述了 ChatX 系统的基于角色的访问控制（RBAC）实现，包括角色管理、权限管理和访问控制功能。

## 系统架构

### 核心概念

- **用户（User）**: 系统中的个体用户
- **角色（Role）**: 权限的集合，可分配给用户
- **权限（Permission）**: 对特定资源执行特定操作的授权
- **资源（Resource）**: 系统中被保护的对象（用户、文件、组织等）
- **操作（Action）**: 对资源可执行的动作（创建、读取、更新、删除等）

### 数据模型关系

```
User ←→ UserRole ←→ Role ←→ RolePermission ←→ Permission
User ←→ UserPermission ←→ Permission (直接权限)
```

## 数据模型

### 1. 角色模型 (Role)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Integer | 主键 |
| tenant_id | Integer | 租户ID（多租户支持） |
| name | String(100) | 角色名（英文标识） |
| display_name | String(255) | 显示名称 |
| description | String(500) | 描述 |
| role_type | String(20) | 角色类型：system/tenant/custom |
| level | Integer | 角色级别（数字越大权限越高） |
| is_active | Boolean | 是否激活 |
| is_system | Boolean | 是否系统预定义角色 |
| is_default | Boolean | 是否新用户默认角色 |
| parent_id | Integer | 父角色ID |
| max_users | Integer | 最大用户数限制 |

### 2. 权限模型 (Permission)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Integer | 主键 |
| name | String(100) | 权限名（格式：resource:action） |
| display_name | String(255) | 显示名称 |
| description | String(500) | 描述 |
| resource_type | String(50) | 资源类型 |
| action | String(50) | 操作类型 |
| category | String(100) | 权限分类 |
| group_name | String(100) | 权限组 |
| parent_id | Integer | 父权限ID |
| is_system | Boolean | 是否系统权限 |
| is_active | Boolean | 是否激活 |
| require_owner | Boolean | 是否需要资源所有者权限 |
| conditions | JSON | 额外条件规则 |

### 3. 用户直接权限 (UserPermission)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Integer | 主键 |
| user_id | Integer | 用户ID |
| permission_id | Integer | 权限ID |
| granted | Boolean | 是否授予（True=授予，False=拒绝） |
| resource_id | String(100) | 特定资源ID |
| conditions | JSON | 额外条件 |
| granted_by | Integer | 授权人ID |
| reason | String(500) | 授权理由 |
| expires_at | DateTime | 过期时间 |
| is_active | Boolean | 是否激活 |

## 预定义角色

系统预定义了以下角色：

| 角色 | 级别 | 描述 | 主要权限 |
|------|------|------|----------|
| super_admin | 100 | 超级管理员 | 所有系统权限 |
| tenant_admin | 80 | 租户管理员 | 租户内所有资源管理 |
| org_admin | 60 | 组织管理员 | 组织内用户和资源管理 |
| dept_manager | 40 | 部门经理 | 部门用户管理 |
| user | 20 | 普通用户 | 基本文件操作权限 |
| guest | 10 | 访客 | 只读权限 |

## 权限定义

### 用户管理权限
- `user:create` - 创建用户
- `user:read` - 查看用户
- `user:update` - 更新用户
- `user:delete` - 删除用户
- `user:manage` - 管理用户

### 角色管理权限
- `role:create` - 创建角色
- `role:read` - 查看角色
- `role:update` - 更新角色
- `role:delete` - 删除角色
- `role:assign` - 分配角色

### 权限管理权限
- `permission:create` - 创建权限
- `permission:read` - 查看权限
- `permission:update` - 更新权限
- `permission:delete` - 删除权限
- `permission:assign` - 分配权限

### 文件管理权限
- `file:create` - 创建文件
- `file:read` - 查看文件
- `file:update` - 更新文件
- `file:delete` - 删除文件
- `file:share` - 分享文件
- `file:upload` - 上传文件
- `file:download` - 下载文件

### 组织管理权限
- `org:create` - 创建组织
- `org:read` - 查看组织
- `org:update` - 更新组织
- `org:delete` - 删除组织
- `org:manage` - 管理组织

### 系统管理权限
- `system:config` - 系统配置
- `system:monitor` - 系统监控
- `system:backup` - 系统备份

## API 端点

### 角色管理 API

#### 1. 创建角色
**POST** `/api/v1/roles/`

需要权限：`role:create`

请求体：
```json
{
    "name": "custom_role",
    "display_name": "自定义角色",
    "description": "角色描述",
    "role_type": "custom",
    "level": 30
}
```

#### 2. 获取角色列表
**GET** `/api/v1/roles/`

需要权限：`role:read`

#### 3. 获取指定角色
**GET** `/api/v1/roles/{role_id}`

需要权限：`role:read`

#### 4. 更新角色
**PUT** `/api/v1/roles/{role_id}`

需要权限：`role:update`

#### 5. 删除角色
**DELETE** `/api/v1/roles/{role_id}`

需要权限：`role:delete`

#### 6. 为角色分配权限
**POST** `/api/v1/roles/{role_id}/permissions`

需要权限：`role:update`

请求体：
```json
{
    "permission_ids": [1, 2, 3]
}
```

#### 7. 获取角色权限
**GET** `/api/v1/roles/{role_id}/permissions`

需要权限：`role:read`

#### 8. 为用户分配角色
**POST** `/api/v1/roles/{role_id}/users`

需要权限：`role:assign`

请求体：
```json
{
    "user_ids": [1, 2, 3],
    "expires_at": "2024-12-31T23:59:59Z"
}
```

### 权限管理 API

#### 1. 创建权限
**POST** `/api/v1/permissions/`

需要权限：`permission:create`

#### 2. 获取权限列表
**GET** `/api/v1/permissions/`

需要权限：`permission:read`

#### 3. 获取权限分类
**GET** `/api/v1/permissions/categories/`

需要权限：`permission:read`

#### 4. 为用户直接分配权限
**POST** `/api/v1/permissions/users/{user_id}/assign`

需要权限：`permission:assign`

#### 5. 撤销用户权限
**DELETE** `/api/v1/permissions/users/{user_id}/permissions/{permission_id}`

需要权限：`permission:assign`

#### 6. 获取用户权限
**GET** `/api/v1/permissions/users/{user_id}/permissions`

需要权限：`permission:read`

#### 7. 检查用户权限
**GET** `/api/v1/permissions/users/{user_id}/check`

需要权限：`permission:read`

参数：
- `permission_name`: 权限名
- `resource_id`: 资源ID（可选）

## 权限检查机制

### 1. 权限检查流程

```python
def has_permission(user, permission_name, resource_id=None):
    # 1. 检查超级用户
    if user.is_superuser:
        return True
    
    # 2. 检查用户直接权限
    if check_direct_permission(user, permission_name, resource_id):
        return True
    
    # 3. 检查角色权限
    if check_role_permissions(user, permission_name):
        return True
    
    return False
```

### 2. 权限装饰器使用

```python
from app.core.permissions import require_permission, Permissions

@router.post("/users/")
@require_permission(Permissions.USER_CREATE)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 创建用户逻辑
    pass
```

### 3. 权限依赖函数使用

```python
from app.core.permissions import check_permission

@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    current_user: User = Depends(check_permission("user:read"))
):
    # 获取用户逻辑
    pass
```

## 初始化和配置

### 1. RBAC 系统初始化

```python
from app.core.rbac_init import initialize_rbac_system
from app.core.database import SessionLocal

db = SessionLocal()
success = initialize_rbac_system(db)
db.close()
```

### 2. 为现有用户分配默认角色

初始化脚本会自动为没有角色的用户分配默认的 "user" 角色。

### 3. 创建管理员用户

```python
# 创建超级管理员用户
admin_user = User(
    email="admin@example.com",
    username="admin",
    hashed_password=get_password_hash("secure_password"),
    is_superuser=True,
    tenant_id=1
)
```

## 测试

### 运行 RBAC 测试

```bash
python test_rbac.py
```

测试包括：
- 管理员登录
- 角色和权限列表获取
- 角色创建和权限分配
- 权限检查
- RBAC 初始化状态检查

## 最佳实践

### 1. 权限设计原则

- **最小权限原则**：用户只获得完成工作所需的最小权限
- **职责分离**：不同的职责应该分配给不同的角色
- **权限继承**：通过角色层次结构实现权限继承
- **资源级权限**：对特定资源的细粒度权限控制

### 2. 角色设计建议

- **功能性角色**：基于用户的工作职能设计角色
- **层级结构**：建立清晰的角色层级关系
- **定期审查**：定期审查和更新角色权限
- **文档化**：详细记录每个角色的职责和权限

### 3. 安全考虑

- **权限审计**：记录所有权限变更操作
- **临时权限**：为临时权限设置过期时间
- **权限验证**：在每个关键操作前验证权限
- **错误处理**：权限不足时返回适当的错误信息

## 扩展功能

### 1. 条件权限

支持基于条件的权限控制，例如：
- 时间限制
- IP 地址限制
- 资源属性限制

### 2. 动态权限

支持在运行时动态计算的权限，例如：
- 基于资源所有者的权限
- 基于用户关系的权限
- 基于业务规则的权限

### 3. 权限代理

支持用户将权限临时委托给其他用户。

### 4. 审计日志

完整记录所有权限相关操作的审计日志。

## 故障排除

### 常见问题

1. **权限检查失败**
   - 检查用户是否有正确的角色
   - 验证角色是否有所需权限
   - 确认权限名称正确

2. **角色分配失败**
   - 检查用户是否存在
   - 验证角色是否激活
   - 确认操作者有分配权限

3. **初始化失败**
   - 检查数据库连接
   - 验证表结构是否正确
   - 确认默认租户存在

### 调试技巧

- 启用权限检查日志
- 使用权限检查 API 验证用户权限
- 检查角色和权限的关联关系
- 验证用户的角色分配