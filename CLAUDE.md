# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChatX is a modern, enterprise-grade chat application with intelligent file management, knowledge graph visualization, and comprehensive RBAC system. The project follows Clean Architecture and Domain-Driven Design (DDD) principles with a multi-tenant architecture.

## Technology Stack

### Backend (Python FastAPI)
- **Framework**: FastAPI 0.115.0 with Uvicorn ASGI server
- **Language**: Python 3.11+
- **Architecture**: Clean Architecture with 4-layer structure
- **Database**: SQLAlchemy 2.0.36 with Alembic migrations
- **Infrastructure**: PostgreSQL, Redis, Neo4j, Weaviate, MinIO
- **Authentication**: JWT with Argon2 password hashing
- **Async Tasks**: Celery with Redis broker

### Frontend (React TypeScript)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **UI**: shadcn/ui (Tailwind CSS + RadixUI)
- **Routing**: TanStack Router v1.129 (type-safe)
- **State**: Zustand v5
- **Data Fetching**: TanStack Query v5
- **Forms**: React Hook Form with Zod validation

## Architecture

### Backend Architecture Design (Clean Architecture)

#### 4-Layer Architecture Pattern
```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  api/endpoints/v1/  →  HTTP Controllers & Route Handlers   │
│  schemas/           →  Request/Response Validation         │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  application/services/  →  Use Cases & Business Workflows  │
│  application/factory.py →  Dependency Injection            │
│  middleware/           →  Cross-cutting Concerns           │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│  domain/entities/      →  Business Entities                │
│  domain/services/      →  Domain Services                  │
│  domain/repositories/  →  Repository Interfaces            │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                        │
│  infrastructure/persistence/   →  Database Implementation  │
│  infrastructure/repositories/  →  Repository Concrete      │
│  infrastructure/clients/       →  External Service Clients │
│  models/                       →  SQLAlchemy Models        │
└─────────────────────────────────────────────────────────────┘
```

#### Key Design Principles
- **Dependency Inversion**: Inner layers don't depend on outer layers
- **Single Responsibility**: Each layer has a distinct purpose
- **Service Layer Pattern**: Business logic orchestration
- **Repository Pattern**: Data access abstraction
- **Multi-tenant Support**: All services are tenant-aware

### Frontend Architecture Design (Feature-Based)

#### Component Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     App Shell                               │
│  Layout Components  →  Header, Sidebar, Footer             │
│  Route Guards       →  Authentication & Authorization      │
│  Global Providers   →  Theme, i18n, Query Client          │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                  Feature Modules                            │
│  features/auth/        →  Authentication Feature           │
│  features/chat/        →  Chat & Messaging Feature         │
│  features/files/       →  File Management Feature          │
│  features/knowledge/   →  Knowledge Graph Feature          │
│  features/admin/       →  Administration Feature           │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                 Shared Infrastructure                       │
│  components/ui/        →  Base UI Components (shadcn/ui)   │
│  services/            →  API Service Layer                 │
│  stores/              →  Global State Management           │
│  hooks/               →  Reusable React Hooks             │
│  utils/               →  Helper Functions                  │
└─────────────────────────────────────────────────────────────┘
```

#### Responsive Design Requirements
- **Mobile-First Approach**: Design starts from mobile (320px) and scales up
- **Breakpoint System**: 
  - Mobile: 320px - 768px
  - Tablet: 768px - 1024px  
  - Desktop: 1024px+
- **Touch-Friendly**: Minimum 44px touch targets for mobile interactions
- **Adaptive Layouts**: Components must work on all screen sizes
- **Progressive Enhancement**: Core functionality works without JavaScript

## Development Commands

### Backend Development
```bash
# Local development with Conda
cd backend
./dev-start.sh

# Docker development
./start.sh

# System initialization (first run)
python init_system.py init

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"

# Run tests
pytest tests/
```

### Frontend Development
```bash
cd frontend
pnpm install
pnpm run dev        # Development server
pnpm run build      # Production build
pnpm run preview    # Preview build
```

### Docker Services
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Restart specific service
docker-compose restart app
```

## Database Design Constraints & Best Practices

### ⚠️ Critical Database Constraints

#### Foreign Key Policy
**AVOID FOREIGN KEYS AT ALL COSTS**
- ❌ **Never use**: `ForeignKey()` constraints in SQLAlchemy models
- ✅ **Use instead**: String-based references with service-layer validation
- **Reason**: Foreign keys create migration complexity and deployment barriers

```python
# ❌ DON'T DO THIS
user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

# ✅ DO THIS INSTEAD
user_id = Column(String(50), nullable=False, index=True, comment="用户ID")
```

#### Model Documentation Requirements
**MANDATORY FOR ALL DATABASE MODELS**
- ✅ **Required**: All fields must have `comment` parameter with Chinese description
- ✅ **Required**: All models must have `__table_args__` with table comment
- ✅ **Required**: Use descriptive Chinese comments for better maintainability

```python
# ✅ STANDARD MODEL PATTERN
class ExampleModel(Base):
    """模型说明"""
    __tablename__ = "sys_example"

    id = Column(String(50), primary_key=True, index=True, comment="唯一标识")
    name = Column(String(100), nullable=False, comment="名称")
    tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    # 必须包含表备注
    __table_args__ = (
        Index('idx_example_tenant', 'tenant_id'),
        {"comment": "示例表，用于说明标准的模型创建规范"}
    )
```

#### ID Strategy Requirements
- **Primary Keys**: Always use `String(50)` for maximum flexibility
- **Consistency**: All models must use the same ID format
- **Multi-tenant**: Include `tenant_id` in all business entities

```python
# ✅ Standard ID pattern
id = Column(String(50), primary_key=True, index=True, comment="唯一标识")
tenant_id = Column(String(50), nullable=False, index=True, comment="租户ID")
```

#### Relationship Management
- **No SQLAlchemy relationships**: Avoid `relationship()` definitions
- **Service-layer joins**: Handle relationships in application services
- **Loose coupling**: Models should be independently deployable

### Database Models Optimization History

The project underwent comprehensive database model optimization:

#### 1. Unified ID Strategy
- **Before**: Mixed Integer and UUID primary keys
- **After**: Consistent String(50) IDs for better scalability and multi-tenant support

#### 2. Eliminated Foreign Key Dependencies
- **Before**: Heavy use of ForeignKey constraints causing migration failures
- **After**: String-based references with service-layer relationship management
- **Impact**: 90% reduction in migration conflicts

#### 3. Multi-tenant Architecture Implementation
- Added `tenant_id` fields across all major models
- Implemented tenant-aware indexing strategies
- Optimized query patterns for data isolation

#### 4. Simplified Relationship Management
- **Before**: Complex SQLAlchemy relationships causing circular dependencies
- **After**: Service-layer relationship management for better performance
- **Result**: Cleaner code, faster queries, easier maintenance

## Key Features

### Backend Features
- Multi-tenant architecture with data isolation
- 6-tier RBAC system (System Admin → Guest)
- Enterprise document management with versioning
- Vector search integration (Weaviate)
- Knowledge graph system (Neo4j)
- JWT authentication with refresh tokens
- Email service with multiple SMTP providers
- Async task processing (Celery)
- Auto-initialization of admin accounts

### Frontend Features
- Real-time messaging interface
- Enterprise page transitions (6 animation effects)
- Advanced appearance customization
- Knowledge graph visualization (ECharts)
- Multi-language support (English/Chinese)
- Type-safe routing with TanStack Router
- Responsive design with mobile support

## Configuration

### Backend Configuration
- **Main config**: `backend/app/core/config.py`
- **Environment**: Use `.env` files with pydantic-settings
- **Database**: Configure via `DATABASE_URL` environment variable
- **Services**: Redis, MinIO, Neo4j, Weaviate URLs in environment

### Frontend Configuration
- **Build config**: `frontend/vite.config.ts`
- **Environment**: Use `.env.local` for development
- **API endpoint**: Configure `VITE_API_URL`

## Docker Services

Required services (defined in `docker-compose.yml`):
- **PostgreSQL**: port 5432 (main database)
- **Redis**: port 6379 (cache & tasks)
- **MinIO**: port 9000 (object storage)
- **Weaviate**: port 8080 (vector database)
- **Neo4j**: ports 7474/7687 (knowledge graph)
- **Nginx**: reverse proxy (production)

## Testing

### Backend Tests
```bash
# Run all tests
pytest tests/

# Specific test files
pytest tests/test_auth.py
pytest tests/test_rbac.py
pytest tests/test_recycle_bin.py
```

### Frontend Tests
```bash
# Run tests (when configured)
pnpm run test
```

## Database Migrations

### Creating Migrations
```bash
# Auto-generate migration
alembic revision --autogenerate -m "add new feature"

# Manual migration
alembic revision -m "manual change"
```

### Running Migrations
```bash
# Upgrade to latest
alembic upgrade head

# Upgrade to specific revision
alembic upgrade revision_id

# Downgrade
alembic downgrade -1
```

## Deployment

### Development Deployment
1. **Local Python + Docker services**: Use `./dev-start.sh`
2. **Full Docker**: Use `./start.sh`

### Production Deployment
1. Configure environment variables
2. Use `./start.sh` with production settings
3. Ensure SSL/HTTPS via Nginx configuration

## Common Issues & Solutions

### Database Issues
- **Migration conflicts**: Resolve by checking model changes in `backend/app/models/`
- **NEVER use Foreign Keys**: Always use string-based references with service-layer validation
- **Tenant isolation**: Ensure all queries include `tenant_id` filtering
- **Index optimization**: Create compound indexes for tenant-aware queries
- **String ID validation**: Implement proper ID format validation in services

### Frontend Issues
- **Build errors**: Check TypeScript types in `frontend/src/types/`
- **API connection**: Verify `VITE_API_URL` in environment
- **Route errors**: Check TanStack Router configuration
- **Mobile rendering**: Test all components on mobile devices
- **Responsive breakpoints**: Ensure proper responsive behavior
- **Touch interactions**: Verify touch targets meet minimum size requirements

### Docker Issues
- **Service conflicts**: Check port availability for required services
- **Volume permissions**: Ensure proper file permissions for mounted volumes
- **Network issues**: Verify service connectivity in docker-compose network

## File Naming Conventions

### Backend File Naming (Python)

#### Directory Structure
```
backend/app/
├── api/endpoints/v1/
│   ├── auth_api.py           # Authentication endpoints
│   ├── users_api.py          # User management endpoints
│   ├── files_api.py          # File management endpoints
│   └── {feature}_api.py      # Feature-specific endpoints
├── application/services/
│   ├── auth_service.py       # Authentication business logic
│   ├── user_service.py       # User management service
│   └── {feature}_service.py  # Feature services
├── domain/entities/
│   ├── user_entity.py        # User domain entity
│   └── {entity}_entity.py    # Domain entities
├── infrastructure/repositories/
│   ├── user_repository.py    # User data access
│   └── {entity}_repository.py # Repository implementations
├── models/
│   ├── user_models.py        # User database models
│   ├── tenant_models.py      # Tenant database models
│   ├── org_models.py         # Organization models
│   ├── file_models.py        # File management models
│   └── {feature}_models.py   # Feature-specific models
└── schemas/
    ├── user_schemas.py       # User API schemas
    └── {feature}_schemas.py  # Feature schemas
```

#### Naming Rules
- **Files**: Use `snake_case` with descriptive suffixes
- **Classes**: Use `PascalCase` (e.g., `UserService`, `AuthController`)
- **Functions**: Use `snake_case` (e.g., `get_user_by_id`, `create_tenant`)
- **Constants**: Use `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`, `DEFAULT_ROLE`)
- **Database Models**: Suffix with model type (e.g., `User`, `UserProfile`)
- **Services**: Suffix with `Service` (e.g., `UserService`, `AuthService`)
- **Repositories**: Suffix with `Repository` (e.g., `UserRepository`)
- **Schemas**: Suffix with purpose (e.g., `UserCreate`, `UserResponse`)

### Frontend File Naming (TypeScript/React)

#### Directory Structure
```
frontend/src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx        # Base UI components (PascalCase)
│   │   ├── Dialog.tsx
│   │   └── DataTable.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx     # Feature components
│   │   └── SignupForm.tsx
│   └── layout/
│       ├── Header.tsx        # Layout components
│       └── Sidebar.tsx
├── features/
│   ├── auth/
│   │   ├── components/       # Feature-specific components
│   │   ├── hooks/           # Feature-specific hooks
│   │   ├── services/        # Feature API services
│   │   └── types/           # Feature type definitions
│   └── {feature}/
├── routes/
│   ├── auth.tsx             # Route components
│   ├── dashboard.tsx
│   └── {route}.tsx
├── services/
│   ├── api.ts               # Base API configuration
│   ├── auth.service.ts      # Authentication API
│   └── {feature}.service.ts # Feature APIs
├── stores/
│   ├── auth.store.ts        # Authentication state
│   └── {feature}.store.ts   # Feature state
├── hooks/
│   ├── useAuth.ts           # Custom hooks
│   └── use{Feature}.ts
├── types/
│   ├── auth.types.ts        # Type definitions
│   └── {feature}.types.ts
└── utils/
    ├── constants.ts         # Application constants
    ├── helpers.ts           # Helper functions
    └── {category}.utils.ts  # Utility functions
```

#### Naming Rules
- **Components**: Use `PascalCase` (e.g., `UserProfile.tsx`, `DataTable.tsx`)
- **Hooks**: Prefix with `use` (e.g., `useAuth.ts`, `useFileUpload.ts`)
- **Services**: Suffix with `.service.ts` (e.g., `auth.service.ts`)
- **Stores**: Suffix with `.store.ts` (e.g., `user.store.ts`)
- **Types**: Suffix with `.types.ts` (e.g., `auth.types.ts`)
- **Utils**: Suffix with `.utils.ts` (e.g., `date.utils.ts`)
- **Constants**: Use `constants.ts` or `{feature}.constants.ts`
- **Routes**: Use `kebab-case` for URLs, `camelCase` for files

## Code Patterns & Standards

### Backend Patterns
- **Dependency Injection**: Use FastAPI's dependency injection system
- **Repository Pattern**: Abstract data access with repository interfaces
- **Service Layer**: Implement business logic in application services
- **Clean Architecture**: Maintain strict layer separation
- **Error Handling**: Use custom exceptions with proper HTTP status codes
- **Validation**: Use Pydantic for request/response validation
- **Logging**: Implement structured logging with correlation IDs
- **NO LAZY IMPORTS**: Never use import statements inside functions or methods. All imports must be at the top of the file. This prevents circular imports and improves code readability and performance.

### Frontend Patterns
- **Component Composition**: Favor composition over inheritance
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Error Boundaries**: Implement error boundaries for robust UX
- **State Management**: Use Zustand for global state, React state for local
- **Type Safety**: Leverage TypeScript for compile-time safety
- **Performance**: Use React.memo, useMemo, useCallback appropriately
- **Accessibility**: Follow WCAG 2.1 AA guidelines

### Mobile-First Frontend Design Requirements

#### Responsive Design Principles
- **Progressive Enhancement**: Start with mobile experience, enhance for larger screens
- **Touch-First**: Design for touch interactions (min 44px touch targets)
- **Performance**: Optimize for slower mobile networks and devices
- **Accessibility**: Ensure usability with screen readers and assistive technology

#### Breakpoint Strategy
```typescript
// Design system breakpoints
const breakpoints = {
  mobile: '320px',     // Mobile phones
  tablet: '768px',     // Tablets
  desktop: '1024px',   // Desktop screens
  wide: '1440px'       // Wide screens
} as const;
```

#### Mobile Considerations
- **Navigation**: Use collapsible navigation for small screens
- **Forms**: Stack form elements vertically on mobile
- **Tables**: Use horizontal scroll or card layouts for mobile
- **Images**: Implement responsive images with appropriate sizes
- **Typography**: Use scalable font sizes (rem/em units)
- **Spacing**: Ensure adequate spacing for touch interactions

#### Component Responsiveness Requirements
- All new components MUST be mobile-responsive
- Test on actual mobile devices, not just browser dev tools
- Consider offline functionality for mobile users
- Implement progressive web app (PWA) features where appropriate

## Performance Considerations

### Database
- **NO FOREIGN KEYS**: Never use ForeignKey constraints in any model
- **Tenant-aware indexing**: Create compound indexes with tenant_id as first column
- **String-based relationships**: Use service-layer joins instead of database joins
- **Connection pooling**: Configure SQLAlchemy pool settings appropriately
- **Redis caching**: Cache frequently accessed tenant-specific data
- **Query optimization**: Use proper WHERE clauses and avoid N+1 queries

### Frontend
- **Mobile performance**: Optimize for slower mobile connections
- **Code splitting**: Implement route-based and component-based splitting
- **Image optimization**: Use responsive images and lazy loading
- **Bundle optimization**: Tree shake unused code and minimize bundle size
- **Virtual scrolling**: Use for large lists (>100 items)
- **Memoization**: Use React.memo, useMemo, useCallback appropriately
- **Progressive loading**: Implement skeleton screens and progressive enhancement

This codebase represents a production-ready, enterprise-grade application with modern architecture patterns and comprehensive feature set.