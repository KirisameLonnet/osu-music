import { boot } from 'quasar/wrappers';
import { initialize } from '@capacitor-community/safe-area';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
// 重要：当仅通过配置文件启用插件时，仍需要导入插件
import '@capacitor-community/safe-area';

// 这个 boot 文件用于初始化 SafeArea 插件
// 确保 CSS 变量在应用启动时就可用，特别是在 Web 和 iOS 上
// 同时确保 Edge-to-Edge 模式正确配置

export default boot(async () => {
  try {
    // 在原生平台上先配置 Edge-to-Edge 模式
    if (Capacitor.isNativePlatform()) {
      console.log('[SafeArea] Configuring Edge-to-Edge mode for native platform');

      // 启用状态栏覆盖 WebView
      await StatusBar.setOverlaysWebView({ overlay: true });

      // 设置状态栏样式（深色主题使用浅色文本）
      await StatusBar.setStyle({ style: Style.Light });

      // 设置透明背景
      await StatusBar.setBackgroundColor({ color: '#00000000' });

      console.log('[SafeArea] Edge-to-Edge mode configured successfully');
    }

    // 初始化 SafeArea 插件
    // 这会注入 var(--safe-area-inset-*) CSS 变量，值设为 max(env(safe-area-inset-*), 0px)
    // 确保变量在所有平台上都可用，包括 Web 和 iOS
    initialize();
    console.log('[SafeArea] Plugin initialized successfully - CSS variables are now available');

    // 在 DOM 加载完成后设置根 CSS 变量
    if (typeof document !== 'undefined') {
      const setRootSafeAreaVars = () => {
        const root = document.documentElement;
        root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
        root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
        root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
        root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setRootSafeAreaVars);
      } else {
        setRootSafeAreaVars();
      }
    }
  } catch (error) {
    console.warn('[SafeArea] Failed to initialize plugin or configure Edge-to-Edge mode:', error);
  }
});
