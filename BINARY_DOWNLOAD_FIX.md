# Capacitor 二进制数据下载修复

## 问题描述

在 Capacitor iOS 环境下，使用 CapacitorHttp 下载 .osz 文件（二进制数据）时，响应的 `dataType` 为 `"undefined"`，导致下载失败。

## 根本原因

CapacitorHttp 在处理二进制数据时需要显式指定 `responseType: 'arraybuffer'`，否则无法正确处理二进制响应。

## 修复方案

### 1. 扩展 HttpRequestOptions 接口

在 `src/services/httpService.ts` 中添加 `responseType` 选项：

```typescript
export interface HttpRequestOptions {
  // ...existing properties...
  responseType?: 'json' | 'text' | 'arraybuffer' | 'blob';
}
```

### 2. 修改 CapacitorHttp 请求配置

```typescript
const response = await CapacitorHttp.request({
  url: fullUrl,
  method,
  headers,
  data,
  // 对于二进制数据（如 .osz 文件），设置正确的响应类型
  ...(responseType === 'arraybuffer' || responseType === 'blob'
    ? { responseType: 'arraybuffer' as const }
    : {}),
});
```

### 3. 增强响应处理逻辑

- 对于二进制数据，不尝试解析 JSON
- 在日志中正确显示数据类型信息
- 确保 ArrayBuffer 数据正确传递

### 4. 修复 beatmapDownloadService

在下载 .osz 文件时指定正确的响应类型：

```typescript
const downloadResponse = await httpService.get(source.url, {
  responseType: 'arraybuffer', // 指定响应类型为二进制数据
});
```

## 预期效果

### 修复前的日志

```
[HttpService] CapacitorHttp raw response: {
  "status": 200,
  "dataType": "undefined",
  "url": "https://catboy.best/d/721804"
}
```

### 修复后的日志

```
[HttpService] CapacitorHttp raw response: {
  "status": 200,
  "dataType": "object",
  "dataValue": "[ArrayBuffer]",
  "url": "https://catboy.best/d/721804",
  "responseType": "arraybuffer"
}
```

## 测试验证

1. 在 Capacitor iOS 环境下测试 beatmap 下载
2. 检查控制台日志，确认响应类型正确
3. 验证 .osz 文件下载和解压功能正常工作

## 相关文件

- `src/services/httpService.ts` - 添加 responseType 支持
- `src/services/beatmapDownloadService.ts` - 使用 arraybuffer 响应类型

## 注意事项

- 此修复专门针对二进制文件下载
- JSON API 请求保持原有逻辑不变
- 在 Web 环境下功能保持兼容
