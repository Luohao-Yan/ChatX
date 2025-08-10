import { createContext, useContext, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'

type AvatarDisplay = 'bottom-left' | 'top-right'

type AvatarProviderProps = {
  children: React.ReactNode
  defaultAvatarDisplay?: AvatarDisplay
  storageKey?: string
}

type AvatarProviderState = {
  avatarDisplay: AvatarDisplay
  setAvatarDisplay: (avatarDisplay: AvatarDisplay) => void
}

const initialState: AvatarProviderState = {
  avatarDisplay: 'bottom-left',
  setAvatarDisplay: () => null,
}

const AvatarProviderContext = createContext<AvatarProviderState>(initialState)

export function AvatarProvider({
  children,
  defaultAvatarDisplay = 'bottom-left',
  storageKey = 'avatar-display-setting',
  ...props
}: AvatarProviderProps) {
  const [avatarDisplay, _setAvatarDisplay] = useState<AvatarDisplay>(
    () => (localStorage.getItem(storageKey) as AvatarDisplay) || defaultAvatarDisplay
  )

  const setAvatarDisplay = (avatarDisplay: AvatarDisplay) => {
    localStorage.setItem(storageKey, avatarDisplay)
    _setAvatarDisplay(avatarDisplay)
  }

  const value = {
    avatarDisplay,
    setAvatarDisplay,
  }

  return (
    <AvatarProviderContext.Provider {...props} value={value}>
      {children}
    </AvatarProviderContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAvatar = () => {
  const context = useContext(AvatarProviderContext)
  const isMobile = useIsMobile()

  if (context === undefined)
    throw new Error('useAvatar must be used within an AvatarProvider')

  if (isMobile) {
    return { ...context, avatarDisplay: 'top-right' as const }
  }

  return context
}