import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { HeaderActions } from '@/components/layout/header-actions'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  IconUpload,
  IconPhoto,
  IconTrash,
  IconEye,
  IconSettings,
  IconRefresh,
  IconRestore,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { useSystemLogo } from '@/hooks/useSystemLogo'
// import { SystemConfigAPI, SystemLogo } from '@/services/api/system-config'

// 临时类型定义，避免导入问题
interface SystemLogo {
  id: string
  name: string
  url: string
  type: 'default' | 'custom'
  isActive: boolean
  uploadedAt?: string
  size?: number
}

export default function SystemConfig() {
  const { updateLogo: updateSystemLogo } = useSystemLogo()
  const [logos, setLogos] = useState<SystemLogo[]>([
    {
      id: 'default-1',
      name: '现代动态',
      url: '/logo.svg',
      type: 'default',
      isActive: true,
    },
    {
      id: 'default-2',
      name: '极简风格',
      url: '/logo-alt.svg',
      type: 'default',
      isActive: false,
    },
    {
      id: 'default-3',
      name: '科技蓝调',
      url: '/logo-tech.svg',
      type: 'default',
      isActive: false,
    },
    {
      id: 'default-4',
      name: '优雅金色',
      url: '/logo-elegant.svg',
      type: 'default',
      isActive: false,
    },
  ])
  const [loading, setLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewLogo, setPreviewLogo] = useState<SystemLogo | null>(null)
  const [deleteConfirmLogo, setDeleteConfirmLogo] = useState<SystemLogo | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 刷新图标列表
  const loadLogos = useCallback(async () => {
    try {
      setLoading(true)
      // 模拟加载延迟
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 刷新时重新设置数据
      setLogos([
        {
          id: 'default-1',
          name: '现代动态',
          url: '/logo.svg',
          type: 'default',
          isActive: true,
        },
        {
          id: 'default-2',
          name: '极简风格',
          url: '/logo-alt.svg',
          type: 'default',
          isActive: false,
        },
        {
          id: 'default-3',
          name: '科技蓝调',
          url: '/logo-tech.svg',
          type: 'default',
          isActive: false,
        },
        {
          id: 'default-4',
          name: '优雅金色',
          url: '/logo-elegant.svg',
          type: 'default',
          isActive: false,
        },
      ])
    } catch (error) {
      console.error('Failed to load logos:', error)
      toast.error('加载图标列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 验证文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片文件大小不能超过 2MB')
      return
    }

    try {
      setIsUploading(true)

      // 模拟上传过程
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 创建预览URL
      const previewUrl = URL.createObjectURL(file)

      // 创建新的logo对象
      const newLogo: SystemLogo = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: previewUrl,
        type: 'custom',
        isActive: false,
        uploadedAt: new Date().toISOString(),
        size: file.size,
      }

      setLogos(prev => [...prev, newLogo])
      setUploadDialogOpen(false)
      toast.success('图标上传成功，如需使用请点击"设为当前"')
      
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('图标上传失败')
    } finally {
      setIsUploading(false)
    }
  }

  // 设置为当前图标
  const handleSetActive = async (logo: SystemLogo) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setLogos(prev => 
        prev.map(l => ({
          ...l,
          isActive: l.id === logo.id
        }))
      )
      
      // 更新系统Logo缓存，这会立即影响登录页面等地方的显示
      updateSystemLogo(logo)
      
      toast.success(`已设置 "${logo.name}" 为系统图标`)
    } catch (error) {
      console.error('Set active failed:', error)
      toast.error('设置图标失败')
    }
  }

  // 删除自定义图标
  const handleDeleteLogo = async (logo: SystemLogo) => {
    if (logo.type === 'default') {
      toast.error('默认图标不能删除')
      return
    }

    if (logo.isActive) {
      toast.error('当前使用的图标不能删除，请先设置其他图标')
      return
    }

    try {
      // 模拟API删除调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setLogos(prev => prev.filter(l => l.id !== logo.id))
      setDeleteConfirmLogo(null)
      toast.success('图标删除成功')
      
      // 释放预览URL（如果是本地预览URL）
      if (logo.url.startsWith('blob:')) {
        URL.revokeObjectURL(logo.url)
      }
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('删除图标失败')
    }
  }

  // 刷新图标列表
  const handleRefresh = () => {
    loadLogos()
  }

  // 恢复默认Logo
  const handleResetToDefault = async () => {
    try {
      const defaultLogo = logos.find(logo => logo.id === 'default-1')
      if (!defaultLogo) {
        toast.error('未找到默认图标')
        return
      }

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 设置默认图标为当前
      setLogos(prev => 
        prev.map(l => ({
          ...l,
          isActive: l.id === 'default-1'
        }))
      )
      
      // 更新系统Logo缓存
      updateSystemLogo(defaultLogo)
      
      toast.success('已恢复为默认图标')
    } catch (error) {
      console.error('Reset to default failed:', error)
      toast.error('恢复默认失败')
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const activeLogo = logos.find(logo => logo.isActive)
  const customLogos = logos.filter(logo => logo.type === 'custom')

  return (
    <>
      <Header>
        <div className="flex items-center gap-4">
          <Breadcrumb
            items={[
              { label: '管理中心', href: '/management' },
              { label: '系统管理', href: '/management/system' },
              { label: '系统配置', href: '/management/system/config' }
            ]}
          />
        </div>
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
        {/* 当前系统图标 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <IconPhoto className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle>当前系统图标</CardTitle>
                  <CardDescription>
                    当前在登录页面和应用头部显示的系统图标
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeLogo && (
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-background">
                  <img
                    src={activeLogo.url}
                    alt={activeLogo.name}
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-logo.svg'
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{activeLogo.name}</span>
                    <Badge variant="default" className="text-xs">当前使用</Badge>
                    {activeLogo.type === 'custom' && (
                      <Badge variant="secondary" className="text-xs">自定义</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeLogo.type === 'default' ? '系统默认图标' : 
                     activeLogo.uploadedAt ? `上传于 ${new Date(activeLogo.uploadedAt).toLocaleDateString()}` : ''
                    }
                    {activeLogo.size && ` · ${formatFileSize(activeLogo.size)}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewLogo(activeLogo)}
                >
                  <IconEye className="w-4 h-4 mr-2" />
                  预览
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 图标管理 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <IconSettings className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle>图标管理</CardTitle>
                  <CardDescription>
                    管理系统图标，支持上传自定义图标或选择预设图标
                  </CardDescription>
                </div>
              </div>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <IconUpload className="w-4 h-4 mr-2" />
                    上传图标
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>上传自定义图标</DialogTitle>
                    <DialogDescription>
                      支持 PNG, JPG, SVG 格式，文件大小不超过 2MB
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="logo-upload">选择图标文件</Label>
                      <Input
                        id="logo-upload"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="mt-2"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• 推荐尺寸：128x128px 或更高分辨率的正方形图片</p>
                      <p>• 支持透明背景的 PNG 或 SVG 格式</p>
                      <p>• 图标将自动缩放以适应不同显示场景</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="border rounded-lg p-4 animate-pulse">
                    <div className="aspect-square border-2 border-dashed border-gray-200 rounded-lg mb-3 bg-gray-100" />
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="flex gap-2 pt-2">
                        <div className="h-8 bg-gray-200 rounded flex-1" />
                        <div className="h-8 w-8 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {logos.map((logo) => (
                <div
                  key={logo.id}
                  className={`relative border rounded-lg p-4 transition-all hover:shadow-sm ${
                    logo.isActive ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  {/* 图标预览 */}
                  <div className="aspect-square border-2 border-dashed border-border rounded-lg mb-3 flex items-center justify-center bg-background">
                    <img
                      src={logo.url}
                      alt={logo.name}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-logo.svg'
                      }}
                    />
                  </div>

                  {/* 图标信息 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{logo.name}</span>
                      {logo.isActive && (
                        <Badge variant="default" className="text-xs">当前</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {logo.type === 'default' ? '系统预设' : '自定义'}
                      </Badge>
                      {logo.size && (
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(logo.size)}
                        </Badge>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 pt-2">
                      {!logo.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActive(logo)}
                          className="flex-1"
                        >
                          设为当前
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewLogo(logo)}
                      >
                        <IconEye className="w-4 h-4" />
                      </Button>
                      {logo.type === 'custom' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmLogo(logo)}
                          className="text-destructive hover:text-destructive"
                        >
                          <IconTrash className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}

            {/* 统计信息和操作 */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  共 {logos.length} 个图标（{customLogos.length} 个自定义）
                </span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetToDefault}
                    disabled={loading}
                  >
                    <IconRestore className="w-4 h-4 mr-2" />
                    恢复默认
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
                    <IconRefresh className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>

      {/* 预览对话框 */}
      <Dialog open={!!previewLogo} onOpenChange={() => setPreviewLogo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>图标预览</DialogTitle>
            <DialogDescription>
              {previewLogo?.name} - {previewLogo?.type === 'default' ? '系统预设' : '自定义'}
            </DialogDescription>
          </DialogHeader>
          {previewLogo && (
            <div className="space-y-4">
              {/* 大尺寸预览 */}
              <div className="flex justify-center p-6 border-2 border-dashed border-border rounded-lg bg-muted/30">
                <img
                  src={previewLogo.url}
                  alt={previewLogo.name}
                  className="w-24 h-24 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-logo.svg'
                  }}
                />
              </div>
              
              {/* 不同尺寸预览 */}
              <div className="space-y-3">
                <p className="text-sm font-medium">不同尺寸预览效果：</p>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">大图标 (64px)</p>
                    <img src={previewLogo.url} alt="" className="w-16 h-16 object-contain" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">中图标 (32px)</p>
                    <img src={previewLogo.url} alt="" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">小图标 (16px)</p>
                    <img src={previewLogo.url} alt="" className="w-4 h-4 object-contain" />
                  </div>
                </div>
              </div>

              {/* 详细信息 */}
              {previewLogo.type === 'custom' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">上传时间：</span>
                    <span>{previewLogo.uploadedAt ? new Date(previewLogo.uploadedAt).toLocaleString() : '-'}</span>
                  </div>
                  {previewLogo.size && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">文件大小：</span>
                      <span>{formatFileSize(previewLogo.size)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteConfirmLogo} onOpenChange={() => setDeleteConfirmLogo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除图标</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除图标 "<strong>{deleteConfirmLogo?.name}</strong>" 吗？
              此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmLogo && handleDeleteLogo(deleteConfirmLogo)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}