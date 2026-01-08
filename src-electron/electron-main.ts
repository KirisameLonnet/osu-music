import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import os from 'os';
import http from 'http'; // 新增: 用于 Linux 本地 OAuth 回调服务器
import { fileURLToPath } from 'url';
import type { Schema } from 'electron-store';
import Store from 'electron-store';
import axios from 'axios';
import type { AxiosError } from 'axios';
import fs from 'fs/promises';
import * as mm from 'music-metadata';

// Windows 调试优化配置
if (process.platform === 'win32' && process.env.NODE_ENV === 'development') {
  // 禁用 GPU 硬件加速以避免 Windows 下的渲染问题
  app.disableHardwareAcceleration();

  // 设置更友好的错误处理
  process.on('uncaughtException', (error) => {
    console.error('🔥 [Windows Debug] Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 [Windows Debug] Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // 禁用安全警告在开发环境
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';

  console.log('🔧 [Windows Debug] Optimization enabled');
  console.log('🔧 [Windows Debug] Platform:', process.platform, process.arch);
  console.log('🔧 [Windows Debug] Node.js:', process.version);
  console.log('🔧 [Windows Debug] Electron:', process.versions.electron);
}

/**
 * 跨平台路径工具函数
 * 获取统一的音乐存储目录路径
 */
function getMusicStoragePath(): string {
  try {
    // 使用 Electron 的 app.getPath('music') 获取系统音乐目录
    // 这个方法在所有平台上都会返回正确的音乐目录：
    // - Windows: %USERPROFILE%\Music
    // - macOS: ~/Music
    // - Linux: ~/Music (或 XDG_MUSIC_DIR)
    const systemMusicPath = app.getPath('music');
    return path.join(systemMusicPath, 'osu-music');
  } catch (error) {
    console.error('[Path Utils] Failed to get system music path, using fallback:', error);
    // 降级处理：使用用户主目录下的 Music/osu-music
    const homeDir = os.homedir();
    return path.join(homeDir, 'Music', 'osu-music');
  }
}

/**
 * 获取播放列表存储目录路径
 */
function getPlaylistStoragePath(): string {
  return path.join(getMusicStoragePath(), 'playlists');
}

/**
 * 确保目录存在（跨平台安全创建）
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`[Path Utils] Directory ensured: ${dirPath}`);
  } catch (error) {
    console.error(`[Path Utils] Failed to create directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * 清理文件名，移除不安全字符（跨平台兼容）
 */
function sanitizeFilename(filename: string): string {
  return (
    filename
      // 移除 Windows 非法字符: < > : " | ? * \
      .replace(/[<>:"/\\|?*]/g, '_')
      // 移除控制字符 (0x00-0x1F)
      .replace(/[\x00-\x1F]/g, '_') // eslint-disable-line no-control-regex
      // 移除开头和结尾的空格和点
      .replace(/^[\s.]+|[\s.]+$/g, '')
      // 限制长度（Windows 文件名限制）
      .substring(0, 255) ||
    // 确保不为空
    'untitled'
  );
}

/**
 * 验证路径安全性，防止路径遍历攻击
 */
function validatePath(userPath: string, baseDir: string): boolean {
  try {
    const resolvedPath = path.resolve(baseDir, userPath);
    const resolvedBase = path.resolve(baseDir);
    return resolvedPath.startsWith(resolvedBase);
  } catch (error) {
    console.error('[Path Utils] Path validation error:', error);
    return false;
  }
}

/**
 * 验证音频文件类型
 */
function isValidAudioFile(filename: string): boolean {
  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a'];
  const extension = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(extension);
}

/**
 * 验证beatmap下载的音频文件类型（支持MP3、OGG、FLAC）
 */
function isValidBeatmapAudioFile(filename: string): boolean {
  const allowedExtensions = ['.mp3', '.ogg', '.flac']; // 支持MP3、OGG、FLAC，排除WAV音效文件
  const extension = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(extension);
}

// 定义设置项的结构 (与渲染进程的 AppSettings 一致)
interface AppSettings {
  osuClientId: string | null;
  osuClientSecret: string | null;
}

// 定义 electron-store 的 schema
const schema: Schema<AppSettings> = {
  osuClientId: {
    type: ['string', 'null'], // 允许字符串或 null
    default: null,
  },
  osuClientSecret: {
    type: ['string', 'null'], // 允许字符串或 null
    default: null,
  },
};

// 初始化 electron-store 实例
const appSettingsStore = new Store<AppSettings>({ schema, name: 'app-settings' }); // 给 store 起个名字

const currentDir = fileURLToPath(new URL('.', import.meta.url));

const PROTOCOL_SCHEME = 'osu-music-fusion'; // 定义你的协议名称

let mainWindow: BrowserWindow | undefined;

// 确保应用是单例
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', (_, commandLine) => {
    console.log('[Main Process] second-instance triggered with commandLine:', commandLine);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const url = commandLine.pop()?.replace(/\/$/, ''); // 获取最后一个参数，通常是 URL
      console.log('[Main Process] Extracted URL from commandLine:', url);
      if (url && url.startsWith(`${PROTOCOL_SCHEME}://`)) {
        handleProtocolUrl(url);
      }
    }
  });
}

// 注册自定义协议 (Linux 开发模式需要特殊处理)
if (process.platform === 'linux' && process.env.DEV) {
  // Linux 开发模式：需要传入 electron 可执行文件和脚本路径
  const electronPath = process.execPath;
  const appPath = path.resolve(currentDir, '..');
  console.log('[Main Process] Linux dev mode - registering protocol with:', {
    electronPath,
    appPath,
  });
  app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, electronPath, [appPath]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}
console.log(
  `[Main Process] Protocol ${PROTOCOL_SCHEME}:// registered, platform: ${process.platform}, dev: ${!!process.env.DEV}`,
);

// 处理通过自定义协议打开应用的 URL
let pendingAuthCode: string | null = null; // 用于暂存 code

function handleProtocolUrl(url: string) {
  console.log('[Main Process] handleProtocolUrl called with URL:', url);
  try {
    const parsedUrl = new URL(url);
    console.log('[Main Process] Parsed URL Object:', parsedUrl); // 打印整个 URL 对象
    console.log('[Main Process] URL Search Params:', parsedUrl.search); // 打印 ?foo=bar&baz=qux
    console.log('[Main Process] URL SearchParams toString():', parsedUrl.searchParams.toString()); // 打印 foo=bar&baz=qux
    const authCode = parsedUrl.searchParams.get('code');
    const errorParam = parsedUrl.searchParams.get('error'); // 检查是否有 error 参数
    const errorDescriptionParam = parsedUrl.searchParams.get('error_description'); // 检查错误描述
    console.log('[Main Process] Extracted authCode:', authCode);
    if (errorParam) {
      console.error('[Main Process] OAuth Error from Osu!:', errorParam);
      if (errorDescriptionParam) {
        console.error('[Main Process] OAuth Error Description:', errorDescriptionParam);
      }
      // 通过 IPC 将错误信息传递给渲染进程
      if (mainWindow) {
        mainWindow.webContents.send('oauth-error-received', {
          error: errorParam,
          description: errorDescriptionParam,
        });
      }
      return; // 如果有错误，就不再尝试发送 code
    }
    if (authCode && mainWindow) {
      pendingAuthCode = authCode; // 暂存 code
      console.log('[Main Process] Auth code received and stashed:', pendingAuthCode);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('oauth-callback-pending'); // 只通知，不带 code
      console.log("[Main Process] Sent 'oauth-callback-pending' to renderer.");
    } else {
      console.error(
        '[Main Process] Could not extract code from protocol URL or mainWindow not available.',
      );
    }
  } catch (e) {
    console.error('[Main Process] Error parsing protocol URL or sending IPC:', e);
  }
}

// 新增: 渲染进程主动拉取 code
ipcMain.handle('get-pending-oauth-code', () => {
  if (pendingAuthCode) {
    const codeToReturn = pendingAuthCode;
    pendingAuthCode = null; // 获取后清除
    console.log('[Main Process] Renderer requested pending auth code, returning:', codeToReturn);
    return { success: true, code: codeToReturn };
  } else {
    console.warn('[Main Process] Renderer requested pending auth code, but none was found.');
    return { success: false, error: 'No pending auth code' };
  }
});

// ========== Linux 本地 OAuth 回调服务器 ==========
const OAUTH_CALLBACK_PORT = 42069;
let oauthCallbackServer: http.Server | null = null;

/**
 * 启动本地 OAuth 回调服务器 (Linux 开发模式专用)
 */
function startOAuthCallbackServer(): void {
  if (oauthCallbackServer) {
    console.log('[OAuth Server] Already running');
    return;
  }

  oauthCallbackServer = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${OAUTH_CALLBACK_PORT}`);

    if (url.pathname === '/oauth/callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      console.log('[OAuth Server] Received callback:', { code: code ? '***' : null, error });

      // 返回成功页面
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>OSU! Music - OAuth</title>
          <style>
            body { font-family: system-ui; background: #121218; color: #fff; 
                   display: flex; justify-content: center; align-items: center; 
                   height: 100vh; margin: 0; }
            .container { text-align: center; }
            h1 { color: #ff66aa; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${error ? '❌ Login Failed' : '✅ Login Successful!'}</h1>
            <p>${error ? errorDescription || error : 'You can close this window and return to the app.'}</p>
          </div>
        </body>
        </html>
      `);

      // 转发到主窗口
      if (error) {
        mainWindow?.webContents.send('oauth-error-received', {
          error,
          description: errorDescription,
        });
      } else if (code) {
        pendingAuthCode = code;
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('oauth-callback-pending');
        console.log('[OAuth Server] Sent oauth-callback-pending to renderer');
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  oauthCallbackServer.listen(OAUTH_CALLBACK_PORT, '127.0.0.1', () => {
    console.log(
      `[OAuth Server] Listening on http://127.0.0.1:${OAUTH_CALLBACK_PORT}/oauth/callback`,
    );
  });

  oauthCallbackServer.on('error', (err) => {
    console.error('[OAuth Server] Error:', err);
    oauthCallbackServer = null;
  });
}

// Electron 标准登录方式：始终启动本地回调服务器
startOAuthCallbackServer();

// IPC: 获取 OAuth 回调 URL (用于渲染进程)
ipcMain.handle('get-oauth-callback-url', () => {
  // 统一使用 localhost 回调（更可靠，跨平台兼容）
  return `http://127.0.0.1:${OAUTH_CALLBACK_PORT}/oauth/callback`;
});

async function createWindow() {
  /**
   * Initial window options
   */
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1200,
    height: 800,
    useContentSize: true,
    frame: false, // 创建无边框窗口 - 这会完全隐藏标题栏和红绿灯按钮
    show: false, // 先隐藏窗口，等加载完成后再显示
    webPreferences: {
      contextIsolation: true,
      webSecurity: process.env.NODE_ENV === 'production', // 生产环境启用安全限制
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
  };

  // Windows 特定优化
  if (process.platform === 'win32') {
    // Windows ARM64 特殊处理
    if (process.arch === 'arm64' || process.env.ELECTRON_BUILDER_ARCH === 'arm64') {
      // ARM64 特定优化：更保守的设置以提高兼容性
      windowOptions.webPreferences = {
        ...windowOptions.webPreferences,
        nodeIntegration: false,
        // 禁用一些可能在 ARM64 上有问题的实验性功能
        experimentalFeatures: false,
        // 强制软件渲染以避免 GPU 兼容性问题
        offscreen: false,
      };

      // 禁用硬件加速以提高 ARM64 兼容性
      if (!app.isReady()) {
        app.disableHardwareAcceleration();
      }

      console.log('🔧 [Windows ARM64] Applied ARM64-specific optimizations');
    } else {
      // x64 优化设置
      windowOptions.webPreferences = {
        ...windowOptions.webPreferences,
        nodeIntegration: false,
        experimentalFeatures: true,
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 [Windows Debug] Applied Windows-specific optimizations');
    }
  }

  mainWindow = new BrowserWindow(windowOptions);

  // 窗口加载完成后显示，避免白屏闪烁
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();

      // ARM64 特定：延迟一点确保渲染稳定
      if (
        process.platform === 'win32' &&
        (process.arch === 'arm64' || process.env.ELECTRON_BUILDER_ARCH === 'arm64')
      ) {
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
          }
        }, 500);
      }
    }
  });

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL);
  } else {
    await mainWindow.loadFile('index.html');
  }

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else if (process.env.NODE_ENV === 'development') {
    // Windows 特定的调试优化
    if (process.platform === 'win32') {
      // 延迟打开开发者工具以避免初始化问题
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.openDevTools({ mode: 'detach' });
          console.log('🔧 [Windows Debug] DevTools opened in detached mode');
        }
      }, 1500);
    } else {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

void app.whenReady().then(() => {
  void createWindow();

  // 处理 macOS 上的 open-url 事件
  app.on('open-url', (event, url) => {
    console.log('[Main Process] open-url triggered with URL:', url);
    event.preventDefault();
    if (mainWindow) {
      handleProtocolUrl(url);
    } else {
      console.warn('[Main Process] Received open-url before mainWindow was ready. URL:', url);
    }
  });

  // --- IPC Handlers for Settings Store ---
  ipcMain.handle('settings:get', (event, key: keyof AppSettings, defaultValue?: unknown) => {
    console.log(
      `[Main IPC] settings:get received - Key: ${String(key)}, DefaultValue: ${String(defaultValue)}`,
    );
    try {
      const value = appSettingsStore.get(key, defaultValue as string | null);
      console.log(`[Main IPC] settings:get returning - Value: ${String(value)}`);
      return value;
    } catch (error) {
      console.error(`[Main IPC] settings:get failed - Key: ${key}, Error:`, error);
      return defaultValue;
    }
  });

  ipcMain.on('settings:set', (event, key: keyof AppSettings, value: string | null) => {
    console.log(`[Main IPC] settings:set received - Key: ${key}, Value: ${value}`);
    try {
      appSettingsStore.set(key, value);
      console.log(
        `[Main IPC] settings:set - ${key} successfully set to "${value}" in electron-store. File should be at: ${appSettingsStore.path}`,
      );
    } catch (error) {
      console.error(`[Main IPC] settings:set - Error setting ${key} in electron-store:`, error);
    }
  });

  // --- IPC Handlers for Platform Storage ---
  ipcMain.handle('get-storage', (event, key: string) => {
    console.log(`[Main IPC] get-storage received - Key: ${key}`);
    try {
      const value = appSettingsStore.get(key, null);
      console.log(`[Main IPC] get-storage returning - Value: ${String(value)}`);
      return value;
    } catch (error) {
      console.error(`[Main IPC] get-storage failed - Key: ${key}, Error:`, error);
      return null;
    }
  });

  ipcMain.handle('set-storage', (event, key: string, value: string) => {
    console.log(`[Main IPC] set-storage received - Key: ${key}, Value: ${value}`);
    try {
      appSettingsStore.set(key, value);
      console.log(`[Main IPC] set-storage - ${key} successfully set to "${value}"`);
    } catch (error) {
      console.error(`[Main IPC] set-storage - Error setting ${key}:`, error);
      throw error;
    }
  });

  ipcMain.handle('remove-storage', (event, key: string) => {
    console.log(`[Main IPC] remove-storage received - Key: ${key}`);
    try {
      appSettingsStore.delete(key);
      console.log(`[Main IPC] remove-storage - ${key} successfully removed`);
    } catch (error) {
      console.error(`[Main IPC] remove-storage - Error removing ${key}:`, error);
      throw error;
    }
  });

  // --- IPC Handlers for File System ---
  ipcMain.handle('get-app-data-directory', () => {
    console.log('[Main IPC] get-app-data-directory received');
    try {
      const appDataPath = app.getPath('userData');
      console.log(`[Main IPC] get-app-data-directory returning: ${appDataPath}`);
      return appDataPath;
    } catch (error) {
      console.error('[Main IPC] get-app-data-directory failed:', error);
      throw error;
    }
  });

  ipcMain.handle('get-documents-directory', () => {
    console.log('[Main IPC] get-documents-directory received');
    try {
      const documentsPath = app.getPath('documents');
      console.log(`[Main IPC] get-documents-directory returning: ${documentsPath}`);
      return documentsPath;
    } catch (error) {
      console.error('[Main IPC] get-documents-directory failed:', error);
      throw error;
    }
  });

  ipcMain.handle('get-music-directory', () => {
    console.log('[Main IPC] get-music-directory received');
    try {
      const musicPath = getMusicStoragePath();
      console.log(`[Main IPC] get-music-directory returning: ${musicPath}`);
      return musicPath;
    } catch (error) {
      console.error('[Main IPC] get-music-directory failed:', error);
      throw error;
    }
  });

  ipcMain.handle('read-file', async (event, options: { path: string; encoding?: string }) => {
    console.log(`[Main IPC] read-file received - Path: ${options.path}`);
    try {
      const encoding = options.encoding || 'utf8';
      const content = await fs.readFile(options.path, { encoding: encoding as BufferEncoding });
      console.log(`[Main IPC] read-file success - Size: ${content.length} chars`);
      return content;
    } catch (error) {
      console.error(`[Main IPC] read-file failed - Path: ${options.path}, Error:`, error);
      throw error;
    }
  });

  ipcMain.handle(
    'write-file',
    async (
      event,
      options: { path: string; data: string | Buffer; encoding?: string; recursive?: boolean },
    ) => {
      console.log(`[Main IPC] write-file received - Path: ${options.path}`);
      try {
        if (options.recursive) {
          const dir = path.dirname(options.path);
          await fs.mkdir(dir, { recursive: true });
        }
        const encoding = options.encoding || 'utf8';
        await fs.writeFile(options.path, options.data, { encoding: encoding as BufferEncoding });
        console.log(`[Main IPC] write-file success - Path: ${options.path}`);
      } catch (error) {
        console.error(`[Main IPC] write-file failed - Path: ${options.path}, Error:`, error);
        throw error;
      }
    },
  );

  ipcMain.handle('delete-file', async (event, filePath: string) => {
    console.log(`[Main IPC] delete-file received - Path: ${filePath}`);
    try {
      await fs.unlink(filePath);
      console.log(`[Main IPC] delete-file success - Path: ${filePath}`);
    } catch (error) {
      console.error(`[Main IPC] delete-file failed - Path: ${filePath}, Error:`, error);
      throw error;
    }
  });

  ipcMain.handle('create-directory', async (event, dirPath: string) => {
    console.log(`[Main IPC] create-directory received - Path: ${dirPath}`);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`[Main IPC] create-directory success - Path: ${dirPath}`);
    } catch (error) {
      console.error(`[Main IPC] create-directory failed - Path: ${dirPath}, Error:`, error);
      throw error;
    }
  });

  ipcMain.handle('list-directory', async (event, dirPath: string) => {
    console.log(`[Main IPC] list-directory received - Path: ${dirPath}`);
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const result = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          const stats = await fs.stat(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            uri: `file://${fullPath}`,
            size: stats.size,
            mtime: stats.mtime.getTime(),
            type: entry.isDirectory() ? 'directory' : 'file',
          };
        }),
      );
      console.log(`[Main IPC] list-directory success - Found ${result.length} entries`);
      return result;
    } catch (error) {
      console.error(`[Main IPC] list-directory failed - Path: ${dirPath}, Error:`, error);
      throw error;
    }
  });

  ipcMain.handle('file-exists', async (event, filePath: string) => {
    console.log(`[Main IPC] file-exists received - Path: ${filePath}`);
    try {
      await fs.access(filePath);
      console.log(`[Main IPC] file-exists success - Path exists: ${filePath}`);
      return true;
    } catch {
      console.log(`[Main IPC] file-exists - Path does not exist: ${filePath}`);
      return false;
    }
  });

  ipcMain.handle(
    'http-request',
    async (
      event,
      request: {
        url: string;
        method: string;
        headers?: Record<string, string>;
        data?: unknown;
        params?: Record<string, string>;
        timeout?: number;
      },
    ) => {
      console.log(`[Main IPC] http-request received - ${request.method} ${request.url}`);
      try {
        interface RequestConfig {
          url: string;
          method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
          timeout: number;
          headers?: Record<string, string>;
          data?: unknown;
          params?: Record<string, string>;
        }

        const config: RequestConfig = {
          url: request.url,
          method: request.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
          timeout: request.timeout || 30000,
        };

        if (request.headers) {
          config.headers = request.headers;
        }
        if (request.data) {
          config.data = request.data;
        }
        if (request.params) {
          config.params = request.params;
        }

        const response = await axios(config);

        console.log(`[Main IPC] http-request success - Status: ${response.status}`);
        return {
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
        };
      } catch (error) {
        console.error(`[Main IPC] http-request failed - ${request.method} ${request.url}:`, error);
        throw error;
      }
    },
  );

  // 处理获取初始全屏状态的请求
  ipcMain.handle('get-initial-fullscreen-state', () => {
    return mainWindow?.isFullScreen() || false;
  });

  ipcMain.handle('get-initial-maximize-state', () => {
    return mainWindow?.isMaximized() || false;
  });

  // 新增：自定义红绿灯按钮的窗口控制处理程序
  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:toggle-maximize', () => {
    // 在 macOS 上，绿色按钮应该切换全屏模式
    if (process.platform === 'darwin') {
      if (mainWindow?.isFullScreen()) {
        mainWindow.setFullScreen(false);
      } else {
        mainWindow?.setFullScreen(true);
      }
    } else {
      // 在其他平台上，使用传统的最大化/还原
      if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow?.maximize();
      }
    }
  });

  // 监听窗口事件并通知渲染进程
  mainWindow?.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized');
  });
  mainWindow?.on('unmaximize', () => {
    mainWindow?.webContents.send('window-unmaximized');
  });
  mainWindow?.on('enter-full-screen', () => {
    mainWindow?.webContents.send('enter-full-screen');
  });
  mainWindow?.on('leave-full-screen', () => {
    mainWindow?.webContents.send('leave-full-screen');
  });

  // IPC handlers for window controls
  ipcMain.on('minimize-window', () => {
    mainWindow?.minimize();
  });
  ipcMain.on('toggle-maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('close-window', () => {
    mainWindow?.close();
  });

  // IPC handler for opening external URLs (OAuth)
  ipcMain.on('open-external-url', (event, url: string) => {
    console.log('[Main Process] Opening external URL:', url);
    shell.openExternal(url).catch((error: Error) => {
      console.error('[Main Process] Failed to open external URL:', error);
    });
  });

  // --- 新增: 处理 Osu! token 交换 ---
  ipcMain.handle('exchange-osu-token', async (event, { code, clientId, clientSecret }) => {
    try {
      const payload = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'osu-music-fusion://oauth/callback',
      });
      const response = await axios.post('https://osu.ppy.sh/oauth/token', payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError?.(error)) {
        return { error: true, message: error.response?.data || error.message };
      }
      return { error: true, message: String(error) };
    }
  });

  // --- 新增: 代理获取 Osu! 用户信息 ---
  ipcMain.handle('fetch-osu-user-profile', async (event, accessToken: string | null) => {
    console.log('[Main Process] Received fetch-osu-user-profile request.');
    if (!accessToken) {
      console.error('[Main Process] No access token provided for fetching user profile.');
      return { success: false, error: 'Access token is missing', status: 401 };
    }
    const OSU_API_ME_URL = 'https://osu.ppy.sh/api/v2/me';
    try {
      const response = await axios.get(OSU_API_ME_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      console.log('[Main Process] User profile fetched successfully:', response.data);
      return { success: true, data: response.data };
    } catch (error: unknown) {
      let errorMessage = 'Unknown error fetching profile';
      let errorStatus: number | undefined = undefined;
      let errorData: unknown = undefined;

      if (typeof error === 'object' && error !== null) {
        const err = error as {
          response?: { data?: { message?: string }; status?: number };
          message?: string;
        };
        errorData = err.response?.data;
        errorMessage = err.response?.data?.message || err.message || errorMessage;
        errorStatus = err.response?.status;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.error(
        '[Main Process] Error fetching Osu! user profile in main process:',
        errorData || errorMessage,
      );
      return {
        success: false,
        error: errorMessage,
        status: errorStatus,
      };
    }
  });

  // 新增 IPC 处理器，用于从外部 URL 获取音频数据并返回 Data URL
  ipcMain.handle('fetch-audio-data', async (event, url) => {
    // 确保 URL 包含协议
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    console.log(`[Main Process] Attempting to fetch audio from: ${url}`);
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000, // 设置超时为15秒
      });
      console.log(`[Main Process] Axios GET request to ${url} status: ${response.status}`);
      const base64Audio = Buffer.from(response.data).toString('base64');
      return `data:audio/mpeg;base64,${base64Audio}`;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`[Main Process] AXIOS ERROR fetching audio from ${url}:`);
      if (axiosError.response) {
        console.error('[Main Process] Error Response Data:', axiosError.response.data);
        console.error('[Main Process] Error Response Status:', axiosError.response.status);
        console.error('[Main Process] Error Response Headers:', axiosError.response.headers);
      } else if (axiosError.request) {
        console.error('[Main Process] Error Request Data:', axiosError.request);
      } else {
        console.error('[Main Process] Error Message:', axiosError.message);
      }
      console.error('[Main Process] Error Config:', axiosError.config);
      throw new Error(`Failed to fetch audio data from main: ${axiosError.message}`);
    }
  });

  // 新增: 处理从 beatmap 下载的音频文件保存请求
  ipcMain.handle('save-audio-file', async (event, { fileName, data }) => {
    if (!fileName || !data) {
      return { success: false, error: 'fileName and data are required' };
    }

    try {
      // 1. 清理和验证文件名
      const sanitizedFileName = sanitizeFilename(fileName);
      if (!isValidBeatmapAudioFile(sanitizedFileName)) {
        return {
          success: false,
          error:
            'Invalid audio file type (only MP3, OGG, and FLAC files are supported for beatmap downloads)',
        };
      }

      // 2. 确保音乐文件夹存在
      const musicFolderPath = getMusicStoragePath();
      await ensureDirectoryExists(musicFolderPath);

      // 3. 验证路径安全性
      if (!validatePath(sanitizedFileName, musicFolderPath)) {
        return { success: false, error: 'Invalid file path' };
      }

      // 4. 生成完整的文件保存路径
      const filePath = path.join(musicFolderPath, sanitizedFileName);

      // 5. 检查文件大小限制 (100MB)
      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      if (data.length > MAX_FILE_SIZE) {
        return { success: false, error: 'File too large (max 100MB)' };
      }

      // 6. 将数组转换为 Buffer 并保存文件
      const buffer = Buffer.from(data);
      await fs.writeFile(filePath, buffer, { mode: 0o644 });

      console.log(`[Main Process] Audio file saved successfully: ${filePath}`);
      return { success: true, filePath };
    } catch (error) {
      console.error('[Main Process] Error saving audio file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // 新增: 处理 beatmap .osz 文件下载请求
  ipcMain.handle('download-beatmap-osz', async (event, { beatmapsetId, accessToken }) => {
    if (!beatmapsetId || !accessToken) {
      return { success: false, error: 'beatmapsetId and accessToken are required' };
    }

    try {
      const oszUrl = `https://osu.ppy.sh/beatmapsets/${beatmapsetId}/download`;

      console.log(`[Main Process] Downloading .osz file from: ${oszUrl}`);

      const response = await axios.get(oszUrl, {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'osu-music-fusion/1.0.0',
        },
        timeout: 60000, // 60秒超时
        maxRedirects: 5, // 允许重定向
      });

      console.log(`[Main Process] .osz download response status: ${response.status}`);
      console.log(`[Main Process] .osz download response headers:`, response.headers);
      console.log(
        `[Main Process] .osz download completed, size: ${response.data.byteLength} bytes`,
      );

      // 验证响应是否为ZIP文件
      const firstBytes = new Uint8Array(response.data.slice(0, 4));
      const zipSignature = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"
      const isValidZip = zipSignature.every((byte, index) => firstBytes[index] === byte);

      if (!isValidZip) {
        console.error(
          `[Main Process] Downloaded file is not a valid ZIP. First 4 bytes: [${Array.from(
            firstBytes,
          )
            .map((b) => `0x${b.toString(16).padStart(2, '0')}`)
            .join(', ')}]`,
        );

        // 尝试解析响应内容以获取更多信息
        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        const textContent = textDecoder.decode(
          response.data.slice(0, Math.min(1024, response.data.byteLength)),
        );
        console.error(`[Main Process] Response content preview: ${textContent}`);

        return {
          success: false,
          error: `Server returned invalid data (not a ZIP file). Content-Type: ${response.headers['content-type'] || 'unknown'}. First 1024 chars: ${textContent.substring(0, 500)}...`,
        };
      }

      console.log(`[Main Process] ZIP file validation passed`);

      // 返回下载的数据作为字节数组
      return {
        success: true,
        data: Array.from(new Uint8Array(response.data)),
      };
    } catch (error) {
      console.error('[Main Process] Error downloading .osz file:', error);

      let errorMessage = 'Unknown error occurred';
      if (axios.isAxiosError(error)) {
        errorMessage = `HTTP ${error.response?.status || 'unknown'}: ${error.response?.statusText || error.message}`;
        if (error.response?.data) {
          // 尝试解析错误响应
          try {
            const textDecoder = new TextDecoder('utf-8', { fatal: false });
            const errorContent = textDecoder.decode(
              error.response.data.slice(0, Math.min(512, error.response.data.byteLength)),
            );
            errorMessage += `. Server response: ${errorContent}`;
          } catch (decodeError) {
            console.error('[Main Process] Failed to decode error response:', decodeError);
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  });

  // 新增: 处理从公共镜像站下载 beatmap .osz 文件的请求
  ipcMain.handle('download-beatmap-osz-public', async (event, { url, beatmapsetId }) => {
    if (!url || !beatmapsetId) {
      return { success: false, error: 'url and beatmapsetId are required' };
    }

    try {
      console.log(`[Main Process] Downloading .osz file from public mirror: ${url}`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'osu-music-fusion/1.0.0',
          Accept: 'application/octet-stream, application/zip, */*',
        },
        timeout: 60000, // 60秒超时
        maxRedirects: 5, // 允许重定向
        validateStatus: (status) => status < 500, // 接受所有非5xx状态码
      });

      console.log(`[Main Process] Public mirror download response status: ${response.status}`);
      console.log(`[Main Process] Public mirror download response headers:`, response.headers);

      if (response.status !== 200) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}. Server may not have this beatmap available.`,
        };
      }

      if (!response.data || response.data.byteLength === 0) {
        return {
          success: false,
          error: 'Downloaded file is empty',
        };
      }

      console.log(
        `[Main Process] Public mirror download completed, size: ${response.data.byteLength} bytes`,
      );

      // 验证响应是否为ZIP文件（.osz 本质上是ZIP文件）
      const firstBytes = new Uint8Array(response.data.slice(0, 4));
      const zipSignature = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"
      const altZipSignature = [0x50, 0x4b, 0x05, 0x06]; // "PK\x05\x06" (空ZIP)
      const isValidZip =
        zipSignature.every((byte, index) => firstBytes[index] === byte) ||
        altZipSignature.every((byte, index) => firstBytes[index] === byte);

      if (!isValidZip) {
        console.error(
          `[Main Process] Downloaded file from ${url} is not a valid ZIP. First 4 bytes: [${Array.from(
            firstBytes,
          )
            .map((b) => `0x${b.toString(16).padStart(2, '0')}`)
            .join(', ')}]`,
        );

        // 尝试解析响应内容以获取更多信息
        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        const textContent = textDecoder.decode(
          response.data.slice(0, Math.min(1024, response.data.byteLength)),
        );
        console.error(`[Main Process] Response content preview: ${textContent}`);

        return {
          success: false,
          error: `Mirror returned invalid data (not a ZIP file). This may be a rate limit or the beatmap may not be available on this mirror. Content preview: ${textContent.substring(0, 200)}...`,
        };
      }

      console.log(`[Main Process] ZIP file validation passed for public mirror download`);

      // 返回下载的数据作为ArrayBuffer
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(`[Main Process] Error downloading .osz file from public mirror ${url}:`, error);

      let errorMessage = 'Unknown error occurred';
      if (axios.isAxiosError(error)) {
        if (error.response) {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          if (error.response.status === 404) {
            errorMessage += '. This beatmap may not be available on this mirror.';
          } else if (error.response.status === 429) {
            errorMessage += '. Rate limit exceeded on this mirror.';
          } else if (error.response.status >= 500) {
            errorMessage += '. Mirror server error.';
          }

          // 尝试解析错误响应内容
          if (error.response.data) {
            try {
              const textDecoder = new TextDecoder('utf-8', { fatal: false });
              const errorContent = textDecoder.decode(
                error.response.data.slice(0, Math.min(512, error.response.data.byteLength)),
              );
              if (errorContent.trim()) {
                errorMessage += ` Server response: ${errorContent.substring(0, 200)}`;
              }
            } catch (decodeError) {
              console.error('[Main Process] Failed to decode mirror error response:', decodeError);
            }
          }
        } else if (error.request) {
          errorMessage = `Network error: ${error.message}. Mirror may be unreachable.`;
        } else {
          errorMessage = `Request setup error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  });

  // 新增: 为音频文件创建 blob URL
  ipcMain.handle('get-audio-blob-url', async (event, filePath: string) => {
    try {
      // 验证文件路径安全性
      const musicFolderPath = getMusicStoragePath();
      if (!validatePath(filePath, musicFolderPath)) {
        throw new Error('Invalid file path');
      }

      // 验证文件类型
      if (!isValidAudioFile(path.basename(filePath))) {
        throw new Error('Invalid audio file type');
      }

      // 读取文件内容
      const audioBuffer = await fs.readFile(filePath);

      // 转换为 Base64
      const base64Audio = audioBuffer.toString('base64');

      // 获取 MIME 类型
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'audio/mpeg'; // 默认为 MP3

      switch (ext) {
        case '.mp3':
          mimeType = 'audio/mpeg';
          break;
        case '.wav':
          mimeType = 'audio/wav';
          break;
        case '.ogg':
          mimeType = 'audio/ogg';
          break;
        case '.flac':
          mimeType = 'audio/flac';
          break;
        case '.m4a':
          mimeType = 'audio/mp4';
          break;
      }

      // 返回 Data URL
      const dataUrl = `data:${mimeType};base64,${base64Audio}`;

      console.log(`[Main Process] Created audio blob URL for: ${filePath}`);
      return { success: true, dataUrl };
    } catch (error) {
      console.error('[Main Process] Error creating audio blob URL:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // 新增: 扫描音乐文件夹获取音乐文件列表
  ipcMain.handle('scan-music-folder', async () => {
    try {
      const musicFolderPath = getMusicStoragePath();
      await ensureDirectoryExists(musicFolderPath);
      async function scanAudioFilesRecursive(dir: string): Promise<string[]> {
        let results: string[] = [];
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const file of list) {
          const filePath = path.join(dir, file.name);
          if (file.isDirectory()) {
            results = results.concat(await scanAudioFilesRecursive(filePath));
          } else if (isValidAudioFile(file.name)) {
            results.push(filePath);
          }
        }
        return results;
      }
      const audioFiles = await scanAudioFilesRecursive(musicFolderPath);
      // 定义更具体的结构体类型
      interface AudioFileInfo {
        id: string;
        title: string;
        artist: string;
        album: string;
        duration: number | undefined;
        filePath: string;
        fileName: string;
        coverUrl: string | undefined;
        addedDate: string;
      }
      const files: AudioFileInfo[] = [];
      for (const filePath of audioFiles) {
        try {
          const fileName = path.basename(filePath);
          let id = fileName.split('-')[0] || fileName;
          if (!/^\d+$/.test(id)) id = fileName;
          // 读取文件元数据
          try {
            const metadata = await mm.parseFile(filePath, { duration: true });
            const fileStat = await fs.stat(filePath);
            files.push({
              id,
              title: metadata.common.title || fileName.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, ''),
              artist: metadata.common.artist || '',
              album: metadata.common.album || '',
              duration: metadata.format.duration ? Math.round(metadata.format.duration) : undefined,
              filePath,
              fileName,
              coverUrl: undefined,
              addedDate: fileStat.birthtime.toISOString(),
            });
          } catch (err) {
            console.warn('[Main Process] Failed to read metadata for', filePath, err);
          }
        } catch (err) {
          console.warn('[Main Process] Failed to read metadata for', filePath, err);
        }
      }
      return { success: true, files };
    } catch (error) {
      console.error('[Main Process] scan-music-folder error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // 新增: 加载歌单文件
  ipcMain.handle('load-playlist-files', async () => {
    try {
      const playlistsFolderPath = getPlaylistStoragePath();

      // 确保歌单文件夹存在
      await ensureDirectoryExists(playlistsFolderPath);

      // 扫描歌单文件
      const files = await fs.readdir(playlistsFolderPath);
      const playlistFiles = files.filter((file) => file.endsWith('.json'));

      const playlists: unknown[] = [];

      for (const file of playlistFiles) {
        try {
          const filePath = path.join(playlistsFolderPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const playlist = JSON.parse(content);
          playlists.push(playlist);
        } catch (fileError) {
          console.warn(`[Main Process] Failed to load playlist file ${file}:`, fileError);
        }
      }

      console.log(`[Main Process] Loaded ${playlists.length} playlist files`);
      return { success: true, playlists };
    } catch (error) {
      console.error('[Main Process] Error loading playlist files:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // 新增: 保存歌单文件
  ipcMain.handle('save-playlist-file', async (event, filename, playlist) => {
    if (!filename || !playlist || !playlist.id) {
      return { success: false, error: 'Invalid playlist data or filename' };
    }

    try {
      // 1. 清理和验证文件名
      const sanitizedFilename = sanitizeFilename(filename);
      if (!sanitizedFilename.endsWith('.json')) {
        return { success: false, error: 'Invalid playlist file type' };
      }

      // 2. 确保歌单文件夹存在
      const playlistsFolderPath = getPlaylistStoragePath();
      await ensureDirectoryExists(playlistsFolderPath);

      // 3. 验证路径安全性
      if (!validatePath(sanitizedFilename, playlistsFolderPath)) {
        return { success: false, error: 'Invalid file path' };
      }

      // 4. 生成文件路径
      const filePath = path.join(playlistsFolderPath, sanitizedFilename);

      // 5. 验证播放列表数据大小 (1MB 限制)
      const playlistJson = JSON.stringify(playlist, null, 2);
      const MAX_PLAYLIST_SIZE = 1024 * 1024; // 1MB
      if (Buffer.byteLength(playlistJson, 'utf8') > MAX_PLAYLIST_SIZE) {
        return { success: false, error: 'Playlist too large (max 1MB)' };
      }

      // 6. 保存歌单文件
      await fs.writeFile(filePath, playlistJson, { encoding: 'utf-8', mode: 0o644 });

      console.log(`[Main Process] Saved playlist file: ${filePath}`);
      return { success: true, filePath };
    } catch (error) {
      console.error('[Main Process] Error saving playlist file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // 新增: 删除歌单文件
  ipcMain.handle('delete-playlist-file', async (event, filename) => {
    if (!filename) {
      return { success: false, error: 'Filename is required' };
    }

    try {
      const playlistsFolderPath = getPlaylistStoragePath();
      const filePath = path.join(playlistsFolderPath, filename);

      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch {
        return { success: false, error: 'Playlist file not found' };
      }

      // 删除文件
      await fs.unlink(filePath);

      console.log(`[Main Process] Deleted playlist file: ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] Error deleting playlist file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // 注册 get-audio-metadata handler，返回音频文件时长（秒）
  ipcMain.handle('get-audio-metadata', async (event, filePath) => {
    try {
      const metadata = await mm.parseFile(filePath);
      return Math.floor(metadata.format.duration || 0);
    } catch (e) {
      console.error('[get-audio-metadata] Failed to parse', filePath, e);
      return 0;
    }
  });

  // 新增: 删除音乐文件
  ipcMain.handle('delete-music-file', async (event, filePath) => {
    if (!filePath) {
      return { success: false, error: 'File path is required' };
    }

    try {
      // 验证文件路径安全性
      const musicFolderPath = getMusicStoragePath();
      if (!validatePath(filePath, musicFolderPath)) {
        return { success: false, error: 'Invalid file path' };
      }

      // 验证文件类型
      if (!isValidAudioFile(path.basename(filePath))) {
        return { success: false, error: 'Invalid audio file type' };
      }

      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch {
        return { success: false, error: 'Music file not found' };
      }

      // 删除文件
      await fs.unlink(filePath);

      console.log(`[Main Process] Deleted music file: ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error('[Main Process] Error deleting music file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // --- 新增: 处理OAuth启动请求 ---
  ipcMain.handle('open-oauth', async (event, config) => {
    try {
      console.log('[Main Process] Opening OAuth URL with config:', config);

      // 构建OAuth URL
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(' '),
        response_type: 'code',
      });

      const authUrl = `${config.authUrl}?${params.toString()}`;
      console.log('[Main Process] OAuth URL:', authUrl);

      // 清除之前的pending code
      pendingAuthCode = null;

      // 使用系统浏览器打开OAuth页面
      await shell.openExternal(authUrl);

      console.log('[Main Process] OAuth URL opened, waiting for callback...');

      // 等待深链接回调，最多等待60秒
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: 'OAuth timeout - no callback received within 60 seconds',
          });
        }, 60000);

        // 监听深链接回调
        const checkForCode = () => {
          if (pendingAuthCode) {
            clearTimeout(timeout);
            const code = pendingAuthCode;
            pendingAuthCode = null;
            console.log('[Main Process] OAuth callback received, returning code');
            resolve({ success: true, code });
          } else {
            // 每500ms检查一次
            setTimeout(checkForCode, 500);
          }
        };

        // 开始检查
        checkForCode();
      });
    } catch (error) {
      console.error('[Main Process] Failed to open OAuth URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open OAuth URL',
      };
    }
  });
});
