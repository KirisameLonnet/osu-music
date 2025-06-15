// src/boot/auth.ts
// 认证存储初始化

import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/services/auth';

export default boot(async () => {
  console.log('[Boot] Initializing auth store...');

  try {
    const authStore = useAuthStore();

    // 从平台存储初始化认证数据
    await authStore.initializeFromStorage();

    // 检查认证状态并刷新token（如需要）
    await authStore.initAuth();

    console.log('[Boot] Auth store initialized successfully');
  } catch (error) {
    console.error('[Boot] Failed to initialize auth store:', error);
  }
});
