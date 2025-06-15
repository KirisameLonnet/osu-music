// src/services/platform/index.ts
// 平台服务工厂 - 自动检测并返回对应的平台实现

import { Capacitor } from '@capacitor/core';
import type { PlatformService } from './types';
import { ElectronPlatformService } from './electron';
import { CapacitorPlatformService } from './capacitor';

// 检测当前环境并返回对应的平台服务实例
export function createPlatformService(): PlatformService {
  // 检查是否在Electron环境中
  if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
    console.log('[PlatformFactory] Detected Electron environment');
    return new ElectronPlatformService();
  }

  // 检查是否在Capacitor环境中
  if (Capacitor.isNativePlatform()) {
    console.log('[PlatformFactory] Detected Capacitor environment');
    return new CapacitorPlatformService();
  }

  // 默认使用Capacitor实现（支持Web环境降级）
  console.log('[PlatformFactory] Using Capacitor platform service as fallback');
  return new CapacitorPlatformService();
}

// 创建单例实例
let platformServiceInstance: PlatformService | null = null;

export function getPlatformService(): PlatformService {
  if (!platformServiceInstance) {
    platformServiceInstance = createPlatformService();
  }
  return platformServiceInstance;
}

// 重置单例实例（主要用于测试）
export function resetPlatformService(): void {
  platformServiceInstance = null;
}

// 导出类型定义
export * from './types';
export { ElectronPlatformService } from './electron';
export { CapacitorPlatformService } from './capacitor';
