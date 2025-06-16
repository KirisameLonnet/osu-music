# Capacitor HTTP 调试指南

## 当前问题

错误信息：`search failed: undefined is not object (evaluating 'd.length')`

这个错误表明在某个地方，代码尝试访问 `undefined` 对象的 `length` 属性。

## 可能的原因

1. **CapacitorHttp 响应格式不同**

   - CapacitorHttp 可能返回字符串形式的 JSON
   - 需要手动解析 JSON 响应

2. **数据结构不匹配**

   - API 响应的数据结构与预期不符
   - `response.data` 可能是 undefined 或 null

3. **错误处理不当**
   - 错误情况下数组变量被设置为非数组值

## 调试步骤

### 1. 检查控制台日志

在 Capacitor 环境下，查看以下日志：

```
[HttpService] CapacitorHttp raw response: { ... }
[HttpService] Parsed JSON data: { ... }
[SearchPage] Raw response: { ... }
[SearchPage] Response data: { ... }
```

### 2. 验证数据类型

确认以下内容：

- `response.data` 不是 undefined
- `response.data.beatmapsets` 是数组
- `searchResults.value` 始终是数组

### 3. 测试网络请求

使用调试脚本 `scripts/debug-http-service.js` 测试基本的 HTTP 请求。

## 修复措施

### 1. JSON 解析增强

```typescript
// 在 httpService.ts 中
let parsedData = response.data;
if (typeof response.data === 'string') {
  try {
    parsedData = JSON.parse(response.data);
  } catch (parseError) {
    console.warn('Failed to parse JSON response:', parseError);
  }
}
```

### 2. 数据验证

```typescript
// 在 SearchPage.vue 中
if (!response.data) {
  throw new Error('No data received from API');
}

const responseData = response.data;
const beatmapsets = responseData.beatmapsets || [];

if (!Array.isArray(beatmapsets)) {
  throw new Error('Invalid response format: beatmapsets is not an array');
}
```

### 3. 错误状态保护

```typescript
// 确保错误情况下数组不会变成 undefined
} catch (error) {
  searchResults.value = [];
  searchPerformed.value = true;
  totalResults.value = 0;
}
```

### 4. 模板保护

```vue
<!-- 在模板中添加额外检查 -->
<div v-else-if="searchResults && searchResults.length > 0"></div>
```

## 测试验证

1. 在 iOS/Android 模拟器中测试搜索功能
2. 检查控制台是否有 HTTP 请求日志
3. 验证错误情况下的 UI 状态
4. 确认成功情况下的数据显示

## 相关文件

- `src/services/httpService.ts` - HTTP 服务包装器
- `src/pages/SearchPage.vue` - 搜索页面
- `scripts/debug-http-service.js` - 调试脚本
