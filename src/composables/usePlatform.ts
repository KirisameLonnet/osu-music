// src/composables/usePlatform.ts
// Vue 3 组合式API - 平台服务集成

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getPlatformService } from '../services/platform';
import type { PlatformInfo, AppLifecycleListener } from '../services/platform/types';

export function usePlatform() {
  const platform = getPlatformService();
  const platformInfo = ref<PlatformInfo>(platform.getPlatformInfo());
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 计算属性
  const isElectron = computed(() => platformInfo.value.type === 'electron');
  const isIOS = computed(() => platformInfo.value.type === 'ios');
  const isAndroid = computed(() => platformInfo.value.type === 'android');
  const isMobile = computed(() => platformInfo.value.isMobile);
  const isNative = computed(() => platformInfo.value.isNative);

  // 生命周期监听器
  let lifecycleCleanup: (() => void) | null = null;

  const setupLifecycleListener = (listener: AppLifecycleListener) => {
    lifecycleCleanup = platform.addAppLifecycleListener(listener);
  };

  // 文件操作
  const readFile = async (path: string, encoding: 'utf8' | 'base64' = 'utf8') => {
    try {
      isLoading.value = true;
      error.value = null;
      return await platform.readFile({ path, encoding });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const writeFile = async (path: string, data: string | ArrayBuffer) => {
    try {
      isLoading.value = true;
      error.value = null;
      await platform.writeFile({ path, data });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // HTTP请求
  const httpRequest = async <T = unknown>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown,
  ) => {
    try {
      isLoading.value = true;
      error.value = null;
      return await platform.httpRequest<T>({
        url,
        method,
        data: data as string | FormData | URLSearchParams | Record<string, unknown>,
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 存储操作
  const getStorage = async (key: string) => {
    try {
      return await platform.getStorage(key);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      return null;
    }
  };

  const setStorage = async (key: string, value: string) => {
    try {
      await platform.setStorage(key, value);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    }
  };

  // 文件选择
  const pickFiles = async (options?: { accept?: string[]; multiple?: boolean }) => {
    try {
      isLoading.value = true;
      error.value = null;
      return await platform.pickFiles(options);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 通知
  const showNotification = async (title: string, message: string) => {
    try {
      await platform.showNotification?.(title, message);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to show notification:', err);
    }
  };

  // 状态栏（移动端）
  const setStatusBarStyle = async (style: 'light' | 'dark') => {
    if (isMobile.value) {
      try {
        await platform.setStatusBarStyle?.(style);
      } catch (err) {
        console.warn('Failed to set status bar style:', err);
      }
    }
  };

  // 目录操作
  const getAppDataDirectory = async () => {
    try {
      return await platform.getAppDataDirectory();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    }
  };

  const getDocumentsDirectory = async () => {
    try {
      return await platform.getDocumentsDirectory();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    }
  };

  // 清理函数
  onUnmounted(() => {
    if (lifecycleCleanup) {
      lifecycleCleanup();
      lifecycleCleanup = null;
    }
  });

  return {
    // 状态
    platformInfo,
    isLoading,
    error,

    // 计算属性
    isElectron,
    isIOS,
    isAndroid,
    isMobile,
    isNative,

    // 方法
    setupLifecycleListener,
    readFile,
    writeFile,
    httpRequest,
    getStorage,
    setStorage,
    pickFiles,
    showNotification,
    setStatusBarStyle,
    getAppDataDirectory,
    getDocumentsDirectory,

    // 原始平台服务（高级使用）
    platform,
  };
}

// 专门用于音乐文件管理的组合式API
export function useMusicFiles() {
  const { platform, isLoading, error, readFile, writeFile, pickFiles, getDocumentsDirectory } =
    usePlatform();

  const musicDirectory = ref<string>('');
  const musicFiles = ref<Array<{ name: string; path: string; size: number }>>([]);

  const initializeMusicDirectory = async () => {
    try {
      const docsDir = await getDocumentsDirectory();
      musicDirectory.value = `${docsDir}/Music`;

      // 确保目录存在
      await platform.createDirectory(musicDirectory.value);

      // 加载音乐文件列表
      await loadMusicFiles();
    } catch (err) {
      console.error('Failed to initialize music directory:', err);
    }
  };

  const loadMusicFiles = async () => {
    try {
      const files = await platform.listDirectory(musicDirectory.value);
      musicFiles.value = files
        .filter((file) => file.type === 'file')
        .filter((file) => /\.(mp3|wav|flac|ogg|m4a)$/i.test(file.name));
    } catch (err) {
      console.error('Failed to load music files:', err);
      musicFiles.value = [];
    }
  };

  const importMusicFiles = async () => {
    try {
      const selectedFiles = await pickFiles({
        accept: ['.mp3', '.wav', '.flac', '.ogg', '.m4a'],
        multiple: true,
      });

      const importedFiles: Array<{ name: string; path: string; size: number }> = [];
      for (const file of selectedFiles) {
        if (file.data) {
          const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `${musicDirectory.value}/${fileName}`;

          await writeFile(filePath, file.data);
          importedFiles.push({
            name: fileName,
            path: filePath,
            size: file.size,
          });
        }
      }

      // 重新加载文件列表
      await loadMusicFiles();

      return importedFiles;
    } catch (err) {
      console.error('Failed to import music files:', err);
      throw err;
    }
  };

  const deleteMusicFile = async (filePath: string) => {
    try {
      await platform.deleteFile(filePath);
      await loadMusicFiles(); // 重新加载列表
    } catch (err) {
      console.error('Failed to delete music file:', err);
      throw err;
    }
  };

  const getMusicFileData = async (filePath: string): Promise<ArrayBuffer> => {
    try {
      const base64Data = await readFile(filePath, 'base64');

      // 将base64转换为ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (err) {
      console.error('Failed to get music file data:', err);
      throw err;
    }
  };

  onMounted(() => {
    initializeMusicDirectory();
  });

  return {
    // 状态
    musicDirectory,
    musicFiles,
    isLoading,
    error,

    // 方法
    initializeMusicDirectory,
    loadMusicFiles,
    importMusicFiles,
    deleteMusicFile,
    getMusicFileData,
  };
}
