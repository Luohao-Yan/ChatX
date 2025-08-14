# ChatX

A powerful chat application built with modern web technologies.

[简体中文](./README.zh-CN.md)

![ChatX Application](public/images/chatx.png)

ChatX is a modern chat application designed for seamless communication and collaboration.

> This project provides a solid foundation for building chat applications with modern web technologies.

## Features

- Real-time messaging
- Light/dark mode
- Responsive design
- Accessible interface
- Modern UI components
- Built with TypeScript
- Fast and efficient
- **Enterprise Page Transitions** - 6 professional animation effects (Fade, Slide, Slide-up, Zoom, Blur-fade, None)
- **Advanced Appearance System** - Color schemes, border radius, custom radius, font size customization
- **Smart Animation Degradation** - Auto-detects user accessibility preferences, error boundary handling, safe fallbacks
- **Enterprise-Grade HTTP Client** - Type-safe fetch-based request module with interceptors, retry logic, and error handling
- **Comprehensive Document Management Interface** - User-centric document management experience:
  - **My Documents** - Main document workspace with upload and management capabilities
  - **Recent Documents** - Quick access to recently used documents
  - **Favorites** - Bookmark important documents for quick access
  - **Shared with Me** - View documents shared by others
  - **Trash** - Recover accidentally deleted documents
  - **Storage Analytics** - View storage usage statistics and optimization recommendations
  - **Document Settings** - Category/tag management and folder structure configuration
- **Enterprise-Grade Knowledge Graph Visualization** - Interactive knowledge relationship visualization:
  - **ECharts-Powered Graph** - High-performance force-directed layout with enterprise-grade rendering
  - **Dynamic Theme Integration** - Complete system theme support with 15+ color schemes and dark/light mode
  - **Interactive Node System** - 9 different node types (Documents, Concepts, People, Organizations, etc.)
  - **Advanced Tooltips** - Rich, contextual information display with modern UI design
  - **Mobile-Responsive Controls** - Touch-optimized zoom, pan, and interaction controls
  - **Real-time Filtering** - Search and filter nodes by type, content, or relationships
  - **Full-Screen Mode** - Immersive graph exploration experience
  - **Node Detail Panels** - Comprehensive information display for selected nodes

## Tech Stack

**UI:** [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)

**Build Tool:** [Vite](https://vitejs.dev/)

**Routing:** [TanStack Router](https://tanstack.com/router/latest)

**Type Checking:** [TypeScript](https://www.typescriptlang.org/)

**Linting/Formatting:** [Eslint](https://eslint.org/) & [Prettier](https://prettier.io/)

**Icons:** [Tabler Icons](https://tabler.io/icons)

**Auth (partial):** [Clerk](https://go.clerk.com/GttUAaK)

**Animation:** [Framer Motion](https://www.framer.com/motion/)

**HTTP Client:** Custom Fetch-based Request Module (replaces Axios)

**State Management:** [Zustand](https://zustand-demo.pmnd.rs/)

**Data Fetching:** [TanStack Query](https://tanstack.com/query/latest)

**Visualization:** [ECharts](https://echarts.apache.org/) & [ECharts for React](https://github.com/hustcc/echarts-for-react)

## 🏗️ Architecture

The project follows a modern, modular architecture with clear separation of concerns:

```
src/
├── 🏭 services/              # Infrastructure Services Layer
│   ├── 📡 http/             # HTTP client & interceptors
│   │   ├── request.ts       # Core HTTP client
│   │   ├── auth-interceptor.ts # Authentication interceptor
│   │   └── index.ts         # Service exports
│   ├── 🔐 auth/             # Authentication services
│   │   ├── auth-utils.ts    # Auth utilities & validators
│   │   └── index.ts         # Auth service exports
│   ├── 💾 storage/          # Storage services (future)
│   ├── 🔌 websocket/        # WebSocket services (future)
│   └── 📤 upload/           # File upload services (future)
│
├── 🎯 features/             # Business Feature Modules
│   ├── 🔒 core/             # Core application features
│   │   ├── auth/            # Authentication & authorization
│   │   ├── dashboard/       # Main dashboard
│   │   └── settings/        # Application settings
│   ├── 💬 chat/             # Chat functionality
│   │   ├── ai-chat/         # AI conversation features
│   │   └── conversations/   # User chat management
│   ├── 📁 documents/        # Document management
│   ├── 🧠 knowledge/        # Knowledge management
│   ├── 👥 users/            # User management
│   └── ✅ tasks/            # Task management
│
├── 🎨 components/           # UI Component Library
│   ├── 🧩 ui/              # Base UI components (shadcn/ui)
│   ├── 🏗️ layout/          # Layout components
│   ├── 📝 forms/           # Form components
│   ├── 💬 feedback/        # Feedback components
│   ├── 🧭 navigation/      # Navigation components
│   ├── 💼 business/        # Business-specific components
│   └── 🤝 shared/          # Cross-module shared components
│
├── 🛠️ utils/               # Utility Functions Library
│   ├── format.ts           # Data formatting utilities
│   ├── logger.ts           # Logging utilities
│   ├── utils.ts            # General utility functions
│   ├── api-config.ts       # API configuration
│   └── app-config.ts       # Application configuration
│
├── 📦 stores/              # State Management
│   ├── auth/               # Authentication state
│   ├── app/                # Global application state
│   ├── chat/               # Chat-related state
│   └── user/               # User-specific state
│
├── ⚙️ config/              # Configuration Management
│   ├── api.ts              # API endpoints
│   ├── auth-config.ts      # Authentication configuration
│   └── constants.ts        # Application constants
│
├── 📐 types/               # TypeScript Type Definitions
│   ├── api/                # API interface types
│   ├── entities/           # Business entity types
│   └── common/             # Common shared types
│
└── 🛣️ routes/              # Application Routing
    ├── (auth)/             # Authentication routes
    ├── _authenticated/     # Protected routes
    └── (errors)/           # Error pages
```

### 🎯 Architecture Principles

#### 🏗️ **Layered Architecture**
```
┌─────────────────────────────────────────┐
│             🎨 UI Layer                 │  ← Components & Routes
├─────────────────────────────────────────┤
│           🎯 Feature Layer              │  ← Business Logic
├─────────────────────────────────────────┤
│         🏭 Infrastructure Layer         │  ← Services & Utilities
└─────────────────────────────────────────┘
```

#### 📦 **Module Dependencies**
```
Features ──depends on──→ Services
    ↓                       ↓
Components ──depends on──→ Utils
```

#### 🔗 **Clear Separation of Concerns**
- **🏭 Services**: Cross-cutting infrastructure (HTTP, auth, storage)
- **🎯 Features**: Self-contained business modules
- **🎨 Components**: Reusable UI elements
- **🛠️ Utils**: Pure utility functions
- **📦 Stores**: Application state management

This architecture ensures:
- ✅ **Scalability**: Easy to add new features
- ✅ **Maintainability**: Clear boundaries and responsibilities  
- ✅ **Testability**: Isolated modules for unit testing
- ✅ **Developer Experience**: Intuitive organization and imports

## Run Locally

Clone the project

```bash
  git clone git@github.com:Luohao-Yan/ChatX.git
```

Go to the project directory

```bash
  cd ChatX
```

Install dependencies

```bash
  pnpm install
```

Start the server

```bash
  pnpm run dev
```

## Application Routes

The application includes comprehensive management systems with the following routes:

### Document Management

- `/documents` - My Documents (main document workspace)
- `/documents/recent` - Recently accessed documents
- `/documents/favorites` - Favorited documents
- `/documents/shared` - Documents shared by others
- `/documents/trash` - Deleted documents (recoverable)
- `/documents/storage` - Storage usage analytics
- `/documents/settings/categories` - Category and tag management
- `/documents/settings/folders` - Folder structure management

### Knowledge Graph

- `/knowledge/graph` - Interactive knowledge graph visualization with real-time data exploration

## HTTP Client Usage

This project features a custom enterprise-grade HTTP client built on the fetch API, providing a modern alternative to Axios with full TypeScript support.

### Basic Usage

```typescript
import { http } from '@/lib/request'

// GET request
const users = await http.get('/users')

// POST request
const newUser = await http.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
})

// With query parameters
const filteredUsers = await http.get('/users', {
  params: { page: 1, limit: 10 }
})
```

### Advanced Features

```typescript
// Request with retry and timeout
const data = await http.get('/api/data', {
  retry: 3,           // Retry 3 times on failure
  retryDelay: 1000,   // 1 second delay between retries
  timeout: 5000,      // 5 second timeout
})

// File upload
const formData = new FormData()
formData.append('file', file)
await http.post('/upload', formData)
```

### Interceptors

```typescript
// Request interceptor - add authentication
http.addRequestInterceptor({
  onRequest: (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }
})

// Response interceptor - handle errors globally
http.addResponseInterceptor({
  onResponseError: (error) => {
    if (error.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
    throw error
  }
})
```

### Integration with React Query

```typescript
import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/request'

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => http.get('/users').then(res => res.data)
  })
}
```

### Configuration

Environment variables for HTTP client configuration:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Knowledge Graph Visualization

The application features an enterprise-grade knowledge graph built with ECharts, providing interactive visualization of data relationships.

### Key Features

- **High-Performance Rendering**: Powered by ECharts with optimized force-directed layout algorithm
- **Dynamic Theme Support**: Automatically adapts to system themes with 15+ color schemes
- **Interactive Exploration**: Click, drag, zoom, and pan with smooth animations
- **Smart Node Classification**: 9 distinct node types with semantic color coding
- **Advanced Filtering**: Real-time search and type-based filtering
- **Mobile Responsive**: Touch-optimized controls for mobile devices
- **Rich Tooltips**: Contextual information with modern design

### Node Types

The knowledge graph supports various node types, each with distinct visual styling:

```typescript
// Supported node types with semantic colors
{
  document: 'Documents and files',
  concept: 'Abstract concepts and ideas', 
  person: 'People and individuals',
  organization: 'Companies and organizations',
  department: 'Organizational departments',
  topic: 'Subject topics and themes',
  tag: 'Classification tags',
  website: 'Web resources and links',
  wechat_article: 'WeChat articles and content'
}
```

### Theme Integration

The knowledge graph seamlessly integrates with the application's theme system:

```typescript
// Automatic theme adaptation
const graphTheme = useGraphTheme()

// Supports all color schemes:
// default, emerald, blue, indigo, purple, red, orange, 
// teal, cyan, lime, pink, amber, slate, neutral, zinc
```

### Usage Example

```typescript
import { KnowledgeGraph } from '@/components/knowledge-graph/knowledge-graph'

function MyComponent() {
  return (
    <KnowledgeGraph
      data={graphData}
      loading={false}
      onNodeClick={(node) => {
        console.log('Selected node:', node)
      }}
    />
  )
}
```

### Current Sponsor

- [Clerk](https://go.clerk.com/GttUAaK) - for backing the implementation of Clerk in this project

## Author

Crafted with 🤍 by [@Leon](https://github.com/Luohao-Yan)

## License

Licensed under the [MIT License](https://choosealicense.com/licenses/mit/)
