// src/services/business/coverImageService.ts
/**
 * 封面图片服务
 *
 * 处理 osu! beatmap 封面图片的获取，解决 CORS 跨域问题
 * 在原生环境下使用 httpService 避免 CORS 限制
 */

import { Capacitor } from '@capacitor/core';
import { httpService } from '../api/httpService';

export class CoverImageService {
  private cache = new Map<string, string>();

  /**
   * 获取 beatmap 封面图片
   * @param beatmapId beatmap ID
   * @param size 封面尺寸
   * @returns Promise<string> - 返回可用的图片 URL（可能是原始 URL 或 blob URL）
   */
  async getCoverImage(
    beatmapId: number,
    size: 'cover' | 'card' | 'list' | 'slimcover' = 'card',
  ): Promise<string> {
    const originalUrl = `https://assets.ppy.sh/beatmaps/${beatmapId}/covers/${size}.jpg`;
    const cacheKey = `${beatmapId}-${size}`;

    console.log(`[CoverImageService] Requesting cover image:`, {
      beatmapId,
      size,
      url: originalUrl,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
    });

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cachedUrl = this.cache.get(cacheKey)!;
      console.log(`[CoverImageService] Found in cache: ${cachedUrl}`);
      return cachedUrl;
    }

    // 在 Web 环境下，尝试直接使用原始 URL
    if (!Capacitor.isNativePlatform()) {
      console.log(`[CoverImageService] Attempting direct access in web environment`);
      // 在开发环境或某些 Web 环境下，可能可以直接访问
      // 如果遇到 CORS，会在下面的逻辑中处理
      try {
        const response = await fetch(originalUrl, { method: 'HEAD' });
        console.log(`[CoverImageService] Direct access response:`, {
          status: response.status,
          ok: response.ok,
        });
        if (response.ok) {
          this.cache.set(cacheKey, originalUrl);
          console.log(`[CoverImageService] Direct access successful, cached original URL`);
          return originalUrl;
        }
      } catch (error) {
        console.warn(`[CoverImageService] Direct access failed for ${originalUrl}:`, error);
      }
    }

    try {
      // 在原生环境或 Web CORS 失败时，使用 httpService 下载图片
      console.log(`[CoverImageService] Downloading cover image: ${originalUrl}`);

      const response = await httpService.request({
        url: originalUrl,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 将 ArrayBuffer 转换为 Blob URL
      const blob = new Blob([response.data as ArrayBuffer], { type: 'image/jpeg' });
      const blobUrl = URL.createObjectURL(blob);

      // 缓存 blob URL
      this.cache.set(cacheKey, blobUrl);

      console.log(`[CoverImageService] Cover image downloaded and cached: ${cacheKey}`);
      return blobUrl;
    } catch (error) {
      console.error(
        `[CoverImageService] Failed to get cover image for beatmap ${beatmapId}:`,
        error,
      );

      // 返回占位符图片或默认封面
      const placeholderUrl = this.getPlaceholderImage();
      this.cache.set(cacheKey, placeholderUrl);
      return placeholderUrl;
    }
  }

  /**
   * 批量获取封面图片
   */
  async getCoverImages(
    requests: Array<{ beatmapId: number; size?: 'cover' | 'card' | 'list' | 'slimcover' }>,
  ): Promise<Map<number, string>> {
    const results = new Map<number, string>();

    // 并行请求（限制并发数避免过多请求）
    const concurrency = 5;
    const chunks = this.chunkArray(requests, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async ({ beatmapId, size = 'card' }) => {
        try {
          const url = await this.getCoverImage(beatmapId, size);
          results.set(beatmapId, url);
        } catch (error) {
          console.error(`[CoverImageService] Failed to get cover for beatmap ${beatmapId}:`, error);
          results.set(beatmapId, this.getPlaceholderImage());
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * 清理缓存（释放 blob URL）
   */
  clearCache(): void {
    for (const url of this.cache.values()) {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    this.cache.clear();
    console.log('[CoverImageService] Cache cleared');
  }

  /**
   * 获取占位符图片
   */
  private getPlaceholderImage(): string {
    // 返回一个简单的 SVG 占位符
    const svg = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="12" fill="#999">
          osu!
        </text>
      </svg>
    `;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 预加载封面图片
   */
  async preloadCoverImage(
    beatmapId: number,
    size: 'cover' | 'card' | 'list' | 'slimcover' = 'card',
  ): Promise<void> {
    try {
      await this.getCoverImage(beatmapId, size);
    } catch (error) {
      console.warn(`[CoverImageService] Failed to preload cover for beatmap ${beatmapId}:`, error);
    }
  }
}

// 导出单例实例
export const coverImageService = new CoverImageService();

export default CoverImageService;
