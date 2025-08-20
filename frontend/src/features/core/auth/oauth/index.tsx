/**
 * OAuth第三方登录组件
 * 提供GitHub、Google、微信等第三方平台登录功能
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  IconBrandGithub, 
  IconBrandGoogle, 
  IconBrandOffice,
  IconBrandWechat,
  IconUser,
  IconLoader2
} from '@tabler/icons-react';
import { oauthService } from './services/oauth.service';
import type { OAuthProvider } from './types/oauth.types';

interface OAuthLoginProps {
  className?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function OAuthLogin({ className, onError }: OAuthLoginProps) {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [oauthEnabled, setOauthEnabled] = useState(false);

  useEffect(() => {
    loadOAuthProviders();
  }, []);

  const loadOAuthProviders = async () => {
    try {
      const result = await oauthService.getProviders();
      setProviders(result.providers);
      setOauthEnabled(result.enabled);
    } catch (error) {
      console.error('加载OAuth提供商失败:', error);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    try {
      setLoading(prev => ({ ...prev, [provider]: true }));

      // 获取授权地址
      const authResult = await oauthService.getAuthorizationUrl(provider);
      
      // 跳转到第三方授权页面
      window.location.href = authResult.authorization_url;
      
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || `${provider}登录失败`;
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, [provider]: false }));
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'github':
        return <IconBrandGithub className="h-4 w-4" />;
      case 'google':
        return <IconBrandGoogle className="h-4 w-4" />;
      case 'microsoft':
        return <IconBrandOffice className="h-4 w-4" />;
      case 'wechat':
        return <IconBrandWechat className="h-4 w-4" />;
      default:
        return <IconUser className="h-4 w-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'github':
        return 'hover:bg-gray-800 hover:text-white';
      case 'google':
        return 'hover:bg-blue-600 hover:text-white';
      case 'microsoft':
        return 'hover:bg-blue-600 hover:text-white';
      case 'wechat':
        return 'hover:bg-green-600 hover:text-white';
      default:
        return 'hover:bg-primary hover:text-primary-foreground';
    }
  };

  if (!oauthEnabled || providers.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            或使用第三方登录
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 mt-4">
        {providers.map((provider) => (
          <Button
            key={provider.name}
            variant="outline"
            type="button"
            disabled={loading[provider.name]}
            onClick={() => handleOAuthLogin(provider.name)}
            className={`w-full transition-colors ${getProviderColor(provider.name)}`}
          >
            {loading[provider.name] ? (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                {getProviderIcon(provider.name)}
                <span className="ml-2">使用 {provider.display_name} 登录</span>
              </>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}

export { OAuthCallback } from './components/oauth-callback';
export { OAuthAccountManager } from './components/oauth-account-manager';
export { useOAuth } from './hooks/use-oauth';
export type { OAuthProvider, OAuthAccount } from './types/oauth.types';