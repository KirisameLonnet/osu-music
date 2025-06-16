// debug-http-service.js
// 用于测试 httpService 在 Capacitor 环境下的行为

console.log('=== HTTP Service Debug ===');

// 检查运行环境
import { Capacitor } from '@capacitor/core';
console.log('Platform:', Capacitor.getPlatform());
console.log('Is native platform:', Capacitor.isNativePlatform());

// 测试 httpService
import { osuHttpService } from 'src/services/httpService';

async function testHttpService() {
  try {
    console.log('Testing osuHttpService...');

    // 简单的 GET 请求测试
    const response = await osuHttpService.get('/beatmapsets/1', {
      headers: {
        Authorization: 'Bearer test_token',
      },
    });

    console.log('Response received:', {
      status: response.status,
      dataType: typeof response.data,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : null,
    });
  } catch (error) {
    console.error('HTTP Service test failed:', error);
  }
}

// 只在开发环境下运行
if (import.meta.env.DEV) {
  testHttpService();
}
