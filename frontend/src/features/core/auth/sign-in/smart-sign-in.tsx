import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useLoginLayout } from '@/context/login-layout-context'
import SignIn from './index'
import SignIn2 from './sign-in-2'

export default function SmartSignIn() {
  const { loginLayout } = useLoginLayout()
  const router = useRouter()

  useEffect(() => {
    // Get current path
    const currentPath = router.state.location.pathname
    
    // Check if we need to redirect based on layout preference
    if (loginLayout === 'single-column' && currentPath === '/sign-in-2') {
      router.navigate({ to: '/sign-in', replace: true })
    } else if (loginLayout === 'double-column' && currentPath === '/sign-in') {
      router.navigate({ to: '/sign-in-2', replace: true })
    }
  }, [loginLayout, router])

  // Render the appropriate component based on layout preference
  if (loginLayout === 'double-column') {
    return <SignIn2 />
  }
  
  return <SignIn />
}