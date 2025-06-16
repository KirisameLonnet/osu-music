// src/services/core/platform/binaryDownloader.ts
/**
 * 二进制文件下载器
 *
 * 专门处理 iOS/Android 平台下载二进制文件（如 .osz）的问题
 * 解决 CapacitorHttp 在某些情况下返回 undefined 数据的问题
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface BinaryDownloadOptions {
  url: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  timeout?: number;
}

export interface BinaryDownloadResult {
  data: ArrayBuffer;
  status: number;
  headers: Record<string, string>;
  size: number;
}

export class BinaryDownloader {
  /**
   * 下载二进制文件
   * 使用多种方法确保能够正确获取二进制数据
   */
  async download(options: BinaryDownloadOptions): Promise<BinaryDownloadResult> {
    const { url, headers = {}, maxRetries = 3, timeout = 30000 } = options;

    console.log('[BinaryDownloader] Starting download:', {
      url,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      maxRetries,
    });

    if (!Capacitor.isNativePlatform()) {
      // Web 平台使用 fetch
      return this.downloadWeb(url, headers, timeout);
    }

    // 原生平台尝试多种方法
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[BinaryDownloader] Attempt ${attempt}/${maxRetries}`);

      try {
        // 方法1：使用 responseType: 'arraybuffer'
        const result = await this.downloadCapacitorArrayBuffer(url, headers, timeout);
        if (result) {
          console.log('[BinaryDownloader] Success with ArrayBuffer method');
          return result;
        }
      } catch (error) {
        console.warn(`[BinaryDownloader] ArrayBuffer method failed (attempt ${attempt}):`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      try {
        // 方法2：使用默认响应类型然后处理
        const result = await this.downloadCapacitorDefault(url, headers, timeout);
        if (result) {
          console.log('[BinaryDownloader] Success with default method');
          return result;
        }
      } catch (error) {
        console.warn(`[BinaryDownloader] Default method failed (attempt ${attempt}):`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // 在重试之前等待一小段时间
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new Error(
      `All download attempts failed. Last error: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Web 平台下载方法
   */
  private async downloadWeb(
    url: string,
    headers: Record<string, string>,
    timeout: number,
  ): Promise<BinaryDownloadResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.arrayBuffer();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data,
        status: response.status,
        headers: responseHeaders,
        size: data.byteLength,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Capacitor 方法1：使用 responseType: 'arraybuffer'
   */
  private async downloadCapacitorArrayBuffer(
    url: string,
    headers: Record<string, string>,
    timeout: number,
  ): Promise<BinaryDownloadResult | null> {
    try {
      const response = await CapacitorHttp.request({
        url,
        method: 'GET',
        headers,
        responseType: 'arraybuffer',
        connectTimeout: timeout,
        readTimeout: timeout,
      });

      console.log('[BinaryDownloader] ArrayBuffer response:', {
        status: response.status,
        dataType: typeof response.data,
        dataConstructor: response.data?.constructor?.name,
        isArrayBuffer: response.data instanceof ArrayBuffer,
        dataLength: response.data?.byteLength || 'unknown',
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 检查是否得到了 ArrayBuffer
      if (response.data instanceof ArrayBuffer) {
        return {
          data: response.data,
          status: response.status,
          headers: response.headers || {},
          size: response.data.byteLength,
        };
      }

      // 如果得到的是 base64 字符串，转换为 ArrayBuffer
      if (typeof response.data === 'string' && response.data.length > 0) {
        try {
          const binaryString = atob(response.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          console.log('[BinaryDownloader] Converted base64 to ArrayBuffer:', {
            base64Length: response.data.length,
            bufferLength: bytes.buffer.byteLength,
          });

          return {
            data: bytes.buffer,
            status: response.status,
            headers: response.headers || {},
            size: bytes.buffer.byteLength,
          };
        } catch (convertError) {
          console.error('[BinaryDownloader] Base64 conversion failed:', convertError);
          throw new Error('Failed to convert base64 data');
        }
      }

      // 如果数据是 undefined 或其他格式，返回 null 让调用者尝试其他方法
      if (response.data === undefined || response.data === null) {
        console.warn('[BinaryDownloader] Received undefined/null data');
        return null;
      }

      throw new Error(`Unexpected data type: ${typeof response.data}`);
    } catch (error) {
      console.error('[BinaryDownloader] ArrayBuffer method error:', error);
      throw error;
    }
  }

  /**
   * Capacitor 方法2：使用默认响应类型
   */
  private async downloadCapacitorDefault(
    url: string,
    headers: Record<string, string>,
    timeout: number,
  ): Promise<BinaryDownloadResult | null> {
    try {
      const response = await CapacitorHttp.request({
        url,
        method: 'GET',
        headers,
        connectTimeout: timeout,
        readTimeout: timeout,
      });

      console.log('[BinaryDownloader] Default response:', {
        status: response.status,
        dataType: typeof response.data,
        dataConstructor: response.data?.constructor?.name,
        dataLength: response.data?.length || response.data?.byteLength || 'unknown',
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 如果直接得到了 ArrayBuffer
      if (response.data instanceof ArrayBuffer) {
        return {
          data: response.data,
          status: response.status,
          headers: response.headers || {},
          size: response.data.byteLength,
        };
      }

      // 如果得到的是字符串，尝试作为 base64 处理
      if (typeof response.data === 'string' && response.data.length > 0) {
        // 检查是否看起来像 base64（没有明显的文本内容）
        if (this.looksLikeBase64(response.data)) {
          try {
            const binaryString = atob(response.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            return {
              data: bytes.buffer,
              status: response.status,
              headers: response.headers || {},
              size: bytes.buffer.byteLength,
            };
          } catch (convertError) {
            console.error('[BinaryDownloader] Base64 conversion failed:', convertError);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('[BinaryDownloader] Default method error:', error);
      throw error;
    }
  }

  /**
   * 检查字符串是否看起来像 base64 编码
   */
  private looksLikeBase64(str: string): boolean {
    // 简单的 base64 检查：只包含 base64 字符
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str) && str.length > 100; // 至少100字符长度
  }

  /**
   * 将二进制数据保存到文件
   */
  async saveToFile(data: ArrayBuffer, filename: string): Promise<string> {
    try {
      console.log('[BinaryDownloader] Saving file:', {
        filename,
        size: data.byteLength,
        platform: Capacitor.getPlatform(),
      });

      if (Capacitor.isNativePlatform()) {
        // 原生平台使用 Capacitor Filesystem
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(data)));

        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });

        // 获取文件 URI
        const fileUri = await Filesystem.getUri({
          path: filename,
          directory: Directory.Documents,
        });

        console.log('[BinaryDownloader] File saved successfully:', {
          path: filename,
          uri: fileUri.uri,
          size: data.byteLength,
        });

        return fileUri.uri;
      } else {
        // Web 平台的文件保存（如果需要）
        throw new Error('Web platform file saving not implemented');
      }
    } catch (error) {
      console.error('[BinaryDownloader] Save file failed:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const binaryDownloader = new BinaryDownloader();
