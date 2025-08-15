import {
  IconShield,
  IconUsersGroup,
  IconUserShield,
  IconUser,
} from '@tabler/icons-react'
import { UserStatus } from './schema'

export const callTypes = new Map<UserStatus, string>([
  ['active', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['inactive', 'bg-neutral-300/40 border-neutral-300'],
  ['pending', 'bg-sky-200/40 text-sky-900 dark:text-sky-100 border-sky-300'],
  [
    'suspended',
    'bg-destructive/10 dark:bg-destructive/50 text-destructive dark:text-primary border-destructive/10',
  ],
  ['deleted', 'bg-red-100/30 text-red-900 dark:text-red-200 border-red-200'],
])

export const userTypes = [
  {
    label: '超级管理员',
    value: 'superadmin',
    icon: IconShield,
  },
  {
    label: '管理员',
    value: 'admin',
    icon: IconUserShield,
  },
  {
    label: '组长',
    value: 'manager',
    icon: IconUsersGroup,
  },
  {
    label: '普通用户',
    value: 'user',
    icon: IconUser,
  },
] as const
