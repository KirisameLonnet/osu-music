// debug-binary-download.js
/**
 * 调试二进制文件下载功能的测试脚本
 * 用于验证 CapacitorHttp 在原生环境下能否正确下载 .osz 文件
 */

// 测试 CapacitorHttp 下载二进制文件
async function testCapacitorBinaryDownload() {
  const { Capacitor } = await import('@capacitor/core');
  const { CapacitorHttp } = await import('@capacitor/core');

  console.log('=== Capacitor Binary Download Test ===');
  console.log('Platform:', Capacitor.getPlatform());
  console.log('Is Native:', Capacitor.isNativePlatform());

  if (!Capacitor.isNativePlatform()) {
    console.log('Not running in native environment, skipping CapacitorHttp test');
    return;
  }

  // 测试 URL（小文件用于测试）
  const testUrl = 'https://catboy.best/d/1'; // 一个较小的 beatmap 文件

  console.log('Testing download from:', testUrl);

  try {
    // 方法1: 使用 responseType: 'arraybuffer'
    console.log('--- Method 1: responseType arraybuffer ---');
    const response1 = await CapacitorHttp.request({
      url: testUrl,
      method: 'GET',
      responseType: 'arraybuffer',
    });

    console.log('Response 1:', {
      status: response1.status,
      dataType: typeof response1.data,
      dataConstructor: response1.data?.constructor?.name,
      isArrayBuffer: response1.data instanceof ArrayBuffer,
      dataLength: response1.data?.byteLength || response1.data?.length,
      dataPreview:
        response1.data instanceof ArrayBuffer
          ? '[ArrayBuffer]'
          : typeof response1.data === 'string'
            ? response1.data.substring(0, 100) + '...'
            : response1.data,
    });

    // 方法2: 不指定 responseType
    console.log('--- Method 2: default responseType ---');
    const response2 = await CapacitorHttp.request({
      url: testUrl,
      method: 'GET',
    });

    console.log('Response 2:', {
      status: response2.status,
      dataType: typeof response2.data,
      dataConstructor: response2.data?.constructor?.name,
      isArrayBuffer: response2.data instanceof ArrayBuffer,
      dataLength: response2.data?.byteLength || response2.data?.length,
      dataPreview:
        response2.data instanceof ArrayBuffer
          ? '[ArrayBuffer]'
          : typeof response2.data === 'string'
            ? response2.data.substring(0, 100) + '...'
            : response2.data,
    });

    // 如果是字符串，尝试转换为 ArrayBuffer
    if (typeof response1.data === 'string') {
      console.log('--- Method 3: base64 conversion ---');
      try {
        const binaryString = window.atob(response1.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        console.log('Base64 conversion result:', {
          originalLength: response1.data.length,
          binaryStringLength: binaryString.length,
          arrayBufferLength: bytes.buffer.byteLength,
        });
      } catch (error) {
        console.log('Base64 conversion failed:', error);
      }
    }
  } catch (error) {
    console.error('Download test failed:', error);
  }
}

// 测试 httpService.downloadBinary
async function testHttpServiceBinaryDownload() {
  console.log('\n=== HttpService Binary Download Test ===');

  try {
    const { httpService } = await import('./src/services/httpService.ts');

    const testUrl = 'https://catboy.best/d/1';
    console.log('Testing httpService.downloadBinary with URL:', testUrl);

    const result = await httpService.downloadBinary(testUrl);
    console.log('HttpService download result:', {
      status: result.status,
      dataType: typeof result.data,
      dataConstructor: result.data?.constructor?.name,
      isArrayBuffer: result.data instanceof ArrayBuffer,
      dataLength: result.data?.byteLength,
    });
  } catch (error) {
    console.error('HttpService download test failed:', error);
  }
}

// 主测试函数
async function runTests() {
  console.log('Starting binary download tests...\n');

  await testCapacitorBinaryDownload();
  await testHttpServiceBinaryDownload();

  console.log('\nTests completed!');
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.testBinaryDownload = runTests;
  console.log('Binary download test loaded. Run testBinaryDownload() in console to start tests.');
}

// 如果在 Node.js 环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests };
}
