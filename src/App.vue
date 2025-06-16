<template>
  <div class="bg-fill" />
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SafeArea } from '@capacitor-community/safe-area';

// 应用启动时初始化 Edge-to-Edge 模式
onMounted(async () => {
  // 仅在原生平台上执行
  if (Capacitor.isNativePlatform()) {
    try {
      // 检测设备类型和环境
      const platform = Capacitor.getPlatform();
      const isIOS = platform === 'ios';

      // 开启 Edge-to-Edge 模式：让 WebView 内容延伸到状态栏区域
      // 这对于分屏模式也是兼容的
      await StatusBar.setOverlaysWebView({ overlay: true });
      console.log(`[App] StatusBar.setOverlaysWebView enabled on ${platform}`);

      // 设置状态栏样式（根据深色主题使用浅色文本）
      await StatusBar.setStyle({ style: Style.Light });
      console.log(`[App] StatusBar style set to Light on ${platform}`);

      // 设置透明状态栏背景
      await StatusBar.setBackgroundColor({ color: '#00000000' });
      console.log(`[App] StatusBar background set to transparent on ${platform}`);

      // 启用 SafeArea 插件，实现 edge-to-edge 模式
      await SafeArea.enable({
        config: {
          customColorsForSystemBars: true,
          statusBarColor: '#00000000', // 透明
          statusBarContent: 'light',
          navigationBarColor: '#00000000', // 透明
          navigationBarContent: 'light',
          offset: 0,
        },
      });

      console.log(`[App] Edge-to-Edge mode enabled successfully on ${platform}`);

      // iOS 特殊处理：检测是否在分屏模式
      if (isIOS) {
        const checkSplitScreenMode = () => {
          const screenWidth = window.screen.width;
          const windowWidth = window.innerWidth;
          const isSplitScreen = windowWidth < screenWidth * 0.9; // 如果窗口宽度小于屏幕宽度的 90%，可能是分屏

          if (isSplitScreen) {
            console.log('[App] Split screen mode detected on iPad');
            // 在分屏模式下，可以调整一些样式行为
            document.documentElement.classList.add('split-screen-mode');
          } else {
            document.documentElement.classList.remove('split-screen-mode');
          }
        };

        // 监听窗口大小变化以检测分屏模式的切换
        window.addEventListener('resize', checkSplitScreenMode);
        checkSplitScreenMode(); // 初始检查
      }
    } catch (error) {
      console.warn('[App] Failed to enable Edge-to-Edge mode:', error);
    }
  }
});
</script>

<style>
/* 确保整个应用使用 Edge-to-Edge 样式 */
html,
body,
#q-app {
  height: 100vh !important;
  height: 100dvh !important;
  width: 100vw !important;
  margin: 0 !important;
  padding: 0 !important;
  background-color: #121218 !important;
  overflow-x: hidden;
}

/* 移动端专用的 Edge-to-Edge 支持 */
@media screen and (max-width: 768px) {
  html,
  body,
  #q-app {
    /* 确保内容可以延伸到安全区域 */
    position: relative;
  }

  /* 使用 CSS 环境变量来处理安全区域 */
  :root {
    --safe-area-inset-top: env(safe-area-inset-top);
    --safe-area-inset-bottom: env(safe-area-inset-bottom);
    --safe-area-inset-left: env(safe-area-inset-left);
    --safe-area-inset-right: env(safe-area-inset-right);
  }
}

/* iPad 分屏模式的特殊处理 */
.split-screen-mode {
  /* 在分屏模式下，调整一些布局行为 */

  html,
  body,
  #q-app {
    /* 分屏模式下不使用 100vw，而是使用 100% */
    width: 100% !important;
  }

  /* 在分屏模式下，安全区域的处理可能需要调整 */
  --safe-area-inset-left: 0px;
  --safe-area-inset-right: 0px;
}

/* iPad 横屏模式的处理 */
@media screen and (min-width: 768px) and (orientation: landscape) {
  :root {
    /* 在平板横屏模式下，可能需要特殊的安全区域处理 */
    --safe-area-inset-left: env(safe-area-inset-left);
    --safe-area-inset-right: env(safe-area-inset-right);
  }
}

/* 背景填充层 - 确保背景色撑满整个屏幕 */
.bg-fill {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  z-index: -999;
  background-color: #121218; /* 使用应用的主要背景色 */
  pointer-events: none; /* 确保不会阻止用户交互和滚动 */
}

/* 确保根元素占满整个屏幕 */
html,
body,
#q-app {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: #121218; /* 防止系统背景穿透 */
}

/* Stage Manager 模式的处理 */
@media screen and (min-width: 1024px) {
  .split-screen-mode {
    /* Stage Manager 或大屏分屏模式下的特殊样式 */
    #q-app {
      border-radius: 8px; /* 可选：为分屏窗口添加圆角 */
      overflow: hidden;
    }
  }
}
</style>
