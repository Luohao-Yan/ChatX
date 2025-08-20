/**
 * OAuth相关类型定义
 */

export interface OAuthProvider {
  name: string;
  display_name: string;
}

export interface OAuthProvidersResponse {
  providers: OAuthProvider[];
  enabled: boolean;
}

export interface OAuthAuthorizationResponse {
  authorization_url: string;
  state: string;
  provider: string;
}

export interface OAuthCallbackResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    email: string;
    is_new_user: boolean;
    is_active?: boolean;
    is_verified?: boolean;
    created_at?: string;
  };
  redirect_url?: string;
}

export interface OAuthAccount {
  id: string;
  provider: string;
  display_name?: string;
  avatar_url?: string;
  is_primary: boolean;
  created_at: string;
}

export interface OAuthAccountsResponse {
  accounts: OAuthAccount[];
}

export interface OAuthBindRequest {
  code: string;
  state: string;
}

export interface OAuthUnbindResponse {
  message: string;
}

export interface OAuthErrorResponse {
  error_code: string;
  message: string;
  details?: Record<string, any>;
}

export interface OAuthLoginResult {
  success: boolean;
  data?: OAuthCallbackResponse;
  error?: string;
}

export interface OAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}