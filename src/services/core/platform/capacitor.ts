// src/services/core/platform/capacitor.ts
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
  private osuMusicDirectory = 'OSU-Music'; // 使用文件系统友好的目录名
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
      // 在iOS上，音频文件直接放在Documents根目录
      // 只需要创建playlists文件夹
      console.log('[CapacitorPlatform] Initializing iOS music directories...');

      // 只创建playlists文件夹，音频文件直接放在Documents根目录
      try {
        await Filesystem.stat({
          path: 'playlists',
          directory: Directory.Documents,
        });
        console.log('[CapacitorPlatform] Playlists directory already exists');
      } catch {
        // 目录不存在，创建它
        console.log('[CapacitorPlatform] Creating playlists directory');
        try {
          await Filesystem.mkdir({
            path: 'playlists',
            directory: Directory.Documents,
            recursive: true,
          });
          console.log('[CapacitorPlatform] Playlists directory created successfully');
        } catch (mkdirError) {
          // 如果创建失败，检查是否是因为目录已存在
          console.warn('[CapacitorPlatform] Failed to create playlists directory:', mkdirError);
          // 再次尝试stat，如果成功则目录实际存在
          try {
            await Filesystem.stat({
              path: 'playlists',
              directory: Directory.Documents,
            });
            console.log('[CapacitorPlatform] Playlists directory exists after mkdir failed');
          } catch (finalStatError) {
            console.error(
              '[CapacitorPlatform] Playlists directory creation failed permanently:',
              finalStatError,
            );
            throw finalStatError;
          }
        }
      }

      // 创建说明文件在Documents根目录
      await this.createReadmeFile();

      // 获取并记录实际的文件系统路径
      const documentsUri = await Filesystem.getUri({
        path: '',
        directory: Directory.Documents,
      });
      console.log('[CapacitorPlatform] Documents directory URI:', documentsUri.uri);
    } catch (error) {
      console.error('[CapacitorPlatform] Failed to initialize music directories:', error);
    }
  }

  private async createReadmeFile(): Promise<void> {
    try {
      const readmeContent = `OSU! Music 文件说明
===================

这是 OSU! Music 应用的文件存储目录。

📁 目录结构：
• 音乐文件 (mp3, ogg, wav, flac, m4a) - 直接放在此目录下
• playlists/ - 播放列表文件夹 (json格式)

📱 使用说明：
1. 可以通过"文件"应用访问这些文件
2. 音乐文件可以直接放在根目录下
3. 支持的音乐格式: MP3, WAV, FLAC, OGG, M4A
4. 播放列表文件自动保存在 playlists 文件夹

⚠️ 注意：
- 请勿删除或修改 playlists 文件夹中的文件
- 音乐文件可以直接添加到根目录

版本: ${new Date().toLocaleDateString('zh-CN')}
`;

      await Filesystem.writeFile({
        path: 'OSU-Music-README.txt',
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
      console.log('[CapacitorPlatform] Writing file:', {
        path: options.path,
        dataType: typeof options.data,
        isArrayBuffer: options.data instanceof ArrayBuffer,
        dataLength:
          options.data instanceof ArrayBuffer
            ? options.data.byteLength
            : typeof options.data === 'string'
              ? options.data.length
              : 'unknown',
        encoding: options.encoding,
      });

      if (typeof options.data === 'string') {
        // 文本数据直接写入
        await Filesystem.writeFile({
          path: options.path,
          data: options.data,
          directory: Directory.Documents,
          encoding: options.encoding === 'base64' ? Encoding.UTF8 : Encoding.UTF8,
        });
        console.log('[CapacitorPlatform] Text file written successfully');
      } else if (options.data instanceof ArrayBuffer) {
        // 对于二进制数据，使用更高效的方法
        console.log('[CapacitorPlatform] Writing binary data directly:', {
          originalSize: options.data.byteLength,
        });

        // 方法1：尝试使用 Capacitor 的内置二进制处理
        try {
          // 将 ArrayBuffer 转换为 base64，使用更安全的方法
          const bytes = new Uint8Array(options.data);
          let binaryString = '';

          // 分块处理避免栈溢出
          const chunkSize = 8192; // 8KB chunks
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.slice(i, i + chunkSize);
            binaryString += String.fromCharCode(...chunk);
          }

          const base64Data = btoa(binaryString);

          console.log('[CapacitorPlatform] Base64 conversion completed:', {
            originalSize: options.data.byteLength,
            base64Size: base64Data.length,
          });

          await Filesystem.writeFile({
            path: options.path,
            data: base64Data,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          });

          console.log('[CapacitorPlatform] Binary file written successfully');
        } catch (conversionError) {
          console.error(
            '[CapacitorPlatform] Base64 conversion failed, trying alternative method:',
            conversionError,
          );

          // 方法2：如果转换失败，尝试使用 FileReader（如果在支持的环境中）
          try {
            const blob = new Blob([options.data]);
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                if (!result) {
                  reject(new Error('FileReader returned empty result'));
                  return;
                }
                // 移除 data:xxx;base64, 前缀
                const base64 = result.split(',')[1];
                if (!base64) {
                  reject(new Error('Failed to extract base64 data from FileReader result'));
                  return;
                }
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            await Filesystem.writeFile({
              path: options.path,
              data: base64Data,
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
            });

            console.log('[CapacitorPlatform] Binary file written successfully using FileReader');
          } catch (fileReaderError) {
            console.error('[CapacitorPlatform] FileReader method also failed:', fileReaderError);
            throw new Error(`Failed to write binary file: ${fileReaderError}`);
          }
        }
      } else {
        throw new Error('Unsupported data type for file writing');
      }
    } catch (error) {
      console.error('[CapacitorPlatform] Write file failed:', {
        path: options.path,
        error: error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
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
    // 直接返回Documents目录的路径，不包含OSU Music子目录
    // 这样可以避免路径重复问题
    const result = await Filesystem.getUri({
      path: '',
      directory: Directory.Documents,
    });

    // 记录路径以便调试
    console.log('[CapacitorPlatform] Base Documents Directory:', result.uri);
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

        // 设置60秒超时（增加超时时间）
        setTimeout(() => {
          if (this.oauthPromise) {
            console.log('[CapacitorPlatform] OAuth timeout reached');
            this.oauthPromise.reject(
              new Error(
                'OAuth timeout - no callback received within 60 seconds. Please check:\n1. Redirect URI in OSU! developer console\n2. Network connectivity\n3. Browser settings',
              ),
            );
            this.oauthPromise = null;
          }
        }, 60000);
      });

      console.log('[CapacitorPlatform] Opening OAuth URL in browser...');

      // 使用Capacitor Browser打开OAuth页面
      await Browser.open({
        url: authUrl,
        presentationStyle: 'popover',
        toolbarColor: '#000000',
      });

      console.log('[CapacitorPlatform] OAuth browser opened, waiting for callback...');
      console.log(
        '[CapacitorPlatform] Expected callback URL should start with: osu-music-fusion://oauth/callback',
      );

      // 等待深链接回调
      const result = await oauthPromise;
      this.oauthPromise = null;

      console.log('[CapacitorPlatform] OAuth completed successfully');

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

  // iOS特定方法：获取Documents目录的完整路径
  async getOsuMusicDirectory(): Promise<string> {
    const result = await Filesystem.getUri({
      path: '',
      directory: Directory.Documents,
    });
    return result.uri;
  }

  // iOS特定方法：确保目录在Files app中可见
  async makeOsuDirectoryVisible(): Promise<void> {
    try {
      // 在Documents目录下创建.nomedia文件以确保目录可见
      await Filesystem.writeFile({
        path: '.nomedia',
        data: '',
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
    } catch (error) {
      console.warn('[CapacitorPlatform] Failed to make directory visible:', error);
    }
  }
}
