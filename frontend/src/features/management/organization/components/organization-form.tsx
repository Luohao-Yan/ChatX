import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { organizationAPI, type Organization } from '@/services/api/organization'
import { toast } from 'sonner'

const organizationSchema = z.object({
  name: z.string().min(1, '组织名称不能为空').max(100, '组织名称不能超过100个字符'),
  display_name: z.string().optional(),
  description: z.string().optional(),
  parent_id: z.string().optional(),
  logo_url: z.string().url('请输入有效的URL').optional().or(z.literal('')),
})

type OrganizationFormData = z.infer<typeof organizationSchema>

interface OrganizationFormProps {
  organization?: Organization
  parentOrganizations: Organization[]
  onSuccess: () => void
  onCancel: () => void
}

export function OrganizationForm({
  organization,
  parentOrganizations,
  onSuccess,
  onCancel,
}: OrganizationFormProps) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!organization

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
      display_name: organization?.display_name || '',
      description: organization?.description || '',
      parent_id: organization?.parent_id || 'root',
      logo_url: organization?.logo_url || '',
    },
  })

  const onSubmit = async (data: OrganizationFormData) => {
    try {
      setLoading(true)
      
      // 将"root"值转换为空字符串，表示无上级组织
      const submitData = {
        ...data,
        parent_id: data.parent_id === 'root' ? '' : data.parent_id
      }
      
      if (isEditing) {
        await organizationAPI.updateOrganization(organization.id, submitData)
        toast.success('组织更新成功')
      } else {
        await organizationAPI.createOrganization(submitData)
        toast.success('组织创建成功')
      }
      
      onSuccess()
    } catch (error) {
      console.error('组织操作失败:', error)
      toast.error(isEditing ? '组织更新失败' : '组织创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>组织名称 *</FormLabel>
                <FormControl>
                  <Input placeholder="请输入组织名称" {...field} />
                </FormControl>
                <FormDescription>
                  组织的正式名称，用于系统内部标识
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>显示名称</FormLabel>
                <FormControl>
                  <Input placeholder="请输入显示名称（可选）" {...field} />
                </FormControl>
                <FormDescription>
                  在界面上显示的名称，如果为空则使用组织名称
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parent_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>上级组织</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择上级组织（可选）" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="root">无上级组织（根组织）</SelectItem>
                    {parentOrganizations.map((org) => (
                      <SelectItem 
                        key={org.id} 
                        value={org.id}
                        disabled={org.id === organization?.id} // 防止选择自己作为父组织
                      >
                        {'  '.repeat(org.level)}{org.display_name || org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  选择此组织的上级组织，不选则为根组织
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>组织描述</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="请输入组织描述（可选）"
                    className="min-h-[80px]"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  描述组织的职能、使命或其他相关信息
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logo_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>组织Logo URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/logo.png" {...field} />
                </FormControl>
                <FormDescription>
                  组织Logo的URL地址（可选）
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '处理中...' : (isEditing ? '更新组织' : '创建组织')}
          </Button>
        </div>
      </form>
    </Form>
  )
}