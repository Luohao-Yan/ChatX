import { Link } from '@tanstack/react-router'
import { ChevronRight, Home } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showHome?: boolean
}

export function Breadcrumb({ items, showHome = true }: BreadcrumbProps) {
  const isMobile = useIsMobile()

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      {showHome && (
        <Link
          to="/"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
        </Link>
      )}

      {!isMobile && items.length > 0 && <ChevronRight className="h-4 w-4" />}

      {!isMobile && items.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          {item.href && index < items.length - 1 ? (
            <Link
              to={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
          {index < items.length - 1 && <ChevronRight className="h-4 w-4" />}
        </div>
      ))}

      {isMobile && items.length > 0 && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{items[items.length - 1].label}</span>
        </>
      )}
    </nav>
  )
}