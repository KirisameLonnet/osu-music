// src/services/core/platform/electron.ts
// Electron平台具体实现

import type {
  PlatformService,
  PlatformInfo,
  HttpRequest,
  HttpResponse,
  ReadFileOptions,
  WriteFileOptions,
  FileInfo,
  OAuthConfig,
  OAuthResult,
  UserProfileResult,
  FilePickerOptions,
  SelectedFile,
  AppLifecycleListener,
} from './types';
import { PlatformType } from './types';

// (Removed duplicate Window interface declaration to avoid type conflicts)

export class ElectronPlatformService implements PlatformService {
  private listeners: Map<string, (...args: unknown[]) => void> = new Map();

  getPlatformInfo(): PlatformInfo {
    return {
      type: PlatformType.ELECTRON,
      version: process.env.npm_package_version || '0.1.0',
      isNative: true,
      isDesktop: true,
      isMobile: false,
    };
  }

  async httpRequest<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('http-request', request);
      return result as HttpResponse<T>;
    } catch (error) {
      console.error('[ElectronPlatform] HTTP request failed:', error);
      throw error;
    }
  }

  async readFile(options: ReadFileOptions): Promise<string> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('read-file', options);
      return result as string;
    } catch (error) {
      console.error('[ElectronPlatform] Read file failed:', error);
      throw error;
    }
  }

  async writeFile(options: WriteFileOptions): Promise<void> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      await window.electron.ipcRenderer.invoke('write-file', options);
    } catch (error) {
      console.error('[ElectronPlatform] Write file failed:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      await window.electron.ipcRenderer.invoke('delete-file', path);
    } catch (error) {
      console.error('[ElectronPlatform] Delete file failed:', error);
      throw error;
    }
  }

  async createDirectory(path: string): Promise<void> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      await window.electron.ipcRenderer.invoke('create-directory', path);
    } catch (error) {
      console.error('[ElectronPlatform] Create directory failed:', error);
      throw error;
    }
  }

  async listDirectory(path: string): Promise<FileInfo[]> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('list-directory', path);
      return result as FileInfo[];
    } catch (error) {
      console.error('[ElectronPlatform] List directory failed:', error);
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('file-exists', path);
      return result as boolean;
    } catch (error) {
      console.error('[ElectronPlatform] File exists check failed:', error);
      throw error;
    }
  }

  async getAppDataDirectory(): Promise<string> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('get-app-data-directory');
      return result as string;
    } catch (error) {
      console.error('[ElectronPlatform] Get app data directory failed:', error);
      throw error;
    }
  }

  async getDocumentsDirectory(): Promise<string> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('get-documents-directory');
      return result as string;
    } catch (error) {
      console.error('[ElectronPlatform] Get documents directory failed:', error);
      throw error;
    }
  }

  async getStorage(key: string): Promise<string | null> {
    if (!window.electron?.ipcRenderer) {
      // 降级到localStorage
      return localStorage.getItem(key);
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('get-storage', key);
      return result as string | null;
    } catch (error) {
      console.error('[ElectronPlatform] Get storage failed:', error);
      // 降级到localStorage
      return localStorage.getItem(key);
    }
  }

  async setStorage(key: string, value: string): Promise<void> {
    if (!window.electron?.ipcRenderer) {
      // 降级到localStorage
      localStorage.setItem(key, value);
      return;
    }

    try {
      await window.electron.ipcRenderer.invoke('set-storage', key, value);
    } catch (error) {
      console.error('[ElectronPlatform] Set storage failed:', error);
      // 降级到localStorage
      localStorage.setItem(key, value);
    }
  }

  async removeStorage(key: string): Promise<void> {
    if (!window.electron?.ipcRenderer) {
      // 降级到localStorage
      localStorage.removeItem(key);
      return;
    }

    try {
      await window.electron.ipcRenderer.invoke('remove-storage', key);
    } catch (error) {
      console.error('[ElectronPlatform] Remove storage failed:', error);
      // 降级到localStorage
      localStorage.removeItem(key);
    }
  }

  async openOAuth(config: OAuthConfig): Promise<OAuthResult> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('open-oauth', config);
      return result as OAuthResult;
    } catch (error) {
      console.error('[ElectronPlatform] OAuth failed:', error);
      throw error;
    }
  }

  async fetchUserProfile<T = unknown>(accessToken: string): Promise<UserProfileResult<T>> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      const result = await window.electron.ipcRenderer.invoke(
        'fetch-osu-user-profile',
        accessToken,
      );
      return result as UserProfileResult<T>;
    } catch (error) {
      console.error('[ElectronPlatform] Fetch user profile failed:', error);
      throw error;
    }
  }

  async pickFiles(options?: FilePickerOptions): Promise<SelectedFile[]> {
    if (!window.electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('pick-files', options);
      return result as SelectedFile[];
    } catch (error) {
      console.error('[ElectronPlatform] Pick files failed:', error);
      throw error;
    }
  }

  addAppLifecycleListener(listener: AppLifecycleListener): () => void {
    if (!window.electron?.ipcRenderer) {
      console.warn('[ElectronPlatform] Electron IPC not available for lifecycle listeners');
      return () => {};
    }

    const handleUrlOpen = (url: string) => {
      listener.onUrlOpen?.(url);
      listener.onDeepLink?.(url);
    };

    const handleAppStateChange = (state: 'active' | 'inactive' | 'background') => {
      listener.onAppStateChange?.(state);
    };

    // 注册事件监听器
    const urlOpenId = `url-open-${Math.random()}`;
    const stateChangeId = `state-change-${Math.random()}`;

    this.listeners.set(urlOpenId, (...args: unknown[]) => {
      if (typeof args[0] === 'string') handleUrlOpen(args[0]);
    });
    this.listeners.set(stateChangeId, (...args: unknown[]) => {
      if (args[0] === 'active' || args[0] === 'inactive' || args[0] === 'background') {
        handleAppStateChange(args[0]);
      }
    });

    window.electron.ipcRenderer.on('app-url-open', (_event, ...args: unknown[]) => {
      if (typeof args[0] === 'string') handleUrlOpen(args[0]);
    });
    window.electron.ipcRenderer.on('app-state-change', (_event, ...args: unknown[]) => {
      if (args[0] === 'active' || args[0] === 'inactive' || args[0] === 'background') {
        handleAppStateChange(args[0]);
      }
    });

    // 返回清理函数
    return () => {
      this.listeners.delete(urlOpenId);
      this.listeners.delete(stateChangeId);
      window.electron?.ipcRenderer?.removeAllListeners('app-url-open');
      window.electron?.ipcRenderer?.removeAllListeners('app-state-change');
    };
  }

  async showNotification(title: string, message: string): Promise<void> {
    if (!window.electron?.ipcRenderer) {
      // 降级到Web Notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
      }
      return;
    }

    try {
      await window.electron.ipcRenderer.invoke('show-notification', { title, message });
    } catch (error) {
      console.error('[ElectronPlatform] Show notification failed:', error);
      // 降级到Web Notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
      }
    }
  }
}
