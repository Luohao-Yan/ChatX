/**
 * OAuth API服务
 * 处理OAuth相关的API请求
 */

import { http } from '@/services/http';
import type {
  OAuthProvidersResponse,
  OAuthAuthorizationResponse,
  OAuthCallbackResponse,
  OAuthAccountsResponse,
  OAuthUnbindResponse,
  OAuthBindRequest,
} from '../types/oauth.types';

class OAuthService {
  private readonly baseUrl = '/v1/auth/oauth';

  /**
   * 获取可用的OAuth提供商列表
   */
  async getProviders(): Promise<OAuthProvidersResponse> {
    const response = await http.get(`${this.baseUrl}/providers`);
    return response.data as OAuthProvidersResponse;
  }

  /**
   * 获取OAuth授权地址
   */
  async getAuthorizationUrl(
    provider: string,
    redirectUrl?: string
  ): Promise<OAuthAuthorizationResponse> {
    const params = new URLSearchParams();
    if (redirectUrl) {
      params.append('redirect_url', redirectUrl);
    }

    const url = `${this.baseUrl}/authorize/${provider}${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await http.get(url);
    return response.data as OAuthAuthorizationResponse;
  }

  /**
   * 处理OAuth回调（通常由后端处理，前端不直接调用）
   */
  async handleCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<OAuthCallbackResponse> {
    const params = new URLSearchParams({
      code,
      state,
    });

    const response = await http.get(
      `${this.baseUrl}/callback/${provider}?${params.toString()}`
    );
    return response.data as OAuthCallbackResponse;
  }

  /**
   * 绑定OAuth账号到当前用户
   */
  async bindAccount(
    provider: string,
    data: OAuthBindRequest
  ): Promise<{ message: string }> {
    const response = await http.post(`${this.baseUrl}/bind/${provider}`, data);
    return response.data as { message: string };
  }

  /**
   * 解绑OAuth账号
   */
  async unbindAccount(provider: string): Promise<OAuthUnbindResponse> {
    const response = await http.delete(`${this.baseUrl}/unbind/${provider}`);
    return response.data as OAuthUnbindResponse;
  }

  /**
   * 获取当前用户的OAuth绑定列表
   */
  async getAccounts(): Promise<OAuthAccountsResponse> {
    const response = await http.get(`${this.baseUrl}/accounts`);
    return response.data as OAuthAccountsResponse;
  }

  /**
   * 清理过期的OAuth状态（管理员功能）
   */
  async cleanupStates(): Promise<{ message: string }> {
    const response = await http.post(`${this.baseUrl}/cleanup`);
    return response.data as { message: string };
  }

  /**
   * 从URL参数中提取OAuth回调参数
   */
  parseCallbackParams(url: string = window.location.href): {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  } {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    return {
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
      error: params.get('error') || undefined,
      error_description: params.get('error_description') || undefined,
    };
  }

  /**
   * 检查是否为OAuth回调页面
   */
  isOAuthCallback(url: string = window.location.href): boolean {
    const params = this.parseCallbackParams(url);
    return !!(params.code && params.state) || !!params.error;
  }
}

export const oauthService = new OAuthService();