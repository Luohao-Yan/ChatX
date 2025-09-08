/**
 * 组织机构管理路由页面
 * 使用重构后的DDD架构和新的页面组件
 */

import { createFileRoute } from '@tanstack/react-router'
import { OrganizationsPage } from '@/features/knowledge/pages'

export const Route = createFileRoute('/_authenticated/knowledge/organizations')({
  component: OrganizationsPage,
})