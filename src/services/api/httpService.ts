// src/services/api/httpService.ts
/**
 * HTTP Service Wrapper
 *
 * 该服务自动检测运行环境，在 Capacitor 原生平台使用 CapacitorHttp 避免 CORS 问题，
 * 在 Web 平台使用标准的 axios
 */
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

export interface HttpRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  baseURL?: string;
  responseType?: 'json' | 'text' | 'arraybuffer' | 'blob';
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

class HttpService {
  private baseURL: string;

  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }
  async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const { url, method = 'GET', headers = {}, data, params, baseURL, responseType } = options;

    // 决定使用哪个 baseURL
    const finalBaseURL = baseURL || this.baseURL;

    // 构建完整的 URL
    let fullUrl = url;
    if (finalBaseURL && !url.startsWith('http')) {
      // 只有当 url 不是完整的 URL 时才添加 baseURL
      fullUrl = `${finalBaseURL}${url}`;
    }

    // 添加查询参数
    if (params) {
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlParams.append(key, String(value));
        }
      });

      if (urlParams.toString()) {
        fullUrl += `?${urlParams.toString()}`;
      }
    }

    console.log('[HttpService] Making request:', {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      method,
      url: fullUrl,
      originalUrl: url,
      baseURL: finalBaseURL,
      responseType,
    });

    try {
      if (Capacitor.isNativePlatform()) {
        // 使用 CapacitorHttp 避免 CORS 问题
        // 构建 CapacitorHttp 请求配置
        // 注意：CapacitorHttp 的类型定义可能不完整，使用更宽松的类型
        const capacitorConfig = {
          url: fullUrl,
          method,
          headers,
          data,
          // 对于二进制数据，设置 responseType
          ...(responseType === 'arraybuffer' || responseType === 'blob'
            ? { responseType: 'arraybuffer' as const }
            : {}),
        };

        const response = await CapacitorHttp.request(capacitorConfig);

        console.log('[HttpService] CapacitorHttp raw response:', {
          status: response.status,
          dataType: typeof response.data,
          dataConstructor: response.data?.constructor?.name,
          isArrayBuffer: response.data instanceof ArrayBuffer,
          dataLength: response.data?.byteLength || response.data?.length,
          url: response.url,
          responseType,
          capacitorConfig: capacitorConfig,
        });

        // 处理不同类型的响应数据
        let parsedData = response.data;

        if (responseType === 'arraybuffer' || responseType === 'blob') {
          // 对于二进制数据
          if (response.data instanceof ArrayBuffer) {
            parsedData = response.data;
          } else if (typeof response.data === 'string') {
            // 如果 CapacitorHttp 返回 base64 字符串，需要转换为 ArrayBuffer
            try {
              const binaryString = atob(response.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              parsedData = bytes.buffer;
              console.log('[HttpService] Converted base64 to ArrayBuffer:', {
                originalLength: response.data.length,
                bufferLength: parsedData.byteLength,
              });
            } catch (convertError) {
              console.error('[HttpService] Failed to convert base64 to ArrayBuffer:', convertError);
              throw new Error('Failed to process binary data');
            }
          } else if (response.data === undefined) {
            // 如果数据为空，可能是网络错误或者服务器没有返回数据
            console.error('[HttpService] Received undefined data for binary request');
            throw new Error('No binary data received');
          }
        } else {
          // 对于 JSON/文本数据，CapacitorHttp 可能返回字符串形式的 JSON
          if (typeof response.data === 'string') {
            try {
              parsedData = JSON.parse(response.data);
              console.log('[HttpService] Parsed JSON data:', {
                type: typeof parsedData,
                keys: parsedData && typeof parsedData === 'object' ? Object.keys(parsedData) : null,
              });
            } catch (parseError) {
              console.warn('[HttpService] Failed to parse JSON response:', parseError);
              // 如果解析失败，保持原始字符串
            }
          }
        }

        return {
          data: parsedData,
          status: response.status,
          statusText: response.status.toString(),
          headers: response.headers || {},
        };
      } else {
        // Web 平台使用 axios
        const axiosConfig: AxiosRequestConfig = {
          url: fullUrl,
          method: method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch',
          headers,
          data,
        };

        const response: AxiosResponse<T> = await axios.request(axiosConfig);

        console.log('[HttpService] Axios response:', {
          status: response.status,
          dataType: typeof response.data,
        });

        return {
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
        };
      }
    } catch (error) {
      console.error('[HttpService] Request failed:', error);
      throw error;
    }
  }

  async get<T = unknown>(
    url: string,
    options: Omit<HttpRequestOptions, 'url' | 'method'> = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, url, method: 'GET' });
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    options: Omit<HttpRequestOptions, 'url' | 'method' | 'data'> = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, url, method: 'POST', data });
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    options: Omit<HttpRequestOptions, 'url' | 'method' | 'data'> = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, url, method: 'PUT', data });
  }

  async delete<T = unknown>(
    url: string,
    options: Omit<HttpRequestOptions, 'url' | 'method'> = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, url, method: 'DELETE' });
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    options: Omit<HttpRequestOptions, 'url' | 'method' | 'data'> = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, url, method: 'PATCH', data });
  }

  /**
   * 专门用于下载二进制文件（如 .osz 文件）的方法
   * 针对 CapacitorHttp 的二进制数据处理进行了优化
   */
  async downloadBinary(
    url: string,
    options: Omit<HttpRequestOptions, 'url' | 'method' | 'responseType'> = {},
  ): Promise<HttpResponse<ArrayBuffer>> {
    const fullOptions = {
      ...options,
      url,
      method: 'GET' as const,
      responseType: 'arraybuffer' as const,
    };

    console.log('[HttpService] Downloading binary file:', {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      url,
    });

    if (Capacitor.isNativePlatform()) {
      // 在原生平台，尝试多种方法来获取二进制数据
      try {
        // 方法1：使用 responseType: 'arraybuffer'
        const response = await CapacitorHttp.request({
          url: fullOptions.baseURL ? `${fullOptions.baseURL}${url}` : url,
          method: 'GET',
          headers: fullOptions.headers || {},
          responseType: 'arraybuffer',
        });

        console.log('[HttpService] Binary download response (Method 1):', {
          status: response.status,
          dataType: typeof response.data,
          dataConstructor: response.data?.constructor?.name,
          isArrayBuffer: response.data instanceof ArrayBuffer,
          dataLength: response.data?.byteLength || response.data?.length,
        });

        // 如果得到了 ArrayBuffer，直接返回
        if (response.data instanceof ArrayBuffer) {
          return {
            data: response.data,
            status: response.status,
            statusText: response.status.toString(),
            headers: response.headers || {},
          };
        }

        // 如果得到的是 base64 字符串，转换为 ArrayBuffer
        if (typeof response.data === 'string') {
          try {
            const binaryString = window.atob(response.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            console.log('[HttpService] Converted base64 to ArrayBuffer:', {
              base64Length: response.data.length,
              bufferLength: bytes.buffer.byteLength,
            });
            return {
              data: bytes.buffer,
              status: response.status,
              statusText: response.status.toString(),
              headers: response.headers || {},
            };
          } catch (error) {
            console.error('[HttpService] Failed to convert base64 to ArrayBuffer:', error);
          }
        }

        // 如果上述方法都失败，尝试其他方法
        console.warn('[HttpService] Method 1 failed, trying alternative approach...');

        // 方法2：不指定 responseType，让 CapacitorHttp 自动处理
        const response2 = await CapacitorHttp.request({
          url: fullOptions.baseURL ? `${fullOptions.baseURL}${url}` : url,
          method: 'GET',
          headers: fullOptions.headers || {},
        });

        console.log('[HttpService] Binary download response (Method 2):', {
          status: response2.status,
          dataType: typeof response2.data,
          dataConstructor: response2.data?.constructor?.name,
          dataLength: response2.data?.byteLength || response2.data?.length,
        });

        // 处理 Method 2 的响应
        if (response2.data instanceof ArrayBuffer) {
          return {
            data: response2.data,
            status: response2.status,
            statusText: response2.status.toString(),
            headers: response2.headers || {},
          };
        }

        // 如果还是得不到正确的数据，抛出错误
        throw new Error(`Unable to download binary data. Got: ${typeof response2.data}`);
      } catch (error) {
        console.error('[HttpService] Binary download failed:', error);
        throw error;
      }
    } else {
      // Web 平台使用标准方法
      return this.request<ArrayBuffer>(fullOptions);
    }
  }
}

// 创建 osu API 服务实例
export const osuHttpService = new HttpService(
  // 在 Capacitor 原生环境或生产环境下使用完整 URL，开发环境用代理
  Capacitor.isNativePlatform() || !import.meta.env.DEV ? 'https://osu.ppy.sh/api/v2' : '/osu-api',
);

// 创建通用 HTTP 服务实例
export const httpService = new HttpService();

export default HttpService;

// URL 构建测试
if (import.meta.env.DEV) {
  console.log('[HttpService] URL Construction Test:', {
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    isDev: import.meta.env.DEV,
    osuServiceBaseURL: osuHttpService['baseURL'],
  });

  // 测试 osuHttpService 的 URL 构建
  const testPath = '/beatmapsets/search';
  const testBaseURL = osuHttpService['baseURL'];
  const expectedURL =
    testBaseURL && !testPath.startsWith('http') ? `${testBaseURL}${testPath}` : testPath;

  console.log('[HttpService] URL Test Result:', {
    inputPath: testPath,
    baseURL: testBaseURL,
    expectedResult: expectedURL,
    shouldNotHaveDuplicateURL: !expectedURL.includes(
      'https://osu.ppy.sh/api/v2https://osu.ppy.sh/api/v2',
    ),
  });
}
