// src/boot/deeplink.ts
// 处理深链接/URL scheme的启动文件

import { boot } from 'quasar/wrappers';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { CapacitorPlatformService } from 'src/services/platform';

// 创建全局的平台服务实例，确保深链接处理器可以访问
let capacitorPlatformService: CapacitorPlatformService | null = null;
let pendingOAuthCallback: { code?: string; error?: string } | null = null;

export function getCapacitorPlatformService(): CapacitorPlatformService | null {
  return capacitorPlatformService;
}

export function setCapacitorPlatformService(service: CapacitorPlatformService): void {
  capacitorPlatformService = service;
  console.log('[DeepLink] Platform service registered');

  // 如果有待处理的OAuth回调，立即处理
  if (pendingOAuthCallback) {
    console.log('[DeepLink] Processing pending OAuth callback');
    service.handleOAuthCallback(pendingOAuthCallback.code, pendingOAuthCallback.error);
    pendingOAuthCallback = null;
  }
}

export default boot(() => {
  // 只在Capacitor平台启用深链接处理
  if (Capacitor.isNativePlatform()) {
    console.log('[DeepLink] Setting up deep link handler for native platform');

    App.addListener('appUrlOpen', async (data) => {
      console.log('[DeepLink] App opened with URL:', data.url);

      // 立即尝试关闭浏览器，不管是什么URL
      try {
        console.log('[DeepLink] Attempting to close browser immediately...');
        await Browser.close();
        console.log('[DeepLink] Browser closed successfully');
      } catch (closeError) {
        console.warn('[DeepLink] Failed to close browser:', closeError);
      }

      try {
        const url = new URL(data.url);
        console.log('[DeepLink] URL parsed, protocol:', url.protocol);
        console.log('[DeepLink] URL pathname:', url.pathname);

        // 检查是否是OAuth回调
        if (url.protocol === 'osu-music-fusion:' && url.pathname.includes('/callback')) {
          console.log('[DeepLink] OAuth callback detected!');

          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          console.log('[DeepLink] OAuth code present:', !!code);
          console.log('[DeepLink] OAuth error present:', !!error);

          // 通知平台服务
          if (capacitorPlatformService) {
            console.log('[DeepLink] Notifying platform service...');
            capacitorPlatformService.handleOAuthCallback(code || undefined, error || undefined);
            console.log('[DeepLink] Platform service notified');
          } else {
            console.warn('[DeepLink] No platform service, storing callback');
            pendingOAuthCallback = {};
            if (code) pendingOAuthCallback.code = code;
            if (error) pendingOAuthCallback.error = error;
          }
        } else {
          console.log('[DeepLink] Not an OAuth callback URL');
        }
      } catch (parseError) {
        console.error('[DeepLink] Error processing URL:', parseError);
      }
    });

    console.log('[DeepLink] Deep link handler registered successfully');
  } else {
    console.log('[DeepLink] Skipping deep link setup for non-native platform');
  }
});
