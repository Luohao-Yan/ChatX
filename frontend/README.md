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

## Document Management Routes

The application includes a comprehensive document management system with the following routes:

- `/documents` - My Documents (main document workspace)
- `/documents/recent` - Recently accessed documents
- `/documents/favorites` - Favorited documents
- `/documents/shared` - Documents shared by others
- `/documents/trash` - Deleted documents (recoverable)
- `/documents/storage` - Storage usage analytics
- `/documents/settings/categories` - Category and tag management
- `/documents/settings/folders` - Folder structure management

## HTTP Client Usage

This project features a custom enterprise-grade HTTP client built on the fetch API, providing a modern alternative to Axios with full TypeScript support.

### Basic Usage

```typescript
import { http } from '@/lib/request-adapter'

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
import { http } from '@/lib/request-adapter'

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

### Current Sponsor

- [Clerk](https://go.clerk.com/GttUAaK) - for backing the implementation of Clerk in this project

## Author

Crafted with 🤍 by [@Leon](https://github.com/Luohao-Yan)

## License

Licensed under the [MIT License](https://choosealicense.com/licenses/mit/)
