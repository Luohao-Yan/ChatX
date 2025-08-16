import { z } from 'zod'

// 与后端模型保持一致的用户状态
const userStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('pending'),
  z.literal('suspended'),
  z.literal('deleted'),
])
export type UserStatus = z.infer<typeof userStatusSchema>

// URL 结构
const urlSchema = z.object({
  value: z.string(),
})

// 用户数据结构 - 与后端 User schema 保持一致
const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  full_name: z.string().optional(),
  is_active: z.boolean(),
  is_verified: z.boolean(),
  is_superuser: z.boolean().optional(),
  phone: z.string().optional(),
  avatar_url: z.string().optional(),
  bio: z.string().optional(),
  urls: z.array(urlSchema).optional(),
  date_of_birth: z.string().datetime().optional(),
  preferred_language: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  last_login: z.string().datetime().optional(),
  last_activity: z.string().datetime().optional(),
  deleted_at: z.string().datetime().optional(),
  deleted_by: z.string().optional(),
  is_online: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
})
export type User = z.infer<typeof userSchema>

// 用户创建数据结构
export const userCreateSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  username: z.string()
    .min(3, '用户名至少需要3个字符')
    .max(50, '用户名不能超过50个字符')
    .refine((val) => /^[a-zA-Z0-9_]+$/.test(val), {
      message: '用户名只能包含字母、数字和下划线'
    }),
  password: z.string().min(8, '密码长度至少8位'),
  full_name: z.string().min(1, '真实姓名不能为空'),
  is_active: z.boolean().default(true),
  is_verified: z.boolean().default(false),
  phone: z.string().optional(),
  bio: z.string().optional(),
  preferred_language: z.string().optional(),
})
export type UserCreate = z.infer<typeof userCreateSchema>

// 用户更新数据结构
export const userUpdateSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址').optional(),
  username: z.string()
    .min(3, '用户名至少需要3个字符')
    .max(50, '用户名不能超过50个字符')
    .refine((val) => /^[a-zA-Z0-9_]+$/.test(val), {
      message: '用户名只能包含字母、数字和下划线'
    })
    .optional(),
  password: z.string().min(8, '密码长度至少8位').optional(),
  full_name: z.string().optional(),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  phone: z.string().optional(),
  avatar_url: z.string().optional(),
  bio: z.string().optional(),
  preferred_language: z.string().optional(),
})
export type UserUpdate = z.infer<typeof userUpdateSchema>

export const userListSchema = z.array(userSchema)
