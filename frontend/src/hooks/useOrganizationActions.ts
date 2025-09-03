/**
 * Organization Actions Management Hook
 * 组织操作管理应用层逻辑
 */

import { useState, useCallback } from 'react'
import { Organization } from '@/services/api/organization'

export function useOrganizationActions() {
  // 对话框状态管理
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null)
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null)
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false)

  // 打开创建对话框
  const openCreateDialog = useCallback(() => {
    setIsAddDialogOpen(true)
  }, [])

  // 关闭创建对话框
  const closeCreateDialog = useCallback(() => {
    setIsAddDialogOpen(false)
  }, [])

  // 打开编辑对话框
  const openEditDialog = useCallback((org: Organization) => {
    setEditingOrg(org)
  }, [])

  // 关闭编辑对话框
  const closeEditDialog = useCallback(() => {
    setEditingOrg(null)
  }, [])

  // 打开删除确认对话框
  const openDeleteDialog = useCallback((org: Organization) => {
    setDeletingOrg(org)
  }, [])

  // 关闭删除确认对话框
  const closeDeleteDialog = useCallback(() => {
    setDeletingOrg(null)
  }, [])

  // 打开查看对话框
  const openViewDialog = useCallback((org: Organization) => {
    setViewingOrg(org)
  }, [])

  // 关闭查看对话框
  const closeViewDialog = useCallback(() => {
    setViewingOrg(null)
  }, [])

  // 打开回收站
  const openRecycleBin = useCallback(() => {
    setIsRecycleBinOpen(true)
  }, [])

  // 关闭回收站
  const closeRecycleBin = useCallback(() => {
    setIsRecycleBinOpen(false)
  }, [])

  return {
    // 状态
    isAddDialogOpen,
    editingOrg,
    deletingOrg,
    viewingOrg,
    isRecycleBinOpen,
    
    // 创建操作
    openCreateDialog,
    closeCreateDialog,
    
    // 编辑操作
    openEditDialog,
    closeEditDialog,
    
    // 删除操作
    openDeleteDialog,
    closeDeleteDialog,
    
    // 查看操作
    openViewDialog,
    closeViewDialog,
    
    // 回收站操作
    openRecycleBin,
    closeRecycleBin
  }
}