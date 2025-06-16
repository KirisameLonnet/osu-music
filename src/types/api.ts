// src/types/api.ts
/**
 * API 相关类型定义
 */

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  responseType?: 'json' | 'text' | 'arraybuffer' | 'blob';
  timeout?: number;
  withCredentials?: boolean;
}

export interface ApiRequestOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  skipAuth?: boolean;
}
