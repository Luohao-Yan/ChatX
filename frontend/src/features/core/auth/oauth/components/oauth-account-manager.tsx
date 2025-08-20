/**
 * OAuth账号管理组件
 * 用于设置页面中管理已绑定的第三方账号
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  IconBrandGithub, 
  IconBrandGoogle, 
  IconBrandOffice,
  IconBrandWechat,
  IconUser,
  IconLoader2,
  IconLink
} from '@tabler/icons-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useOAuthAccounts, useOAuthProviders, useOAuthLogin } from '../hooks/use-oauth';

interface OAuthAccountManagerProps {
  className?: string;
}

export function OAuthAccountManager({ className }: OAuthAccountManagerProps) {
  const { accounts, loading: accountsLoading, unbindAccount } = useOAuthAccounts();
  const { providers, oauthEnabled } = useOAuthProviders();
  const { login, loading: loginLoading } = useOAuthLogin();
  
  const [unbindingProvider, setUnbindingProvider] = useState<string | null>(null);

  const handleBind = async (provider: string) => {
    await login(provider, window.location.origin + '/settings/account');
  };

  const handleUnbind = async (provider: string) => {
    if (accounts.length <= 1) {
      toast.error('至少需要保留一个登录方式');
      return;
    }

    setUnbindingProvider(provider);
    await unbindAccount(provider);
    setUnbindingProvider(null);
  };

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      github: 'GitHub',
      google: 'Google',
      microsoft: 'Microsoft',
      wechat: '微信',
    };
    return names[provider] || provider;
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
        return 'bg-gray-800 text-white';
      case 'google':
        return 'bg-blue-600 text-white';
      case 'microsoft':
        return 'bg-blue-600 text-white';
      case 'wechat':
        return 'bg-green-600 text-white';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  const getBoundProviders = () => {
    return accounts.map(account => account.provider);
  };

  const getUnboundProviders = () => {
    const boundProviders = getBoundProviders();
    return providers.filter(provider => !boundProviders.includes(provider.name));
  };

  if (!oauthEnabled) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>第三方账号</CardTitle>
          <CardDescription>
            第三方登录功能暂未启用
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (accountsLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>第三方账号</CardTitle>
          <CardDescription>
            管理您绑定的第三方登录账号
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>第三方账号</CardTitle>
        <CardDescription>
          管理您绑定的第三方登录账号，可以使用这些账号快速登录
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 已绑定的账号 */}
        {accounts.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">已绑定账号</h4>
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={account.avatar_url} />
                    <AvatarFallback>
                      {getProviderIcon(account.provider)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {account.display_name || getProviderDisplayName(account.provider)}
                      </span>
                      {account.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          主账号
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getProviderDisplayName(account.provider)} 账号
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnbind(account.provider)}
                  disabled={unbindingProvider === account.provider || accounts.length <= 1}
                >
                  {unbindingProvider === account.provider ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '解绑'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 分隔线 */}
        {accounts.length > 0 && getUnboundProviders().length > 0 && (
          <Separator />
        )}

        {/* 可绑定的账号 */}
        {getUnboundProviders().length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">绑定更多账号</h4>
            <div className="grid gap-3">
              {getUnboundProviders().map((provider) => (
                <div
                  key={provider.name}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-md ${getProviderColor(provider.name)}`}>
                      {getProviderIcon(provider.name)}
                    </div>
                    <div>
                      <span className="font-medium">{provider.display_name}</span>
                      <p className="text-sm text-muted-foreground">
                        绑定{provider.display_name}账号以便快速登录
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBind(provider.name)}
                    disabled={loginLoading[provider.name]}
                  >
                    {loginLoading[provider.name] ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      '绑定'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {accounts.length === 0 && providers.length === 0 && (
          <div className="text-center py-8">
            <IconLink className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-sm font-medium">暂无可用的第三方登录</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              管理员尚未配置任何第三方登录提供商
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}