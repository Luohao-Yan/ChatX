import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  IconUpload, 
  IconDownload, 
  IconFileSpreadsheet,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconLoader2
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { http } from '@/services/http'

interface BatchImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportSuccess?: () => void
}

interface ImportResult {
  total: number
  success: number
  failed: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
  warnings: Array<{
    row: number
    message: string
  }>
}

export function BatchImportDialog({ open, onOpenChange, onImportSuccess }: BatchImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('请选择Excel文件（.xlsx或.xls格式）')
      return
    }

    // 验证文件大小（限制为10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小不能超过10MB')
      return
    }

    setSelectedFile(file)
    setImportResult(null)
  }

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true)
      
      // 使用HTTP客户端的stream方法下载二进制文件
      const stream = await http.stream({
        url: '/v1/users/import/template/download',
        method: 'GET'
      })

      if (!stream) {
        throw new Error('服务器未返回文件流，请稍后重试')
      }

      // 读取流数据
      const reader = stream.getReader()
      const chunks: Uint8Array[] = []
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }

      // 验证是否获取到数据
      if (chunks.length === 0) {
        throw new Error('服务器返回的文件为空，请检查服务器状态')
      }

      // 合并所有数据块
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      
      // 验证文件大小（Excel文件至少应该有几KB）
      if (totalLength < 1024) {
        throw new Error('服务器返回的文件大小异常，可能文件生成失败')
      }

      const result = new Uint8Array(totalLength)
      let position = 0
      
      for (const chunk of chunks) {
        result.set(chunk, position)
        position += chunk.length
      }

      // 验证文件头（Excel文件应该以特定字节开头）
      // XLSX文件开头应该是 PK (ZIP文件格式)
      if (result.length >= 2 && !(result[0] === 0x50 && result[1] === 0x4B)) {
        console.warn('Warning: 文件可能不是有效的Excel格式')
        // 不抛出错误，但给出警告，因为可能是其他格式但仍然有效
      }

      // 创建blob和下载链接
      const blob = new Blob([result], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '用户批量导入模板.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`模板下载成功（${(totalLength / 1024).toFixed(1)} KB）`)
    } catch (error) {
      console.error('Download template error:', error)
      toast.error(error instanceof Error ? error.message : '下载模板失败，请稍后重试')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('请先选择要导入的Excel文件')
      return
    }

    try {
      setImporting(true)
      setImportResult(null)

      const formData = new FormData()
      formData.append('file', selectedFile)

      // 使用标准HTTP组件处理文件上传
      const response = await http.request({
        url: '/v1/users/import/upload',
        method: 'POST',
        body: formData
        // 不设置Content-Type头，让HTTP客户端和浏览器自动处理multipart/form-data
      })

      const result = response.data as ImportResult

      setImportResult(result)
      
      if (result.success > 0) {
        toast.success(`成功导入 ${result.success} 个用户`)
        onImportSuccess?.()
      }
      
      if (result.failed > 0) {
        toast.warning(`有 ${result.failed} 个用户导入失败，请查看详细信息`)
      }

    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(error.message || '导入失败，请稍后重试')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <IconFileSpreadsheet size={20} />
            批量导入用户
          </DialogTitle>
          <DialogDescription className="text-sm">
            支持通过Excel文件批量导入用户，请先下载模板并按照格式填写数据
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 步骤指引 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">导入步骤</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="text-sm">下载Excel模板</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm">按照模板格式填写用户数据</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm">上传填写好的Excel文件</span>
              </div>
            </CardContent>
          </Card>

          {/* 模板下载 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. 下载模板</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-dashed border-border rounded-lg bg-muted/50 gap-4">
                <div className="flex items-center gap-3">
                  <IconFileSpreadsheet size={32} className="text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">用户批量导入模板.xlsx</div>
                    <div className="text-sm text-muted-foreground">
                      包含必填字段说明和示例数据
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="w-full md:w-auto flex-shrink-0"
                >
                  {downloadingTemplate && <IconLoader2 size={16} className="mr-2 animate-spin" />}
                  <IconDownload size={16} className="mr-2" />
                  下载模板
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 文件上传 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. 上传文件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <IconFileSpreadsheet size={24} className="text-primary" />
                      <span className="font-medium">{selectedFile.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      文件大小: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto"
                      >
                        重新选择
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="w-full sm:w-auto"
                      >
                        移除文件
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <IconUpload size={48} className="mx-auto text-muted-foreground" />
                    <div>
                      <div className="text-lg font-medium">选择Excel文件</div>
                      <div className="text-sm text-muted-foreground">
                        支持 .xlsx 和 .xls 格式，文件大小不超过10MB
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto"
                    >
                      <IconUpload size={16} className="mr-2" />
                      选择文件
                    </Button>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="flex justify-center">
                  <Button 
                    onClick={handleImport}
                    disabled={importing}
                    className="w-full sm:w-auto min-w-[120px]"
                  >
                    {importing && <IconLoader2 size={16} className="mr-2 animate-spin" />}
                    {importing ? '导入中...' : '开始导入'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 导入结果 */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {importResult.failed === 0 ? (
                    <IconCheck className="text-emerald-600 dark:text-emerald-400" size={20} />
                  ) : (
                    <IconAlertCircle className="text-amber-600 dark:text-amber-400" size={20} />
                  )}
                  导入结果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 统计信息 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-foreground">
                      {importResult.total}
                    </div>
                    <div className="text-sm text-muted-foreground">总计</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {importResult.success}
                    </div>
                    <div className="text-sm text-muted-foreground">成功</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-destructive">
                      {importResult.failed}
                    </div>
                    <div className="text-sm text-muted-foreground">失败</div>
                  </div>
                </div>

                {/* 成功率 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>成功率</span>
                    <span>{Math.round((importResult.success / importResult.total) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(importResult.success / importResult.total) * 100} 
                    className="h-2"
                  />
                </div>

                {/* 错误详情 */}
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive flex items-center gap-2">
                      <IconX size={16} />
                      错误详情 ({importResult.errors.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm p-2 bg-destructive/10 border border-destructive/20 rounded">
                          <Badge variant="destructive" className="mr-2">第{error.row}行</Badge>
                          <span className="font-medium">{error.field}:</span> {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 警告信息 */}
                {importResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <IconAlertCircle size={16} />
                      警告信息 ({importResult.warnings.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.warnings.map((warning, index) => (
                        <div key={index} className="text-sm p-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 rounded">
                          <Badge variant="secondary" className="mr-2">第{warning.row}行</Badge>
                          {warning.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <div className="flex flex-col md:flex-row justify-end gap-3">
          <Button variant="outline" onClick={handleClose} className="w-full md:w-auto">
            关闭
          </Button>
          {importResult && importResult.success > 0 && (
            <Button onClick={handleReset} className="w-full md:w-auto">
              继续导入
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}