/**
 * 组织表单组件
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import type { Organization, OrganizationType } from '../../types'

interface OrganizationFormProps {
  organization?: Organization | null
  organizations: Organization[]
  isEditing: boolean
  onSubmit: (data: any) => void
  onClose: () => void
}

export default function OrganizationForm({
  organization,
  organizations,
  isEditing,
  onSubmit,
  onClose
}: OrganizationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'department' as OrganizationType,
    parentId: ''
  })

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        description: organization.description || '',
        type: organization.type,
        parentId: organization.parentId || ''
      })
    }
  }, [organization])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData = {
      ...formData,
      parentId: formData.parentId || undefined
    }
    
    onSubmit(submitData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '编辑组织' : '新建组织'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">名称 *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="请输入组织名称"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">描述</label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="请输入组织描述"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">类型 *</label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full p-2 border border-input rounded-md bg-background"
              required
            >
              <option value="company">公司</option>
              <option value="department">部门</option>
              <option value="team">团队</option>
              <option value="group">小组</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">上级组织</label>
            <select
              value={formData.parentId}
              onChange={(e) => handleChange('parentId', e.target.value)}
              className="w-full p-2 border border-input rounded-md bg-background"
            >
              <option value="">无上级组织</option>
              {organizations
                .filter(org => org.id !== organization?.id)
                .map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              {isEditing ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}