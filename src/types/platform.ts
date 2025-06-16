// src/types/platform.ts
/**
 * 平台相关类型定义
 */

export type PlatformType = 'web' | 'ios' | 'android' | 'electron';

export interface PlatformInfo {
  type: PlatformType;
  version: string;
  capabilities: PlatformCapabilities;
}

export interface PlatformCapabilities {
  fileSystem: boolean;
  notifications: boolean;
  backgroundAudio: boolean;
  nativeFileAccess: boolean;
  networkAccess: boolean;
  clipboard: boolean;
  camera: boolean;
  geolocation: boolean;
}

export interface FilePickerOptions {
  accept: string[];
  multiple: boolean;
  directory?: boolean;
}

export interface FileData {
  name: string;
  data: ArrayBuffer;
  type: string;
  size: number;
  lastModified?: number;
  path?: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: Date;
}

export interface WriteFileOptions {
  path: string;
  data: string | ArrayBuffer;
  encoding?: 'utf8' | 'base64' | 'binary';
  create?: boolean;
  overwrite?: boolean;
}

export interface ReadFileOptions {
  path: string;
  encoding?: 'utf8' | 'base64' | 'binary';
}

export interface StorageOptions {
  key: string;
  value?: string;
}

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  sound?: string;
  vibrate?: number[];
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  files?: string[];
}

export interface NetworkStatus {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
}

export interface DeviceInfo {
  model: string;
  platform: string;
  uuid: string;
  version: string;
  manufacturer: string;
  isVirtual: boolean;
}
