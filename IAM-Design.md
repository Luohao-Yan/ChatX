# **ChatX IAM系统设计文档 V5.0**

| 版本 | 日期 | 作者 | 变更说明 |
| :---- | :---- | :---- | :---- |
| V5.0 | 2025-01-15 | Claude | 基于实际代码实现状态的完整IAM设计文档，涵盖多租户架构、用户类型区分、组织管理等核心功能 |

## **1. 文档概述**

### **1.1. 目的与范围**

本文档是ChatX企业级多租户身份与权限管理（IAM）系统的技术实现规范。本文档基于实际代码实现状态编写，是指导系统维护、功能扩展和架构优化的技术参考文档。

### **1.2. 系统定位**

ChatX是一个支持企业级（ToB）和消费级（ToC）混合业务模式的现代化企业协作平台，集成了智能文件管理、知识图谱可视化和全面的RBAC权限系统。

### **1.3. 架构设计原则**

- **Clean Architecture**: 采用4层架构模式（Presentation、Application、Domain、Infrastructure）
- **Domain-Driven Design**: 基于领域驱动设计进行业务建模
- **Multi-tenant Architecture**: 支持多租户数据隔离和权限管控
- **String-based Relations**: 避免外键约束，使用字符串引用和服务层验证

---

## **2. 核心架构设计**

### **2.1. 多租户架构**

#### **租户类型定义**
- **System Tenant**: 系统内置租户，仅系统超级管理员可见，用于平台管理
- **Public Tenant**: 公共租户，供个人用户（ToC）自由注册使用
- **Custom Tenant**: 企业租户，供企业用户（ToB）使用

#### **用户类型划分**
```python
class UserType(str, Enum):
    SYSTEM = "system"        # 系统用户
    INDIVIDUAL = "individual" # 个人用户（ToC）
    ENTERPRISE = "enterprise" # 企业用户（ToB）
```

#### **用户注册流程区分**
- **个人用户注册**：
  - 用户类型：INDIVIDUAL
  - 自动分配到：Public Tenant
  - 权限：基础文件管理和团队协作权限
  
- **企业用户创建**：
  - 用户类型：ENTERPRISE
  - 由管理员创建并分配到具体租户
  - 权限：基于角色的企业级权限
  - **新功能**：创建时自动关联到指定组织

### **2.2. 数据库设计约束**

#### **外键策略**
```python
# ❌ 严禁使用外键约束
user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

# ✅ 使用字符串引用
user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
```

#### **模型文档规范**
```python
class ExampleModel(Base):
    """模型说明"""
    __tablename__ = "sys_example"

    id = Column(String(50), primary_key=True, index=True, comment="唯一标识")
    name = Column(String(100), nullable=False, comment="名称")
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    __table_args__ = (
        Index('idx_example_tenant', 'tenant_id'),
        {"comment": "示例表，用于说明标准的模型创建规范"}
    )
```

---

## **3. 核心功能模块**

### **3.1. 用户管理系统**

#### **用户创建API流程**
```
POST /api/users (企业用户创建)
├── UserService.create_user_by_admin()
├── 创建User实体（UserType.ENTERPRISE）
├── 创建UserProfile资料
├── 自动关联组织（organization_id）
└── 分配默认角色
```

#### **已实现的用户管理功能**
- ✅ 用户注册（个人/企业区分）
- ✅ 用户列表查询（支持组织筛选）
- ✅ 批量用户操作
- ✅ 用户回收站管理
- ✅ 用户会话管理
- ✅ 邀请机制

#### **用户-组织关联**
```
POST /organizations/{org_id}/members
├── OrgService.add_user_to_organization()
├── 创建UserOrganization关联
└── 记录关联时间和角色
```

### **3.2. 组织架构管理**

#### **组织树结构**
```
GET /organizations/tree
├── 返回树状组织结构
├── 支持权限级联查看
└── 租户级数据隔离
```

#### **已实现的组织功能**
- ✅ 组织层级管理（创建/更新/删除）
- ✅ 组织成员管理
- ✅ 组织统计信息
- ✅ 组织回收站
- ✅ 组织移动功能

### **3.3. 权限控制系统**

#### **6层RBAC权限模型**
1. **System Admin** - 系统超级管理员
2. **Tenant Admin** - 租户管理员  
3. **Org Admin** - 组织管理员
4. **Manager** - 部门经理
5. **Member** - 普通成员
6. **Guest** - 访客

#### **权限检查流程**
```python
def can_user_access_resource(user: User, resource_id: str) -> bool:
    # 1. 租户级检查
    if user.current_tenant_id != resource.tenant_id:
        return False
    
    # 2. 组织级检查  
    if resource.organization_id and not user_in_organization(user, resource.organization_id):
        return False
        
    # 3. 角色权限检查
    return has_required_permission(user.roles, resource.required_permission)
```

### **3.4. 租户初始化系统**

#### **系统启动时自动初始化**
```python
# backend/app/domain/initialization/tenant_init.py
def init_system_tenants():
    # 创建System Tenant（系统租户）
    create_system_tenant()
    
    # 创建Public Tenant（公共租户）  
    create_public_tenant()
    
    # 创建默认超级管理员
    create_system_admin()
```

---

## **4. 前端架构设计**

### **4.1. 组件架构**

#### **用户管理界面**
```typescript
// UserForm组件支持的字段
interface UserFormData {
  username: string
  email: string  
  full_name: string
  password: string
  tenant_id?: string
  organization_id?: string  // 新增：组织关联
  team_id?: string
  roles?: string[]
  phone?: string
  is_active: boolean
  is_verified: boolean
}
```

#### **组织选择器**
- SearchableSelect组件支持租户/组织/团队三级选择
- 数据联动加载
- 权限级联过滤

### **4.2. 响应式设计**

#### **移动优先设计原则**
- 最小触摸目标：44px
- 断点系统：320px(mobile) / 768px(tablet) / 1024px(desktop)
- 自适应布局组件

---

## **5. API接口设计**

### **5.1. 用户管理API**

```typescript
// 企业用户创建（已支持组织自动关联）
POST /api/users
Body: {
  username: string
  email: string
  password: string
  organization_id?: string  // 自动关联组织
  tenant_id?: string
  roles?: string[]
}

// 用户列表查询（支持组织筛选）
GET /api/users?organization_id=xxx&skip=0&limit=100

// 用户-组织关联
POST /organizations/{org_id}/members
Body: {
  user_id: string
  role: string
}
```

### **5.2. 组织管理API**

```typescript
// 组织树查询
GET /organizations/tree?root_id=xxx

// 组织创建
POST /organizations
Body: {
  name: string
  parent_id?: string
  description?: string
}

// 组织成员管理
GET /organizations/{org_id}/members
DELETE /organizations/{org_id}/members/{user_id}
```

---

## **6. 安全设计**

### **6.1. 数据隔离策略**

#### **租户级隔离**
- 所有业务查询强制包含tenant_id过滤
- System租户对非超管用户完全不可见
- 跨租户访问严格禁止

#### **组织级权限控制**
- 递归组织权限检查
- 上级组织管理员可管理下级组织
- 平级组织完全隔离

### **6.2. 身份认证**

#### **JWT Token策略**
- Access Token：15分钟过期
- Refresh Token：30天过期  
- 支持多设备会话管理
- 会话撤销机制

#### **密码安全策略**
- Argon2哈希算法
- 密码强度校验
- 密码历史记录防重用

---

## **7. 系统初始化**

### **7.1. 首次启动流程**

```bash
# 1. 数据库迁移
alembic upgrade head

# 2. 系统初始化
python init_system.py init
├── 创建System/Public租户
├── 创建系统超级管理员
├── 初始化默认角色权限
└── 创建基础组织架构
```

### **7.2. 默认配置**

#### **系统租户配置**
- 租户ID：`system`
- 租户类型：`system`
- 可见性：仅超级管理员可见

#### **公共租户配置**  
- 租户ID：`public`
- 租户类型：`public`
- 用途：个人用户注册默认归属

---

## **8. 开发规范**

### **8.1. 代码规范**

#### **后端开发规范**
- 严禁在模型中使用ForeignKey约束
- 所有数据库字段必须包含中文comment
- 使用Clean Architecture分层
- 异步处理耗时操作

#### **前端开发规范**
- 移动优先响应式设计
- TypeScript强类型约束
- 组件化开发模式
- 权限指令v-can控制显示

### **8.2. 安全开发规范**

#### **必须遵守的安全原则**
- 所有API接口必须进行权限验证
- 租户数据严格隔离
- 输入参数严格验证
- 敏感操作记录审计日志

---

## **9. 部署与运维**

### **9.1. Docker服务依赖**

```yaml
# docker-compose.yml核心服务
services:
  - PostgreSQL (数据库)
  - Redis (缓存/任务队列)
  - MinIO (对象存储)
  - Weaviate (向量数据库)
  - Neo4j (知识图谱)
```

### **9.2. 监控指标**

#### **系统健康指标**
- API响应时间监控
- 数据库连接池监控
- 租户数据隔离完整性检查
- 权限验证失败率统计

---

## **10. 技术栈总结**

### **10.1. 后端技术栈**
- **Framework**: FastAPI 0.115.0
- **Database**: SQLAlchemy 2.0.36 + PostgreSQL
- **Authentication**: JWT + Argon2
- **Task Queue**: Celery + Redis
- **Architecture**: Clean Architecture + DDD

### **10.2. 前端技术栈**  
- **Framework**: React 19 + TypeScript
- **Router**: TanStack Router v1.129
- **UI Library**: shadcn/ui (Tailwind + RadixUI)
- **State Management**: Zustand v5
- **Data Fetching**: TanStack Query v5

---

## **11. 未来规划**

### **11.1. 计划中的功能增强**
- [ ] 细粒度权限策略引擎
- [ ] 审计日志系统完善
- [ ] OAuth 2.0第三方集成
- [ ] API访问频率限制
- [ ] 多因子认证(MFA)支持

### **11.2. 性能优化方向**
- [ ] 权限查询缓存优化
- [ ] 组织树查询性能提升  
- [ ] 批量操作异步化
- [ ] 数据库查询索引优化

---

**文档维护**：本文档随系统功能更新实时维护，确保与实际代码实现状态保持一致。