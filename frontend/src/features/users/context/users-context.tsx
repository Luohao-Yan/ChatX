import React, { useState, useEffect, useCallback } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { User, UserCreate, UserUpdate } from '../data/schema'
import { usersApi } from '../services/users-api'
import { toast } from 'sonner'

type UsersDialogType = 'invite' | 'add' | 'create' | 'edit' | 'delete'

interface UsersContextType {
  // Dialog state
  open: UsersDialogType | null
  setOpen: (str: UsersDialogType | null) => void
  currentRow: User | null
  setCurrentRow: React.Dispatch<React.SetStateAction<User | null>>
  
  // Users data
  users: User[]
  loading: boolean
  error: string | null
  
  // Actions
  fetchUsers: () => Promise<void>
  createUser: (userData: UserCreate) => Promise<void>
  updateUser: (id: number, userData: UserUpdate) => Promise<void>
  deleteUser: (id: number) => Promise<void>
  refreshUsers: () => Promise<void>
}

const UsersContext = React.createContext<UsersContextType | null>(null)

interface Props {
  children: React.ReactNode
}

export default function UsersProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<UsersDialogType>(null)
  const [currentRow, setCurrentRow] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 直接使用单例实例

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await usersApi.getUsers()
      setUsers(data)
    } catch (err) {
      const errorMessage = '获取用户列表失败，请稍后重试'
      setError(errorMessage)
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 创建用户
  const createUser = useCallback(async (userData: UserCreate) => {
    try {
      const newUser = await usersApi.createUser(userData)
      setUsers(prev => [newUser, ...prev])
      setOpen(null)
      toast.success(`用户 ${userData.username} 创建成功`)
    } catch (err) {
      const errorMessage = '创建用户失败'
      toast.error(errorMessage)
      console.error('Failed to create user:', err)
      throw err // 重新抛出错误让表单处理
    }
  }, [setOpen])

  // 更新用户
  const updateUser = useCallback(async (id: number, userData: UserUpdate) => {
    try {
      const updatedUser = await usersApi.updateUser(id, userData)
      setUsers(prev => prev.map(user => 
        user.id === id ? updatedUser : user
      ))
      setCurrentRow(null)
      setOpen(null)
      toast.success(`用户 ${updatedUser.username} 更新成功`)
    } catch (err) {
      const errorMessage = '更新用户失败'
      toast.error(errorMessage)
      console.error('Failed to update user:', err)
      throw err // 重新抛出错误让表单处理
    }
  }, [setOpen])

  // 删除用户
  const deleteUser = useCallback(async (id: number) => {
    try {
      await usersApi.deleteUser(id)
      const deletedUser = users.find(user => user.id === id)
      setUsers(prev => prev.filter(user => user.id !== id))
      setCurrentRow(null)
      setOpen(null)
      toast.success(`用户 ${deletedUser?.username || 'Unknown'} 已删除`)
    } catch (err) {
      const errorMessage = '删除用户失败'
      toast.error(errorMessage)
      console.error('Failed to delete user:', err)
      throw err
    }
  }, [users, setOpen])

  // 刷新用户列表
  const refreshUsers = useCallback(async () => {
    await fetchUsers()
  }, [fetchUsers])

  // 初始化时获取用户列表
  useEffect(() => {
    let mounted = true
    
    const loadUsers = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await usersApi.getUsers()
        if (mounted) {
          setUsers(data)
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = '获取用户列表失败，请稍后重试'
          setError(errorMessage)
          console.error('Failed to fetch users:', err)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    loadUsers()
    
    return () => {
      mounted = false
    }
  }, []) // 移除依赖，只在组件挂载时执行一次

  const value: UsersContextType = {
    // Dialog state
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    
    // Users data
    users,
    loading,
    error,
    
    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers,
  }

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUsers = () => {
  const usersContext = React.useContext(UsersContext)

  if (!usersContext) {
    throw new Error('useUsers has to be used within <UsersProvider>')
  }

  return usersContext
}
