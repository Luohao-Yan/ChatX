/**
 * 微信公众号知识收藏页面
 * 按照分层架构设计
 */

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  IconBrandWechat, 
  IconPlus, 
  IconSearch, 
  IconFilter, 
  IconBookmark 
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

export default function WechatPage() {
  const { t } = useTranslation()

  const breadcrumbItems = [
    { label: t('nav.knowledge') },
    { label: t('knowledge.wechat') }
  ]

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header className="shrink-0">
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
        <Button size="sm">
          <IconPlus size={16} className="mr-1" />
          {t('knowledge.addFavorite')}
        </Button>
      </Header>

      {/* Main Content */}
      <Main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <IconBrandWechat className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">{t('knowledge.wechat')}</h1>
                <p className="text-muted-foreground">{t('knowledge.wechatDescription')}</p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('knowledge.searchArticles')}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <IconFilter className="mr-2 h-4 w-4" />
              {t('knowledge.filter')}
            </Button>
          </div>
          
          {/* Content Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">{t('knowledge.quickFavorite')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('knowledge.quickFavoriteDescription')}
              </p>
              <Button variant="outline" className="w-full">
                <IconBookmark className="mr-2 h-4 w-4" />
                {t('knowledge.favoriteArticle')}
              </Button>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">{t('knowledge.statistics')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('knowledge.favoritesCount')}</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('knowledge.followedAccounts')}</span>
                  <span>0</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-2">{t('knowledge.underDevelopment')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('knowledge.wechatUnderDevelopment')}
              </p>
            </div>
          </div>
        </div>
      </Main>
    </div>
  )
}