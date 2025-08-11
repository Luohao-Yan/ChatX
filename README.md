<p align="right">
  <a href="./README.zh-CN.md">
    <img src="https://img.shields.io/badge/Language-简体中文-blue?style=for-the-badge" alt="Switch to Chinese">
  </a>
</p>

# ChatX - A Modern & Intelligent Chat Application

<p align="center">
  <img alt="ChatX Desktop" src="./frontend/public/images/chatx-1.png" width="70%">
  <img alt="ChatX Mobile" src="./frontend/public/images/mobile-image.png" width="25%">
</p>
<p align="center">
  <img alt="ChatX Desktop" src="./frontend/public/images/home.png" width="70%">
  <img alt="ChatX Mobile" src="./frontend/public/images/mobile-home-image.png" width="25%">
</p>

ChatX is a powerful full-stack chat application designed to provide a seamless experience for communication, collaboration, and intelligent file management. It is built with a modern tech stack, featuring a user-centric and customizable frontend, and a stable, scalable enterprise-grade backend.

## ✨ Core Features

### Frontend (UI/UX)

- **Real-time Messaging**: Delivers a smooth instant messaging experience.
- **Enterprise-grade Page Transitions**: Includes 6 professional animation effects (fade, slide, zoom, etc.).
- **Advanced Appearance Customization**: Supports light/dark modes, custom color schemes, border-radius, and font sizes.
- **Responsive & Accessible Design**: Ensures a great user experience on all devices and respects user accessibility preferences.
- **Modern UI Components**: Built with shadcn/ui for a beautiful and easy-to-use interface.
- **Comprehensive Document Management Interface**: User-centric design with intuitive navigation for document workflow management.
- **Enterprise-Grade Knowledge Graph Visualization**: Interactive ECharts-powered graph with dynamic theming and relationship exploration.

### Backend (API & Services)

- **Enterprise-grade Multi-tenant Architecture**:
  - **Tenant Isolation**: Complete data and resource isolation between tenants.
  - **Multi-tenant Security**: Advanced middleware for tenant-specific access controls.
  - **Resource Quotas**: Per-tenant limits and usage monitoring.
  - **Tenant Management**: Dynamic tenant creation and configuration.

- **Advanced RBAC Permission System**:
  - **Role-based Access Control**: Comprehensive RBAC with hierarchical roles.
  - **Fine-grained Permissions**: Resource-level and action-level permission control.
  - **Permission Inheritance**: Role hierarchy with permission inheritance.
  - **Dynamic Permission Assignment**: Runtime permission granting and revocation.
  - **Audit Logging**: Complete permission change tracking and audit trails.
  - **Default Roles**: 6 pre-defined roles from guest to super admin.
  - **Custom Roles**: Create and manage custom roles with specific permissions.

- **Enterprise-grade Document Management System**:
  - **Document Lifecycle**: Full document workflow from upload to archival with version control.
  - **Smart Organization**: Hierarchical folders, intelligent categorization, and flexible tagging system.
  - **Advanced Search**: Multi-dimensional filtering, semantic search, and content-based discovery.
  - **Secure Sharing**: Time-limited sharing links with password protection and access controls.
  - **Storage Analytics**: Detailed usage statistics and storage optimization insights.
  - **File Operations**: Upload/download/delete/rename with SHA256-based deduplication.
  - **Content Intelligence**: Automatic identification and smart categorization of 11+ file types.

- **Advanced Authentication & User Management**:
  - **JWT-based Security**: Secure token-based authentication with refresh tokens.
  - **Session Management**: Multi-device session tracking and management.
  - **User Registration**: Complete user onboarding with email verification.
  - **Password Recovery**: Secure password reset with verification codes.
  - **User Profiles**: Comprehensive user profile management.
  - **Third-party Integration**: OAuth2, LDAP, SAML support ready.

- **Vector Search Integration**: Enables semantic search on document content via Weaviate.
- **Knowledge Graph System**: Utilizes Neo4j for analyzing data relationships with interactive visualization support.
- **Real-time Data Visualization**: Frontend-backend integration for dynamic knowledge graph exploration.
- **Asynchronous Task Processing**: Uses Celery for handling time-consuming tasks like file processing and notifications.

## 🚀 Tech Architecture

### Frontend Tech Stack

- **UI Framework**: [React](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Component Library**: [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)
- **Routing**: [TanStack Router](https://tanstack.com/router/latest)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Visualization**: [ECharts](https://echarts.apache.org/) & [ECharts for React](https://github.com/hustcc/echarts-for-react)
- **Authentication**: [Clerk](https://go.clerk.com/GttUAaK)

### Backend Tech Stack

- **Web Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Language**: [Python 3.11+](https://www.python.org/)
- **Containerization**: [Docker](https://www.docker.com/) & Docker Compose
- **Reverse Proxy**: Nginx
- **Databases**:
  - **Relational**: PostgreSQL
  - **Vector**: Weaviate
  - **Knowledge Graph**: Neo4j
- **Caching**: Redis
- **File Storage**: MinIO
- **Async Tasks**: Celery

## 🏁 Quick Start

Follow these steps to run ChatX locally for development.

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js](https://nodejs.org/) (v18+) and [pnpm](https://pnpm.io/installation)

### Step 1: Start the Backend Services

All backend dependencies (databases, cache, file storage, etc.) are managed via Docker for a simple one-command setup.

```bash
# Navigate to the backend directory
cd backend

# Copy the example environment file
cp .env.example .env

# (Optional) Modify ports or passwords in the .env file as needed

# Start all backend services (including the FastAPI app)
# This script will grant execution permissions and start the containers
chmod +x start.sh && ./start.sh
```

After startup, you can run `docker-compose ps` to confirm all services are `Up`.

**Key Backend Endpoints:**

- **API Docs (Swagger)**: <http://localhost/docs>
- **Health Check**: <http://localhost/health>
- **System Metrics**: <http://localhost/metrics>
- **MinIO Console**: <http://localhost/minio>
- **Neo4j Browser**: <http://localhost/neo4j> (Knowledge Graph database)
- **Knowledge Graph API**: <http://localhost/api/knowledge/graph>

### Step 1.5: Initialize RBAC System (First-time Setup)

After starting the backend services, initialize the RBAC permission system:

```bash
# Initialize RBAC system (first-time setup only)
python init_rbac.py

# Test user authentication
python test_auth.py

# Test RBAC permissions
python test_rbac.py
```

This will create default roles and permissions:

- **Super Admin**: Full system access
- **Tenant Admin**: Tenant-level management
- **Organization Admin**: Organization-level management  
- **Department Manager**: Department user management
- **User**: Basic file operations
- **Guest**: Read-only access

### Step 2: Start the Frontend Dev Server

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
pnpm install

# (Optional) Copy and configure frontend environment variables
# cp .env.example .env

# Start the frontend development server
pnpm run dev
```

### Step 3: Access the Application

You're all set! You can now open [http://localhost:5173](http://localhost:5173) in your browser to access the ChatX application.

## 📁 Project Structure

```text
chatx-main/
├── backend/            # Backend FastAPI application and all service configurations
│   ├── app/            # FastAPI core source code
│   │   ├── api/        # API endpoints and route definitions
│   │   │   └── v1/     # API version 1 routes
│   │   │       ├── users_api.py      # User management API
│   │   │       ├── roles_api.py      # Role management API
│   │   │       ├── permissions_api.py # Permission management API
│   │   │       └── file_management_api.py # File management API
│   │   ├── core/       # Core application components
│   │   │   ├── permissions.py       # RBAC permission system
│   │   │   ├── security.py          # Authentication & security
│   │   │   ├── rbac_init.py          # RBAC initialization
│   │   │   └── banner.py            # Application startup banner
│   │   ├── models/     # Database models
│   │   │   ├── user_models.py       # User, Role, Permission models
│   │   │   ├── tenant_models.py     # Multi-tenant models
│   │   │   ├── org_models.py        # Organization models
│   │   │   └── file_models.py       # File management models
│   │   ├── schemas/    # Pydantic schemas
│   │   │   ├── user_schemas.py      # User data schemas
│   │   │   ├── rbac_schemas.py      # RBAC schemas
│   │   │   └── file_schemas.py      # File schemas
│   │   ├── middleware/ # Custom middleware
│   │   ├── services/   # Business logic services
│   │   ├── tasks/      # Celery async tasks
│   │   ├── utils/      # Utility functions
│   │   └── knowledge/  # Knowledge graph API endpoints and services
│   ├── nginx/          # Nginx configuration files
│   ├── docker-compose.yml # Docker orchestration file
│   ├── start.sh        # Docker startup script
│   ├── dev-start.sh    # Local development startup script
│   ├── init_rbac.py    # RBAC system initialization script
│   ├── test_auth.py    # User authentication test script
│   ├── test_rbac.py    # RBAC permission test script
│   ├── requirements.txt # Python dependencies
│   ├── README.md       # Backend documentation
│   └── RBAC_SYSTEM.md  # RBAC system documentation
├── frontend/           # Frontend React application
│   ├── src/            # React core source code
│   │   ├── components/knowledge-graph/ # ECharts-based visualization components
│   │   ├── hooks/use-graph-theme.ts   # Theme integration for graphs
│   │   ├── routes/knowledge/          # Knowledge graph routes
│   │   └── ...
│   ├── public/         # Static assets
│   ├── package.json    # Frontend dependency configuration
│   └── ...
├── .github/            # GitHub-related configurations (CI/CD, templates, etc.)
├── README.md           # This project description file (English)
├── README.zh-CN.md     # Project description file (Chinese)
└── .gitignore          # Git ignore configuration
```

## 🤝 Contributing

We welcome contributions of all kinds! Please read our [CONTRIBUTING.md](./.github/CONTRIBUTING.md) file for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the [MIT License](./frontend/LICENSE).

---
Crafted with 🤍 by [@Leon (Luohao-Yan)](https://github.com/Luohao-Yan)
