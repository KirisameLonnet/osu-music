# Capacitor 二进制文件下载修复指南

## 问题描述

在使用 Capacitor 原生环境（iOS/Android）下载二进制文件（如 .osz beatmap 文件）时遇到了以下问题：

1. **数据类型错误**: CapacitorHttp 返回的二进制数据 `typeof response.data` 为 `"undefined"`
2. **响应处理失效**: 指定 `responseType: 'arraybuffer'` 但仍然无法获得正确的 ArrayBuffer 数据
3. **下载失败**: 二进制文件下载后无法正确处理，导致后续解压和音频提取失败

## 根本原因

CapacitorHttp 对于二进制数据的处理方式与标准的 Web API 不同：

1. **响应类型处理**: CapacitorHttp 可能以 base64 字符串或其他格式返回二进制数据
2. **类型定义不完整**: CapacitorHttp 的 TypeScript 类型定义可能不完整，导致配置选项受限
3. **平台差异**: 原生平台和 Web 平台的二进制数据处理机制不同

## 解决方案

### 1. 创建专用的二进制下载方法

在 `src/services/httpService.ts` 中添加了 `downloadBinary` 方法：

```typescript
async downloadBinary(url: string, options = {}): Promise<HttpResponse<ArrayBuffer>> {
  if (Capacitor.isNativePlatform()) {
    // 方法1: 尝试 responseType: 'arraybuffer'
    const response = await CapacitorHttp.request({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
    });

    // 如果得到 ArrayBuffer，直接返回
    if (response.data instanceof ArrayBuffer) {
      return { data: response.data, ... };
    }

    // 如果得到 base64 字符串，转换为 ArrayBuffer
    if (typeof response.data === 'string') {
      const binaryString = window.atob(response.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return { data: bytes.buffer, ... };
    }

    // 方法2: 如果方法1失败，尝试不指定 responseType
    // ...
  } else {
    // Web 平台使用标准方法
    return this.request<ArrayBuffer>({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      ...options,
    });
  }
}
```

### 2. 更新 beatmapDownloadService

将所有二进制文件下载调用更改为使用 `httpService.downloadBinary`:

```typescript
// 原来的代码
const downloadResponse = await httpService.get(source.url, {
  responseType: 'arraybuffer',
});

// 修复后的代码
const downloadResponse = await httpService.downloadBinary(source.url);
```

### 3. 增强错误处理和调试

- 添加详细的调试日志，显示数据类型、长度等信息
- 多种方法尝试获取二进制数据
- 优雅的错误处理和回退机制

## 测试方法

### 1. 使用调试脚本

运行 `debug-binary-download.js` 脚本来测试二进制下载：

```javascript
// 在浏览器控制台中
testBinaryDownload();
```

### 2. 实际测试步骤

1. 在 iOS/Android 设备上运行应用
2. 搜索一个 beatmap
3. 尝试下载 (会优先使用 Catboy.best 镜像)
4. 检查控制台日志，确认：
   - `dataType` 不再是 `"undefined"`
   - 成功获得 ArrayBuffer 数据
   - 文件大小正确 (byteLength > 0)

### 3. 关键日志标识

成功的日志应该显示：

```
[HttpService] Binary download response (Method 1):
  status: 200
  dataType: "object"
  dataConstructor: "ArrayBuffer"
  isArrayBuffer: true
  dataLength: 123456

[BeatmapDownload] Successfully downloaded from Catboy.best Mirror, size: 123456 bytes
```

## 其他注意事项

### 支持的下载源

1. **Catboy.best Mirror** - 首选，通常最快
2. **Chimu.moe Mirror** - 备选镜像
3. **Beatconnect Mirror** - 第三选择
4. **Official osu! API** - 最后尝试（需要认证）

### 文件格式支持

下载的 .osz 文件会被解压，提取的音频文件支持：

- ✅ MP3 格式
- ✅ OGG 格式
- ✅ FLAC 格式
- ❌ WAV 格式 (通常是音效文件，会被跳过)

### 平台兼容性

- ✅ iOS (Capacitor)
- ✅ Android (Capacitor)
- ✅ Web 浏览器
- ✅ Electron 桌面版

## 故障排除

### 1. 仍然收到 undefined 数据

- 检查网络连接
- 尝试不同的镜像站点
- 确认 beatmap ID 有效
- 检查服务器是否返回正确的 Content-Type

### 2. base64 转换失败

- 确认服务器返回的确实是 base64 编码的数据
- 检查 atob 函数是否可用
- 考虑使用其他 base64 解码库

### 3. 下载超时或失败

- 增加超时时间设置
- 检查镜像站点的可用性
- 尝试小文件测试网络连接

## 相关文件

- `src/services/httpService.ts` - 主要修复文件
- `src/services/beatmapDownloadService.ts` - 下载服务更新
- `debug-binary-download.js` - 调试测试脚本
- `CAPACITOR_CORS_FIX.md` - CORS 问题修复
- `HTTP_DEBUG_GUIDE.md` - HTTP 调试指南

## 版本历史

- **v1.0** - 初始 CORS 修复
- **v1.1** - URL 重复问题修复
- **v1.2** - 二进制文件下载修复 ← 当前版本
