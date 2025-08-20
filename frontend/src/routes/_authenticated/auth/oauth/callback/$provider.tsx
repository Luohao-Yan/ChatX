/**
 * OAuth回调路由
 * 处理第三方OAuth登录的回调
 */

import { createFileRoute } from '@tanstack/react-router';
import { OAuthCallback } from '@/features/core/auth/oauth';

export const Route = createFileRoute('/_authenticated/auth/oauth/callback/$provider')({
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  return <OAuthCallback />;
}