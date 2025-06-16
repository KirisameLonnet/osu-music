# URL 重复拼接问题修复

## 问题描述

在 Capacitor iOS 环境下，HTTP 请求的 URL 被重复拼接，导致请求失败：

```
https://osu.ppy.sh/api/v2https://osu.ppy.sh/api/v2/beatmapsets/search?q=omoi&s=ranked
```

服务器返回 404 错误：`"Invalid url or incorrect request method."`

## 根本原因

1. **重复的 baseURL 拼接**：在 `httpService.ts` 中的 URL 构建逻辑错误，导致 baseURL 被重复添加
2. **环境判断错误**：在 Capacitor 原生环境下仍然使用开发环境的代理路径 `/osu-api`

## 修复方案

### 1. 修复 URL 构建逻辑

在 `src/services/httpService.ts` 中：

**之前（错误）：**

```typescript
const fullUrl = this.buildUrl(finalBaseURL ? `${finalBaseURL}${url}` : url, params);
```

**之后（正确）：**

```typescript
let fullUrl = url;
if (finalBaseURL && !url.startsWith('http')) {
  fullUrl = `${finalBaseURL}${url}`;
}
// 然后单独添加查询参数
```

### 2. 修复环境判断

**之前：**

```typescript
export const osuHttpService = new HttpService(
  import.meta.env.DEV ? '/osu-api' : 'https://osu.ppy.sh/api/v2',
);
```

**之后：**

```typescript
export const osuHttpService = new HttpService(
  Capacitor.isNativePlatform() || !import.meta.env.DEV ? 'https://osu.ppy.sh/api/v2' : '/osu-api',
);
```

### 3. 增强调试信息

添加了更详细的 URL 构建日志：

```typescript
console.log('[HttpService] Making request:', {
  platform: Capacitor.getPlatform(),
  isNative: Capacitor.isNativePlatform(),
  method,
  url: fullUrl,
  originalUrl: url,
  baseURL: finalBaseURL,
});
```

## 验证方法

### 期望的日志输出

修复后，日志应该显示：

```
[HttpService] Making request: {
  "platform": "ios",
  "isNative": true,
  "method": "GET",
  "url": "https://osu.ppy.sh/api/v2/beatmapsets/search?q=omoi&s=ranked",
  "originalUrl": "/beatmapsets/search",
  "baseURL": "https://osu.ppy.sh/api/v2"
}
```

### 测试步骤

1. 在 Capacitor iOS 环境下运行搜索
2. 检查控制台日志，确认 URL 格式正确
3. 验证搜索请求返回正确的数据而不是 404 错误

## 相关文件

- `src/services/httpService.ts` - 主要修复文件
- `src/pages/SearchPage.vue` - 使用修复后的服务
- `quasar.config.ts` - 开发环境代理配置参考

## 注意事项

- 此修复确保在不同环境下使用正确的 baseURL
- 保持了开发环境的代理功能不变
- 在原生环境下直接访问 OSU! API，避免 CORS 问题
