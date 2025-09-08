/**
 * 组织管理主页面
 * 按照分层架构设计
 */

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { OrganizationList, OrganizationForm } from '../components/organization'
import { useOrganizations } from '../hooks'
import type { Organization } from '../types'

export default function OrganizationsPage() {
  const { t } = useTranslation()
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const {
    organizations,
    organizationTree,
    loading,
    error,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refreshData,
  } = useOrganizations()

  const breadcrumbItems = [
    { label: t('nav.knowledge') },
    { label: t('nav.organizationLib') }
  ]

  const handleCreateNew = () => {
    setSelectedOrganization(null)
    setIsEditing(false)
    setShowForm(true)
  }

  const handleEdit = (organization: Organization) => {
    setSelectedOrganization(organization)
    setIsEditing(true)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedOrganization(null)
    setIsEditing(false)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      if (isEditing && selectedOrganization) {
        await updateOrganization(selectedOrganization.id, data)
      } else {
        await createOrganization(data)
      }
      handleFormClose()
      refreshData()
    } catch (error) {
      console.error('Form submission failed:', error)
    }
  }

  const handleDelete = async (organization: Organization) => {
    if (confirm(t('organization.deleteConfirm'))) {
      try {
        await deleteOrganization(organization.id)
        refreshData()
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen">
        <Header className="shrink-0">
          <Breadcrumb items={breadcrumbItems} />
          <HeaderActions />
        </Header>
        
        <Main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive">加载失败</h3>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
            <button 
              onClick={refreshData}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              重试
            </button>
          </div>
        </Main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header className="shrink-0">
        <Breadcrumb items={breadcrumbItems} />
        <HeaderActions />
        <Button onClick={handleCreateNew} size="sm">
          <IconPlus size={16} className="mr-1" />
          新建组织
        </Button>
      </Header>

      {/* Main Content */}
      <Main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <OrganizationList
            organizations={organizationTree}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={refreshData}
          />

          {/* Form Dialog */}
          {showForm && (
            <OrganizationForm
              organization={selectedOrganization}
              organizations={organizations}
              isEditing={isEditing}
              onSubmit={handleFormSubmit}
              onClose={handleFormClose}
            />
          )}
        </div>
      </Main>
    </div>
  )
}