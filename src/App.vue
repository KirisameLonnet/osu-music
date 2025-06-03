<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from 'src/stores/settingsStore';
import { useAuthStore } from 'src/services/auth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const router = useRouter();
let unlistenNavigateCallback: (() => void) | undefined;

onMounted(() => {
  settingsStore.initializeSettings(); // 同步初始化内存 settingsStore
  authStore.initAuth().catch((error) => {
    console.error('Failed to initialize authStore:', error);
  }); // 异步初始化 authStore

  // --- 修正：iOS 状态栏安全区适配 ---
  if (
    typeof Capacitor.isNativePlatform === 'function' &&
    typeof Capacitor.getPlatform === 'function' &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === 'ios'
  ) {
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: StatusBarStyle.Dark }).catch(() => {}); // 你可以根据 header 颜色选择 Light/Dark
  }

  // --- 只监听 oauth-callback-pending，移除 navigate-to-oauth-callback-with-code ---
  if (window.electron?.ipcRenderer) {
    const pendingCallbackHandler = () => {
      console.log(
        '[App.vue] Received "oauth-callback-pending". Retrieving authorization code from main process.',
      );

      // 异步处理OAuth码获取
      (async () => {
        try {
          // 从Electron主进程获取存储的授权码
          const response = await window.electron?.ipcRenderer?.invoke('get-pending-oauth-code');
          console.log('[App.vue] Response from main process:', response);
          
          if (response && typeof response === 'object' && 'success' in response && response.success && 'code' in response && response.code) {
            console.log('[App.vue] Retrieved OAuth code from main process:', response.code);
            // 将授权码存储到authStore中
            authStore.setPendingOAuthCode(response.code as string);
          } else {
            console.warn('[App.vue] No pending OAuth code found in main process:', response);
          }
        } catch (error) {
          console.error('[App.vue] Failed to retrieve OAuth code from main process:', error);
        }

        // 强制刷新 osuCallback 页面，带上唯一参数，确保组件重新 mount
        router.push({ name: 'osuCallback', query: { t: Date.now() } }).catch((err) => {
          console.error('[App.vue] Navigation to osuCallback page failed:', err);
        });
      })().catch(console.error);
    };
    window.electron.ipcRenderer.on('oauth-callback-pending', pendingCallbackHandler);
    unlistenNavigateCallback = () => {
      window.electron?.ipcRenderer?.removeAllListeners('oauth-callback-pending');
      console.log('[App.vue] Removed "oauth-callback-pending" IPC listener.');
    };
  } else {
    console.warn(
      '[App.vue] Electron IPC not available, cannot listen for OAuth navigation commands.',
    );
  }

  if (Capacitor.isNativePlatform()) {
    console.log('[App.vue setup] Registering Capacitor appUrlOpen listener.');
    void CapacitorApp.addListener('appUrlOpen', (event) => {
      console.log('[App.vue Capacitor] App URL opened:', event.url);
      try {
        const url = new URL(event.url);
        if (
          url.protocol === 'osu-music-fusion:' &&
          url.hostname === 'oauth' &&
          url.pathname === '/callback'
        ) {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');
          if (error) {
            console.error(
              '[App.vue Capacitor] OAuth Error from URL:',
              error,
              url.searchParams.get('error_description'),
            );
            router.push({ name: 'settings', query: { oauth_error: error } }).catch(() => {});
            return;
          }
          if (code) {
            console.log('[App.vue Capacitor] Extracted OAuth code:', code);
            const authStore = useAuthStore();
            authStore.setPendingOAuthCode(code);
            router.push({ name: 'osuCallback', query: { trigger: Date.now() } }).catch(() => {});
          }
        }
      } catch (e) {
        console.error('[App.vue Capacitor] Error parsing appUrlOpen event:', e);
      }
    });
  }
});

onUnmounted(() => {
  if (unlistenNavigateCallback) {
    unlistenNavigateCallback();
  }
});
</script>
