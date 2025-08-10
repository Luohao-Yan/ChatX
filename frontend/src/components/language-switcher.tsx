import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const isMobile = useIsMobile()

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode)
  }

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={isMobile ? "icon" : "sm"} className={cn(!isMobile && "h-8 px-2")}>
          <Languages className="h-4 w-4" />
          {!isMobile && <span className="ml-1">{currentLanguage.name}</span>}
          {!isMobile && <ChevronDown className="ml-1 h-3 w-3" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center justify-between"
          >
            <span>{language.name}</span>
            {i18n.language === language.code && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}