import { BaseEntity } from '../common'

export interface User extends BaseEntity {
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  avatar_url?: string
  phone?: string
  last_login?: string
  roles?: string[]
  permissions?: string[]
}

export interface UserProfile {
  id: number
  email: string
  username: string
  full_name?: string
  avatar_url?: string
  phone?: string
  bio?: string
  location?: string
  website?: string
  social_links?: {
    twitter?: string
    github?: string
    linkedin?: string
  }
  preferences?: {
    language: string
    timezone: string
    theme: string
    notifications: {
      email: boolean
      push: boolean
      marketing: boolean
    }
  }
}

export interface UserSession {
  id: number
  device_id: string
  device_info?: {
    browser?: string
    os?: string
    ip?: string
    location?: string
  }
  last_activity: string
  expires_at: string
  is_current: boolean
  created_at: string
}

export interface LoginCredentials {
  email: string
  password: string
  remember_me?: boolean
  device_info?: unknown
}

export interface RegisterData {
  email: string
  username: string
  password: string
  full_name?: string
  terms_accepted: boolean
  newsletter_subscribed?: boolean
}

export interface PasswordResetData {
  email: string
  verification_code: string
  new_password: string
}

export interface UserPreferences {
  language: string
  timezone: string
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    marketing: boolean
    chat_mentions: boolean
    task_updates: boolean
    document_updates: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'private' | 'friends'
    activity_visibility: boolean
    search_visibility: boolean
  }
}

export type UserRole = 'admin' | 'user' | 'moderator' | 'viewer'
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending'