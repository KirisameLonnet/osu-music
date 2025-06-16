// src/types/index.ts
/**
 * 全局类型定义
 * 包含项目中使用的所有核心类型和接口
 */

// ============================================================================
// 音乐相关类型
// ============================================================================

export interface MusicTrack {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  duration?: number;
  artist?: string;
  album?: string;
  coverUrl?: string;
  addedDate: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: MusicTrack[];
  coverUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OSU! 相关类型
// ============================================================================

export interface OsuUserProfile {
  id: number;
  username: string;
  avatar_url: string;
  country_code: string;
  is_supporter: boolean;
}

export interface OsuBeatmap {
  id: number;
  beatmapset_id: number;
  title: string;
  artist: string;
  creator: string;
  version: string;
  url: string;
  covers: {
    cover: string;
    card: string;
    list: string;
    slimcover: string;
  };
}

export interface ParsedBeatmapFileName {
  beatmapId: number;
  title: string;
  artist: string;
  extension: string;
  originalFileName: string;
}

// ============================================================================
// 平台相关类型
// ============================================================================

export interface PlatformInfo {
  type: 'web' | 'ios' | 'android' | 'electron';
  version: string;
  capabilities: {
    fileSystem: boolean;
    notifications: boolean;
    backgroundAudio: boolean;
  };
}

export interface FilePickerOptions {
  accept: string[];
  multiple: boolean;
}

export interface FileData {
  name: string;
  data: ArrayBuffer;
  type: string;
  size: number;
}

// ============================================================================
// API 相关类型
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  responseType?: 'json' | 'text' | 'arraybuffer' | 'blob';
  timeout?: number;
}

// ============================================================================
// 播放控制类型
// ============================================================================

export type ShuffleMode = 'off' | 'on';
export type RepeatMode = 'off' | 'one' | 'all';

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  currentTime: number;
  duration: number;
  volume: number;
  shuffleMode: ShuffleMode;
  repeatMode: RepeatMode;
}

export interface PlayQueue {
  tracks: MusicTrack[];
  currentIndex: number;
  originalQueue: MusicTrack[];
}

// ============================================================================
// 设置相关类型
// ============================================================================

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  audioQuality: 'low' | 'medium' | 'high';
  downloadPath: string;
  autoPlay: boolean;
  crossfade: boolean;
  crossfadeDuration: number;
}

// ============================================================================
// 事件类型
// ============================================================================

export interface AudioEvents {
  play: (track: MusicTrack) => void;
  pause: () => void;
  stop: () => void;
  seek: (position: number) => void;
  volumeChange: (volume: number) => void;
  trackEnd: () => void;
  error: (error: Error) => void;
}

// ============================================================================
// 工具类型
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Awaitable<T> = T | Promise<T>;

export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

// ============================================================================
// 导出所有类型模块
// ============================================================================

////export * from './api';
//export * from './osu';
//export * from './platform';
