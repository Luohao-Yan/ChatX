/**
 * 部门表单组件
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import type { Department, Organization } from '../../types'

interface DepartmentFormProps {
  department?: Department | null
  departments: Department[]
  organizations: Organization[]
  isEditing: boolean
  onSubmit: (data: any) => void
  onClose: () => void
}

export default function DepartmentForm({
  department,
  departments,
  organizations,
  isEditing,
  onSubmit,
  onClose
}: DepartmentFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organizationId: '',
    parentId: '',
    managerId: ''
  })

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name,
        description: department.description || '',
        organizationId: department.organizationId,
        parentId: department.parentId || '',
        managerId: department.managerId || ''
      })
    }
  }, [department])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData = {
      ...formData,
      parentId: formData.parentId || undefined,
      managerId: formData.managerId || undefined
    }
    
    onSubmit(submitData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 过滤同组织的部门作为上级选项
  const parentDepartmentOptions = departments.filter(dept => 
    dept.organizationId === formData.organizationId && 
    dept.id !== department?.id
  )

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '编辑部门' : '新建部门'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">名称 *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="请输入部门名称"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">描述</label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="请输入部门描述"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">所属组织 *</label>
            <select
              value={formData.organizationId}
              onChange={(e) => handleChange('organizationId', e.target.value)}
              className="w-full p-2 border border-input rounded-md bg-background"
              required
            >
              <option value="">请选择组织</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {formData.organizationId && (
            <div>
              <label className="text-sm font-medium mb-2 block">上级部门</label>
              <select
                value={formData.parentId}
                onChange={(e) => handleChange('parentId', e.target.value)}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="">无上级部门</option>
                {parentDepartmentOptions.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">负责人ID</label>
            <Input
              value={formData.managerId}
              onChange={(e) => handleChange('managerId', e.target.value)}
              placeholder="请输入负责人ID（可选）"
            />
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