// src/services/platform/capacitor.ts
// Capacitor平台具体实现（iOS/Android）

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import type { AppState, AppLaunchUrl } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CapacitorHttp } from '@capacitor/core';
import { PlatformType } from './types';
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

export class CapacitorPlatformService implements PlatformService {
  private osuMusicDirectory = 'OSU! Music'; // 使用更友好的文件夹名称
  private lifecycleListeners: (() => void)[] = [];

  constructor() {
    this.initializeOsuMusicDirectory();

    // 如果在Capacitor环境中，注册到深链接处理器
    if (Capacitor.isNativePlatform()) {
      this.registerWithDeepLinkHandler();
    }
  }

  private registerWithDeepLinkHandler(): void {
    try {
      // 动态导入深链接处理器模块并注册
      import('src/boot/deeplink')
        .then(({ setCapacitorPlatformService }) => {
          setCapacitorPlatformService(this);
          console.log('[CapacitorPlatform] Registered with deep link handler');
        })
        .catch((error) => {
          console.warn('[CapacitorPlatform] Failed to register with deep link handler:', error);
        });
    } catch (error) {
      console.warn('[CapacitorPlatform] Error during deep link registration:', error);
    }
  }

  getPlatformInfo(): PlatformInfo {
    const platform = Capacitor.getPlatform();
    return {
      type:
        platform === 'ios'
          ? PlatformType.IOS
          : platform === 'android'
            ? PlatformType.ANDROID
            : PlatformType.WEB,
      version: '1.0.0', // Capacitor版本
      isNative: Capacitor.isNativePlatform(),
      isDesktop: false,
      isMobile: true,
    };
  }

  async httpRequest<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>> {
    try {
      console.log('[CapacitorPlatform] Making HTTP request:', {
        url: request.url,
        method: request.method,
        headers: request.headers,
      });

      // 在原生平台使用CapacitorHttp，在Web平台使用fetch
      if (Capacitor.isNativePlatform()) {
        // 使用Capacitor HTTP插件处理原生平台的CORS和网络问题
        const response = await CapacitorHttp.request({
          url: request.url,
          method: request.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
          headers: request.headers || {},
          data: request.data,
        });

        console.log('[CapacitorPlatform] CapacitorHttp response:', {
          status: response.status,
          headers: response.headers,
        });

        return {
          data: response.data as T,
          status: response.status,
          statusText: response.status.toString(),
          headers: response.headers,
        };
      } else {
        // Web平台使用fetch
        let body: BodyInit | null = null;

        if (request.data) {
          if (typeof request.data === 'string') {
            body = request.data;
          } else if (request.data instanceof FormData) {
            body = request.data;
          } else if (request.data instanceof URLSearchParams) {
            body = request.data;
          } else {
            body = JSON.stringify(request.data);
          }
        }

        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers || {},
          body,
        });

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        let data: T;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else if (contentType.includes('text/')) {
          data = (await response.text()) as T;
        } else {
          data = (await response.arrayBuffer()) as T;
        }

        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        };
      }
    } catch (error) {
      console.error('[CapacitorPlatform] HTTP request failed:', error);
      // 提供更详细的错误信息
      if (error instanceof Error) {
        throw new Error(`HTTP request failed: ${error.message}`);
      }
      throw error;
    }
  }

  private async initializeOsuMusicDirectory(): Promise<void> {
    try {
      // 检查OSU Music目录是否存在，如果不存在则创建
      const osuMusicPath = `${this.osuMusicDirectory}`;

      console.log('[CapacitorPlatform] Initializing OSU Music directory:', osuMusicPath);

      try {
        await Filesystem.stat({
          path: osuMusicPath,
          directory: Directory.Documents,
        });
        console.log('[CapacitorPlatform] OSU Music directory already exists');
      } catch {
        // 目录不存在，创建它
        console.log('[CapacitorPlatform] Creating OSU Music directory...');
        await Filesystem.mkdir({
          path: osuMusicPath,
          directory: Directory.Documents,
          recursive: true,
        });

        // 创建子目录
        await this.createOsuSubDirectories();
        console.log('[CapacitorPlatform] OSU Music directory structure created');
      }

      // 获取并记录实际的文件系统路径
      const documentsUri = await Filesystem.getUri({
        path: osuMusicPath,
        directory: Directory.Documents,
      });
      console.log('[CapacitorPlatform] OSU Music directory URI:', documentsUri.uri);
    } catch (error) {
      console.error('[CapacitorPlatform] Failed to initialize OSU Music directory:', error);
    }
  }

  private async createOsuSubDirectories(): Promise<void> {
    const subDirs = [
      { name: 'Music', desc: '音乐文件存储位置' },
      { name: 'Playlists', desc: '播放列表文件' },
      { name: 'Cache', desc: '缓存文件' },
      { name: 'Covers', desc: '封面图片' },
    ];

    for (const subDir of subDirs) {
      try {
        await Filesystem.mkdir({
          path: `${this.osuMusicDirectory}/${subDir.name}`,
          directory: Directory.Documents,
          recursive: true,
        });
        console.log(`[CapacitorPlatform] Created subdirectory: ${subDir.name}`);
      } catch (error) {
        console.warn(`[CapacitorPlatform] Failed to create subdirectory ${subDir.name}:`, error);
      }
    }

    // 创建说明文件
    await this.createReadmeFile();
  }

  private async createReadmeFile(): Promise<void> {
    try {
      const readmeContent = `OSU! Music 文件说明
===================

这是 OSU! Music 应用的文件存储目录。

📁 目录结构：
• Music/     - 存放导入的音乐文件
• Playlists/ - 存放播放列表文件  
• Cache/     - 临时缓存文件
• Covers/    - 音乐封面图片

📱 使用说明：
1. 可以通过"文件"应用访问这些文件
2. 可以手动添加音乐文件到 Music 文件夹
3. 支持的音乐格式: MP3, WAV, FLAC, OGG, M4A

⚠️ 注意：
- 请勿删除或修改 Playlists 文件夹中的文件
- Cache 文件夹中的文件可以安全删除

版本: ${new Date().toLocaleDateString('zh-CN')}
`;

      await Filesystem.writeFile({
        path: `${this.osuMusicDirectory}/README.txt`,
        data: readmeContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      console.log('[CapacitorPlatform] Created README file');
    } catch (error) {
      console.warn('[CapacitorPlatform] Failed to create README file:', error);
    }
  }

  async readFile(options: ReadFileOptions): Promise<string> {
    try {
      const result = await Filesystem.readFile({
        path: options.path,
        directory: Directory.Documents,
        encoding: options.encoding === 'base64' ? Encoding.UTF8 : Encoding.UTF8,
      });
      return result.data as string;
    } catch (error) {
      console.error('[CapacitorPlatform] Read file failed:', error);
      throw error;
    }
  }

  async writeFile(options: WriteFileOptions): Promise<void> {
    try {
      let data: string;
      if (typeof options.data === 'string') {
        data = options.data;
      } else {
        // Convert ArrayBuffer to base64
        const buffer = new Uint8Array(options.data);
        data = btoa(String.fromCharCode(...buffer));
      }

      await Filesystem.writeFile({
        path: options.path,
        data,
        directory: Directory.Documents,
        encoding: options.encoding === 'base64' ? Encoding.UTF8 : Encoding.UTF8,
      });
    } catch (error) {
      console.error('[CapacitorPlatform] Write file failed:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path,
        directory: Directory.Documents,
      });
    } catch (error) {
      console.error('[CapacitorPlatform] Delete file failed:', error);
      throw error;
    }
  }

  async createDirectory(path: string): Promise<void> {
    try {
      await Filesystem.mkdir({
        path,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch (error) {
      console.error('[CapacitorPlatform] Create directory failed:', error);
      throw error;
    }
  }

  async listDirectory(path: string): Promise<FileInfo[]> {
    try {
      const result = await Filesystem.readdir({
        path,
        directory: Directory.Documents,
      });

      const fileInfos: FileInfo[] = [];
      for (const file of result.files) {
        try {
          const stat = await Filesystem.stat({
            path: `${path}/${file.name}`,
            directory: Directory.Documents,
          });

          fileInfos.push({
            name: file.name,
            path: `${path}/${file.name}`,
            uri: stat.uri,
            size: stat.size,
            mtime: stat.mtime,
            type: stat.type === 'directory' ? 'directory' : 'file',
          });
        } catch (statError) {
          console.warn(`[CapacitorPlatform] Failed to stat file ${file.name}:`, statError);
        }
      }

      return fileInfos;
    } catch (error) {
      console.error('[CapacitorPlatform] List directory failed:', error);
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await Filesystem.stat({
        path,
        directory: Directory.Documents,
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAppDataDirectory(): Promise<string> {
    // 对于Capacitor，使用Data目录
    const result = await Filesystem.getUri({
      path: '',
      directory: Directory.Data,
    });
    return result.uri;
  }

  async getDocumentsDirectory(): Promise<string> {
    // 返回OSU Music专用目录，使用Documents目录以支持文件共享
    const result = await Filesystem.getUri({
      path: this.osuMusicDirectory,
      directory: Directory.Documents,
    });

    // 记录路径以便调试
    console.log('[CapacitorPlatform] OSU Music Documents Directory:', result.uri);
    return result.uri;
  }

  async getStorage(key: string): Promise<string | null> {
    try {
      const result = await Preferences.get({ key });
      return result.value;
    } catch (error) {
      console.error('[CapacitorPlatform] Get storage failed:', error);
      return null;
    }
  }

  async setStorage(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      console.error('[CapacitorPlatform] Set storage failed:', error);
      throw error;
    }
  }

  async removeStorage(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error('[CapacitorPlatform] Remove storage failed:', error);
      throw error;
    }
  }

  // OAuth状态管理
  private oauthPromise: {
    resolve: (result: OAuthResult) => void;
    reject: (error: Error) => void;
  } | null = null;

  async openOAuth(config: OAuthConfig): Promise<OAuthResult> {
    try {
      // 如果已经有OAuth进行中，拒绝新的请求
      if (this.oauthPromise) {
        throw new Error('OAuth already in progress');
      }

      // 构建OAuth URL
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(' '),
        response_type: 'code',
      });

      const authUrl = `${config.authUrl}?${params.toString()}`;

      console.log('[CapacitorPlatform] OAuth configuration:', {
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        scopes: config.scopes,
        authUrl: config.authUrl,
      });
      console.log('[CapacitorPlatform] Full OAuth URL:', authUrl);

      // 创建Promise来等待深链接回调
      const oauthPromise = new Promise<OAuthResult>((resolve, reject) => {
        this.oauthPromise = { resolve, reject };

        // 设置30秒超时
        setTimeout(() => {
          if (this.oauthPromise) {
            this.oauthPromise.reject(new Error('OAuth timeout'));
            this.oauthPromise = null;
          }
        }, 30000);
      });

      // 使用Capacitor Browser打开OAuth页面
      await Browser.open({
        url: authUrl,
        presentationStyle: 'popover',
        toolbarColor: '#000000',
      });

      console.log('[CapacitorPlatform] OAuth browser opened, waiting for callback...');

      // 等待深链接回调
      const result = await oauthPromise;
      this.oauthPromise = null;

      return result;
    } catch (error) {
      console.error('[CapacitorPlatform] OAuth failed:', error);
      this.oauthPromise = null;
      throw error;
    }
  }

  // 供深链接处理器调用的方法
  handleOAuthCallback(code?: string, error?: string): void {
    console.log('[CapacitorPlatform] handleOAuthCallback called with:', {
      hasCode: !!code,
      hasError: !!error,
      hasPromise: !!this.oauthPromise,
    });

    if (!this.oauthPromise) {
      console.warn('[CapacitorPlatform] OAuth callback received but no promise waiting');
      return;
    }

    try {
      if (error) {
        console.log('[CapacitorPlatform] Rejecting OAuth promise with error:', error);
        this.oauthPromise.reject(new Error(`OAuth error: ${error}`));
      } else if (code) {
        console.log('[CapacitorPlatform] Resolving OAuth promise with code');
        this.oauthPromise.resolve({ code });
      } else {
        console.log('[CapacitorPlatform] Rejecting OAuth promise - no code or error received');
        this.oauthPromise.reject(new Error('No code or error received'));
      }
    } catch (promiseError) {
      console.error('[CapacitorPlatform] Error handling OAuth callback:', promiseError);
    }

    this.oauthPromise = null;
    console.log('[CapacitorPlatform] OAuth promise cleared');
  }

  async fetchUserProfile<T = unknown>(accessToken: string): Promise<UserProfileResult<T>> {
    try {
      const response = await this.httpRequest<T>({
        url: 'https://osu.ppy.sh/api/v2/me',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      console.error('[CapacitorPlatform] Fetch user profile failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user profile',
        status:
          error && typeof error === 'object' && 'status' in error ? (error.status as number) : 500,
      };
    }
  }

  async pickFiles(options?: FilePickerOptions): Promise<SelectedFile[]> {
    // Capacitor没有内置的文件选择器，需要使用第三方插件或实现自定义解决方案
    // 这里提供一个基础实现，实际项目中可能需要安装额外的插件

    try {
      // 创建一个隐藏的file input元素
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';

      if (options?.accept) {
        input.accept = options.accept.join(',');
      }

      if (options?.multiple) {
        input.multiple = true;
      }

      document.body.appendChild(input);

      return new Promise((resolve, reject) => {
        input.onchange = async (event) => {
          const target = event.target as HTMLInputElement;
          const files = target.files;

          if (!files || files.length === 0) {
            resolve([]);
            return;
          }

          const selectedFiles: SelectedFile[] = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file) continue;

            const data = await file.arrayBuffer();

            selectedFiles.push({
              name: file.name,
              path: file.name, // 在移动端，path通常就是文件名
              uri: URL.createObjectURL(file),
              size: file.size,
              type: file.type,
              data,
            });
          }

          resolve(selectedFiles);
          document.body.removeChild(input);
        };

        input.onerror = () => {
          reject(new Error('File selection failed'));
          document.body.removeChild(input);
        };

        input.click();
      });
    } catch (error) {
      console.error('[CapacitorPlatform] Pick files failed:', error);
      throw error;
    }
  }

  addAppLifecycleListener(listener: AppLifecycleListener): () => void {
    const cleanupFunctions: (() => void)[] = [];

    // 监听应用状态变化
    if (listener.onAppStateChange) {
      App.addListener('appStateChange', (state: AppState) => {
        const appState = state.isActive ? 'active' : 'background';
        listener.onAppStateChange?.(appState);
      }).then((handle) => {
        cleanupFunctions.push(() => handle.remove());
      });
    }

    // 监听URL打开事件
    if (listener.onUrlOpen || listener.onDeepLink) {
      App.addListener('appUrlOpen', (data: AppLaunchUrl) => {
        listener.onUrlOpen?.(data.url);
        listener.onDeepLink?.(data.url);
      }).then((handle) => {
        cleanupFunctions.push(() => handle.remove());
      });
    }

    // 返回清理函数
    const cleanup = () => {
      cleanupFunctions.forEach((fn) => fn());
    };

    this.lifecycleListeners.push(cleanup);
    return cleanup;
  }

  async setStatusBarStyle(style: 'light' | 'dark'): Promise<void> {
    try {
      await StatusBar.setStyle({
        style: style === 'light' ? Style.Light : Style.Dark,
      });
    } catch (error) {
      console.error('[CapacitorPlatform] Set status bar style failed:', error);
    }
  }

  async showLoadingIndicator(message?: string): Promise<void> {
    // Capacitor没有内置的loading指示器，可以使用Quasar的Loading组件
    // 这里只提供一个基础实现
    console.log(`[CapacitorPlatform] Loading: ${message || 'Loading...'}`);
  }

  async hideLoadingIndicator(): Promise<void> {
    console.log('[CapacitorPlatform] Loading finished');
  }

  async showNotification(title: string, message: string): Promise<void> {
    // 对于移动端，通常使用推送通知，这里提供一个简单的实现
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body: message });
        }
      }
    } catch (error) {
      console.error('[CapacitorPlatform] Show notification failed:', error);
    }
  }

  // iOS特定方法：获取OSU Music目录的完整路径
  async getOsuMusicDirectory(): Promise<string> {
    const result = await Filesystem.getUri({
      path: this.osuMusicDirectory,
      directory: Directory.Documents,
    });
    return result.uri;
  }

  // iOS特定方法：确保OSU Music目录在Files app中可见
  async makeOsuDirectoryVisible(): Promise<void> {
    try {
      // 在Documents目录下创建.nomedia文件以确保目录可见
      await Filesystem.writeFile({
        path: `${this.osuMusicDirectory}/.nomedia`,
        data: '',
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
    } catch (error) {
      console.warn('[CapacitorPlatform] Failed to make OSU directory visible:', error);
    }
  }
}
