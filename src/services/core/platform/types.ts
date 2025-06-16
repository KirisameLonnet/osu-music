// src/services/core/platform/types.ts
// 统一的跨平台接口定义

export enum PlatformType {
  ELECTRON = 'electron',
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export interface PlatformInfo {
  type: PlatformType;
  version: string;
  isNative: boolean;
  isDesktop: boolean;
  isMobile: boolean;
}

// HTTP请求接口
export interface HttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: string | FormData | URLSearchParams | Record<string, unknown>;
  params?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// 文件系统接口
export interface FileInfo {
  name: string;
  path: string;
  uri: string;
  size: number;
  mtime: number;
  type: 'file' | 'directory';
}

export interface WriteFileOptions {
  path: string;
  data: string | ArrayBuffer;
  encoding?: 'utf8' | 'base64';
  recursive?: boolean;
}

export interface ReadFileOptions {
  path: string;
  encoding?: 'utf8' | 'base64';
}

// 存储接口
export interface StorageOptions {
  key: string;
  value?: string;
}

// OAuth接口
export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthResult {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
}

// 用户配置文件接口
export interface UserProfileResult<T = unknown> {
  success: boolean;
  data?: T;
  status?: number;
  error?: string;
}

// 音频播放接口
export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string;
  coverUrl?: string;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  track?: AudioTrack;
}

// 文件选择接口
export interface FilePickerOptions {
  accept?: string[];
  multiple?: boolean;
  directory?: boolean;
}

export interface SelectedFile {
  name: string;
  path: string;
  uri: string;
  size: number;
  type: string;
  data?: ArrayBuffer;
}

// 应用生命周期接口
export interface AppLifecycleListener {
  onAppStateChange?: (state: 'active' | 'inactive' | 'background') => void;
  onUrlOpen?: (url: string) => void;
  onDeepLink?: (url: string) => void;
}

// 统一的平台服务接口
export interface PlatformService {
  // 平台信息
  getPlatformInfo(): PlatformInfo;

  // HTTP请求
  httpRequest<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>>;

  // 文件系统
  readFile(options: ReadFileOptions): Promise<string>;
  writeFile(options: WriteFileOptions): Promise<void>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<FileInfo[]>;
  exists(path: string): Promise<boolean>;
  getAppDataDirectory(): Promise<string>;
  getDocumentsDirectory(): Promise<string>;
  getMusicDirectory?(): Promise<string>; // 可选方法，只有部分平台支持

  // 本地存储
  getStorage(key: string): Promise<string | null>;
  setStorage(key: string, value: string): Promise<void>;
  removeStorage(key: string): Promise<void>;

  // OAuth认证
  openOAuth(config: OAuthConfig): Promise<OAuthResult>;
  fetchUserProfile<T = unknown>(accessToken: string): Promise<UserProfileResult<T>>;

  // 文件选择
  pickFiles(options?: FilePickerOptions): Promise<SelectedFile[]>;

  // 应用生命周期
  addAppLifecycleListener(listener: AppLifecycleListener): () => void;

  // 状态栏和UI
  setStatusBarStyle?(style: 'light' | 'dark'): Promise<void>;
  showLoadingIndicator?(message?: string): Promise<void>;
  hideLoadingIndicator?(): Promise<void>;

  // 通知
  showNotification?(title: string, message: string): Promise<void>;
}
