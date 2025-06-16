# Capacitor CORS 跨域访问修复说明

## 问题描述

在 Capacitor 原生平台（iOS/Android）上，使用 axios 或直接 fetch 进行 HTTP 请求时会遇到 CORS 跨域访问错误，特别是在访问 OSU! API 和其他第三方 API 时。

## 问题原因

1. **CORS 策略**：浏览器的同源策略限制了跨域请求
2. **Capacitor 环境**：虽然 Capacitor 应用在原生容器中运行，但仍然受到 WebView 的 CORS 限制
3. **第三方 API**：许多第三方 API（如 OSU! API、beatmap 镜像站）没有配置允许来自 Capacitor 应用的跨域请求

## 解决方案

### 1. 创建 HTTP 服务包装器

创建了 `src/services/httpService.ts`，该服务：

- 自动检测运行环境（原生 vs Web）
- 在 Capacitor 原生平台使用 `CapacitorHttp` 插件
- 在 Web 平台使用标准的 `axios`
- 提供统一的 API 接口

### 2. 修改现有服务

将以下文件中的 `axios` 调用替换为 `httpService`：

- `src/pages/SearchPage.vue` - OSU! beatmap 搜索
- `src/services/beatmapDownloadService.ts` - beatmap 下载
- `src/services/audioPlayPreviewService.ts` - 音频预览
- `src/stores/playHistory.ts` - 游戏历史记录

### 3. 保持现有架构

- `src/services/osuAuthService.ts` 已经使用 `platform.httpRequest`，无需修改
- `src/services/platform/capacitor.ts` 中的 `httpRequest` 方法已经正确处理了 Capacitor 环境

## 修复内容

### 核心文件创建

- **src/services/httpService.ts**：新建的 HTTP 服务包装器

### 文件修改

1. **src/pages/SearchPage.vue**

   - 替换 `osuApi` 为 `osuHttpService`
   - 修复 SearchParams 类型定义

2. **src/services/beatmapDownloadService.ts**

   - 替换 `osuApi` 为 `osuHttpService`
   - 将 `fetch` 调用替换为 `httpService`

3. **src/services/audioPlayPreviewService.ts**

   - 替换 `osuApi` 为 `osuHttpService`

4. **src/stores/playHistory.ts**
   - 替换 `osuApi` 为 `osuHttpService`
   - 简化错误处理逻辑

## 使用方法

### 基本用法

```typescript
import { osuHttpService, httpService } from 'src/services/httpService';

// OSU! API 请求
const response = await osuHttpService.get('/beatmapsets/search', {
  params: { q: 'search term' },
  headers: { Authorization: `Bearer ${token}` },
});

// 通用 HTTP 请求
const response = await httpService.get('https://api.example.com/data');
```

### 支持的方法

- `get<T>(url, options)`
- `post<T>(url, data, options)`
- `put<T>(url, data, options)`
- `delete<T>(url, options)`
- `patch<T>(url, data, options)`

## 环境兼容性

### Capacitor 原生平台（iOS/Android）

- 使用 `CapacitorHttp` 插件
- 自动处理 CORS 问题
- 支持所有 HTTP 方法

### Web 平台

- 使用标准 `axios` 库
- 开发环境通过 Vite/Quasar 代理处理 CORS
- 生产环境需要服务器端 CORS 配置

## 测试验证

### 验证步骤

1. 在 Capacitor 环境下测试 OSU! API 搜索功能
2. 验证 beatmap 下载功能
3. 检查游戏历史记录加载
4. 确认音频预览播放

### 日志监控

服务会输出详细的调试日志：

```
[HttpService] Making request: { platform: 'ios', method: 'GET', url: '...' }
[HttpService] CapacitorHttp response: { status: 200, dataType: 'object' }
```

## 注意事项

1. **类型安全**：所有服务方法都支持 TypeScript 泛型
2. **错误处理**：统一的错误处理机制
3. **向后兼容**：现有的 Web 环境功能不受影响
4. **性能优化**：避免了多次网络请求的开销

## 相关文件

- `src/services/httpService.ts` - 核心 HTTP 服务
- `src/boot/axios.ts` - 保持原有的 axios 配置
- `src/services/platform/capacitor.ts` - 平台特定的 HTTP 处理
- `quasar.config.ts` - 开发环境代理配置

通过这些修复，OSU! Music 应用现在可以在 Capacitor 原生平台上正常进行 API 请求，避免了 CORS 跨域访问错误。
