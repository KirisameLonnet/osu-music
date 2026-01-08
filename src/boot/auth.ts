// src/boot/auth.ts
// 认证和设置存储初始化

import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/authStore';
import { useSettingsStore } from 'src/stores/settingsStore';

export default boot(async () => {
  console.log('[Boot] Initializing stores...');

  try {
    // 首先初始化设置（包含 OSU Client ID/Secret）
    const settingsStore = useSettingsStore();
    await settingsStore.initializeSettings();
    console.log('[Boot] Settings store initialized');

    // 然后初始化认证
    const authStore = useAuthStore();
    await authStore.initializeFromStorage();
    await authStore.initAuth();

    console.log('[Boot] All stores initialized successfully');
  } catch (error) {
    console.error('[Boot] Failed to initialize stores:', error);
  }
});
