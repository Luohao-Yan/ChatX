/**
 * OAuth相关的React Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { oauthService } from '../services/oauth.service';
import { useAuthStore } from '@/stores/auth';
import type {
  OAuthProvider,
  OAuthAccount,
  OAuthCallbackParams,
  OAuthLoginResult,
} from '../types/oauth.types';

/**
 * OAuth提供商管理Hook
 */
export function useOAuthProviders() {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oauthEnabled, setOauthEnabled] = useState(false);

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await oauthService.getProviders();
      setProviders(result.providers);
      setOauthEnabled(result.enabled);
    } catch (err: any) {
      setError(err?.response?.data?.detail || '加载OAuth提供商失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    providers,
    loading,
    error,
    oauthEnabled,
    refetch: loadProviders,
  };
}

/**
 * OAuth登录Hook
 */
export function useOAuthLogin() {
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const login = useCallback(async (provider: string, redirectUrl?: string) => {
    try {
      setLoading(prev => ({ ...prev, [provider]: true }));

      const result = await oauthService.getAuthorizationUrl(provider, redirectUrl);
      
      // 跳转到OAuth授权页面
      window.location.href = result.authorization_url;
      
      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || `${provider}登录失败`;
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(prev => ({ ...prev, [provider]: false }));
    }
  }, []);

  return {
    login,
    loading,
  };
}

/**
 * OAuth回调处理Hook
 */
export function useOAuthCallback() {
  const [processing, setProcessing] = useState(false);
  const { setUserInfo, setTokens } = useAuthStore();
  const navigate = useNavigate();
  
  const handleCallback = useCallback(async (
    provider: string,
    params: OAuthCallbackParams
  ): Promise<OAuthLoginResult> => {
    if (params.error) {
      const errorMessage = params.error_description || params.error;
      toast.error(`OAuth登录失败: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }

    if (!params.code || !params.state) {
      const errorMessage = '缺少必要的回调参数';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }

    try {
      setProcessing(true);

      const result = await oauthService.handleCallback(
        provider,
        params.code,
        params.state
      );

      // 保存认证信息
      setTokens(result.access_token, result.refresh_token);
      setUserInfo({
        ...result.user,
        is_active: result.user.is_active ?? true,
        is_verified: result.user.is_verified ?? true,
        created_at: result.user.created_at ?? new Date().toISOString()
      });

      // 显示成功消息
      if (result.user.is_new_user) {
        toast.success('欢迎！您的账号已创建成功');
      } else {
        toast.success('登录成功');
      }

      // 重定向
      if (result.redirect_url) {
        window.location.href = result.redirect_url;
      } else {
        navigate({ to: '/' });
      }

      return { success: true, data: result };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'OAuth登录处理失败';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setProcessing(false);
    }
  }, [setUserInfo, setTokens, navigate]);

  return {
    handleCallback,
    processing,
  };
}

/**
 * OAuth账号管理Hook
 */
export function useOAuthAccounts() {
  const [accounts, setAccounts] = useState<OAuthAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await oauthService.getAccounts();
      setAccounts(result.accounts);
    } catch (err: any) {
      setError(err?.response?.data?.detail || '加载OAuth账号失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const bindAccount = useCallback(async (provider: string, code: string, state: string) => {
    try {
      await oauthService.bindAccount(provider, { code, state });
      toast.success(`${provider}账号绑定成功`);
      await loadAccounts(); // 重新加载账号列表
      return true;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || '账号绑定失败';
      toast.error(errorMessage);
      return false;
    }
  }, [loadAccounts]);

  const unbindAccount = useCallback(async (provider: string) => {
    try {
      await oauthService.unbindAccount(provider);
      toast.success(`${provider}账号解绑成功`);
      await loadAccounts(); // 重新加载账号列表
      return true;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || '账号解绑失败';
      toast.error(errorMessage);
      return false;
    }
  }, [loadAccounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return {
    accounts,
    loading,
    error,
    bindAccount,
    unbindAccount,
    refetch: loadAccounts,
  };
}

/**
 * 综合OAuth Hook
 */
export function useOAuth() {
  const providers = useOAuthProviders();
  const login = useOAuthLogin();
  const callback = useOAuthCallback();
  const accounts = useOAuthAccounts();

  return {
    providers,
    login,
    callback,
    accounts,
  };
}