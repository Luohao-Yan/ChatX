import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { IconPlus, IconTrash, IconRefresh } from '@tabler/icons-react'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useState } from 'react'

const createMcpConnectionSchema = (t: any) => z.object({
  name: z.string().min(1, t('mcp.validation.nameRequired')),
  endpoint: z.string().url(t('mcp.validation.endpointInvalid')),
  description: z.string().optional(),
})

type McpConnectionValues = {
  name: string
  endpoint: string
  description?: string
}

// 模拟数据
const initialConnections = [
  {
    id: '1',
    name: 'Claude Desktop',
    endpoint: 'https://api.anthropic.com/mcp',
    description: 'Claude Desktop MCP 连接',
    status: 'connected' as const,
    lastSync: '2024-01-15 10:30:00'
  },
  {
    id: '2', 
    name: 'Local Server',
    endpoint: 'http://localhost:3001/mcp',
    description: '本地开发服务器',
    status: 'disconnected' as const,
    lastSync: '2024-01-14 16:45:00'
  }
]

export function McpForm() {
  const { t } = useTranslation()
  const [connections, setConnections] = useState(initialConnections)
  const [isAddingNew, setIsAddingNew] = useState(false)

  const mcpConnectionSchema = createMcpConnectionSchema(t)

  const form = useForm<McpConnectionValues>({
    resolver: zodResolver(mcpConnectionSchema),
    defaultValues: {
      name: '',
      endpoint: '',
      description: '',
    },
  })

  const onSubmit = (data: McpConnectionValues) => {
    const newConnection = {
      id: Date.now().toString(),
      ...data,
      description: data.description || '',
      status: 'disconnected' as const,
      lastSync: new Date().toLocaleString('zh-CN')
    }
    setConnections(prev => [...prev, newConnection])
    form.reset()
    setIsAddingNew(false)
  }

  const handleDelete = (id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id))
  }

  const handleTest = async (id: string) => {
    // 模拟测试连接
    setConnections(prev => prev.map(conn => 
      conn.id === id 
        ? { ...conn, status: conn.status === 'connected' ? 'disconnected' : 'connected' }
        : conn
    ))
  }

  return (
    <div className="space-y-6">
      {/* 连接列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('mcp.connections')}</CardTitle>
              <CardDescription>
                {t('mcp.connectionsDescription')}
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddingNew(true)}
              size="sm"
              disabled={isAddingNew}
            >
              <IconPlus size={16} className="mr-2" />
              {t('mcp.addConnection')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('mcp.table.name')}</TableHead>
                  <TableHead>{t('mcp.table.endpoint')}</TableHead>
                  <TableHead>{t('mcp.table.status')}</TableHead>
                  <TableHead>{t('mcp.table.lastSync')}</TableHead>
                  <TableHead >{t('mcp.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{connection.name}</div>
                        {connection.description && (
                          <div className="text-sm text-muted-foreground">
                            {connection.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {connection.endpoint}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={connection.status === 'connected' ? 'default' : 'secondary'}
                      >
                        {connection.status === 'connected' ? t('mcp.connected') : t('mcp.disconnected')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {connection.lastSync}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(connection.id)}
                        >
                          <IconRefresh size={14} className="mr-1" />
                          {t('mcp.testConnection')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(connection.id)}
                        >
                          <IconTrash size={14} className="mr-1" />
                          {t('mcp.deleteConnection')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 添加新连接表单 */}
      {isAddingNew && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>{t('mcp.addNewConnection')}</CardTitle>
              <CardDescription>
                {t('mcp.configureConnection')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('mcp.connectionName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('mcp.connectionNamePlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          {t('mcp.connectionNameDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endpoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('mcp.endpoint')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t('mcp.endpointPlaceholder')} 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          {t('mcp.endpointDescription')}
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
                        <FormLabel>{t('mcp.description')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('mcp.descriptionPlaceholder')}
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('mcp.descriptionDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button type="submit">{t('mcp.addConnection')}</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingNew(false)
                        form.reset()
                      }}
                    >
                      {t('mcp.cancel')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}