import { createContext, useContext, useEffect, useState } from 'react'

type LoginLayout = 'single-column' | 'double-column'

interface LoginLayoutContextType {
  loginLayout: LoginLayout
  setLoginLayout: (layout: LoginLayout) => void
}

const LoginLayoutContext = createContext<LoginLayoutContextType | undefined>(undefined)

export function LoginLayoutProvider({ children }: { children: React.ReactNode }) {
  const [loginLayout, setLoginLayoutState] = useState<LoginLayout>(() => {
    const stored = localStorage.getItem('login-layout')
    return (stored as LoginLayout) || 'single-column'
  })

  const setLoginLayout = (layout: LoginLayout) => {
    setLoginLayoutState(layout)
    localStorage.setItem('login-layout', layout)
  }

  useEffect(() => {
    const stored = localStorage.getItem('login-layout')
    if (stored && (stored === 'single-column' || stored === 'double-column')) {
      setLoginLayoutState(stored)
    }
  }, [])

  return (
    <LoginLayoutContext.Provider value={{ loginLayout, setLoginLayout }}>
      {children}
    </LoginLayoutContext.Provider>
  )
}

export function useLoginLayout() {
  const context = useContext(LoginLayoutContext)
  if (context === undefined) {
    throw new Error('useLoginLayout must be used within a LoginLayoutProvider')
  }
  return context
}