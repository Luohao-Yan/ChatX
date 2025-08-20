/**
 * OAuth回调处理组件
 * 处理第三方OAuth登录成功后的回调
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconLoader2, IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useOAuthCallback } from '../hooks/use-oauth';
import { oauthService } from '../services/oauth.service';

export function OAuthCallback() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { provider?: string };
  const { handleCallback, processing } = useOAuthCallback();
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const provider = params.provider;
  const callbackParams = oauthService.parseCallbackParams();

  useEffect(() => {
    if (!provider) {
      setError('缺少OAuth提供商信息');
      return;
    }

    if (callbackParams.error) {
      setError(callbackParams.error_description || callbackParams.error);
      return;
    }

    if (!callbackParams.code || !callbackParams.state) {
      setError('缺少必要的OAuth回调参数');
      return;
    }

    // 处理OAuth回调
    handleCallbackAsync();
  }, [provider]);

  const handleCallbackAsync = async () => {
    if (!provider) return;

    const result = await handleCallback(provider, callbackParams);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'OAuth登录失败');
    }
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

  const handleRetry = () => {
    navigate({ to: '/sign-in' });
  };

  const handleGoToDashboard = () => {
    navigate({ to: '/' });
  };

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle>正在处理登录</CardTitle>
            <CardDescription>
              正在验证您的{provider ? getProviderDisplayName(provider) : 'OAuth'}账号...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <div className="text-sm text-muted-foreground text-center">
                请稍等，这通常只需要几秒钟
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <IconAlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>登录失败</CardTitle>
            <CardDescription>
              {provider ? getProviderDisplayName(provider) : 'OAuth'}登录过程中出现错误
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <IconAlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            <div className="flex flex-col space-y-2">
              <Button onClick={handleRetry} variant="default" className="w-full">
                返回登录页面
              </Button>
              <Button onClick={handleGoToDashboard} variant="outline" className="w-full">
                前往首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <IconCircleCheck className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>登录成功</CardTitle>
            <CardDescription>
              您已成功使用{provider ? getProviderDisplayName(provider) : 'OAuth'}登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <div className="text-sm text-muted-foreground text-center mb-4">
                正在为您跳转到主页面...
              </div>
              <Button onClick={handleGoToDashboard} variant="default" className="w-full">
                立即进入
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}