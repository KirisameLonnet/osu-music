# TypeScript 项目结构重组报告

## 📁 重组概览

本次重组将所有 TypeScript 文件按照功能和逻辑重新分类，创建了清晰的模块化结构。

## 🏗️ 新的项目结构

```
src/
├── types/                    # 类型定义模块
│   ├── index.ts             # 主类型导出
│   ├── api.ts               # API 相关类型
│   ├── osu.ts               # OSU! 相关类型
│   └── platform.ts          # 平台相关类型
├── services/                # 服务层（重新组织）
│   ├── index.ts             # 服务统一导出
│   ├── api/                 # API 服务
│   │   ├── index.ts         # API 服务导出
│   │   ├── httpService.ts   # HTTP 客户端
│   │   ├── osuApiService.ts # OSU! API 服务
│   │   └── osuAuthService.ts # OSU! 认证服务
│   ├── business/            # 业务逻辑服务
│   │   ├── index.ts         # 业务服务导出
│   │   ├── musicService.ts  # 音乐服务
│   │   ├── audioService.ts  # 音频服务
│   │   ├── coverImageService.ts # 封面图片服务
│   │   ├── beatmapDownloadService.ts # Beatmap 下载服务
│   │   └── audioPlayPreviewService.ts # 音频预览服务
│   └── core/                # 核心服务
│       ├── index.ts         # 核心服务导出
│       └── platform/        # 平台抽象层
│           ├── index.ts
│           ├── types.ts
│           ├── capacitor.ts
│           ├── electron.ts
│           └── binaryDownloader.ts
├── stores/                  # 状态管理（清理后）
│   ├── index.ts            # 状态管理统一导出
│   ├── musicStore.ts       # 音乐状态
│   ├── playlistStore.ts    # 播放列表状态
│   ├── settingsStore.ts    # 设置状态
│   ├── playHistory.ts      # 播放历史状态
│   └── authStore.ts        # 认证状态（从 services 移动）
├── utils/                  # 工具函数
│   ├── index.ts            # 工具函数导出
│   └── beatmapFileNameParser.ts # Beatmap 文件名解析器
├── composables/            # Vue Composables
│   ├── index.ts            # Composables 导出
│   ├── usePlatform.ts      # 平台相关组合式函数
│   └── useSafeArea.ts      # 安全区域组合式函数
├── router/                 # 路由配置
│   ├── index.ts
│   └── routes.ts
├── i18n/                   # 国际化
│   ├── index.ts
│   └── en-US/
│       └── index.ts
├── boot/                   # 启动插件
│   ├── auth.ts
│   ├── axios.ts
│   ├── deeplink.ts
│   ├── i18n.ts
│   └── safe-area.ts
└── env.d.ts               # 环境类型定义
```

## 📋 文件移动清单

### 移动的文件

- `services/auth.ts` → `stores/authStore.ts` （修正分类错误）
- `services/httpService.ts` → `services/api/httpService.ts`
- `services/osuApiService.ts` → `services/api/osuApiService.ts`
- `services/osuAuthService.ts` → `services/api/osuAuthService.ts`
- `services/musicService.ts` → `services/business/musicService.ts`
- `services/audioService.ts` → `services/business/audioService.ts`
- `services/coverImageService.ts` → `services/business/coverImageService.ts`
- `services/beatmapDownloadService.ts` → `services/business/beatmapDownloadService.ts`
- `services/audioPlayPreviewService.ts` → `services/business/audioPlayPreviewService.ts`
- `services/platform/` → `services/core/platform/`

### 删除的文件

- `stores/example-store.ts` （示例文件，不需要）

### 新创建的文件

- `types/index.ts` - 主类型定义文件
- `types/api.ts` - API 相关类型
- `types/osu.ts` - OSU! 相关类型
- `types/platform.ts` - 平台相关类型
- `services/index.ts` - 服务层统一导出
- `services/api/index.ts` - API 服务导出
- `services/business/index.ts` - 业务服务导出
- `services/core/index.ts` - 核心服务导出
- `utils/index.ts` - 工具函数导出
- `composables/index.ts` - Composables 导出

## 🎯 重组的优势

### 1. 清晰的模块分层

- **类型层 (types/)**: 集中管理所有类型定义
- **服务层 (services/)**: 按功能分为 API、业务逻辑、核心服务
- **状态层 (stores/)**: 集中管理应用状态
- **工具层 (utils/)**: 纯函数工具集合
- **组合层 (composables/)**: Vue 3 组合式 API

### 2. 统一的导出入口

每个模块都有 `index.ts` 文件作为统一导出入口，简化了导入路径：

```typescript
// 之前
import { httpService } from 'src/services/httpService';
import { musicService } from 'src/services/musicService';
import { useMusicStore } from 'src/stores/musicStore';

// 现在
import { httpService, musicService } from 'src/services';
import { useMusicStore } from 'src/stores';
```

### 3. 更好的可维护性

- 相关功能聚合在一起
- 依赖关系更清晰
- 更容易进行单元测试
- 代码复用性更强

### 4. TypeScript 友好

- 集中的类型定义便于管理
- 更好的类型推断和检查
- 减少循环依赖

## 🔧 使用指南

### 导入服务

```typescript
// API 服务
import { httpService, osuAuthService } from 'src/services/api';

// 业务服务
import { getMusicService, coverImageService } from 'src/services/business';

// 核心服务
import { getPlatformService } from 'src/services/core';

// 或者统一导入
import { httpService, getMusicService, getPlatformService } from 'src/services';
```

### 导入类型

```typescript
// 从统一类型模块导入
import type { MusicTrack, OsuUserProfile, PlatformInfo } from 'src/types';

// 或者从具体模块导入
import type { ApiResponse } from 'src/types/api';
import type { OsuBeatmap } from 'src/types/osu';
```

### 导入状态管理

```typescript
import { useMusicStore, useAuthStore } from 'src/stores';
```

### 导入工具函数

```typescript
import { BeatmapFileNameParser } from 'src/utils';
```

### 导入 Composables

```typescript
import { usePlatform, useSafeArea } from 'src/composables';
```

## ⚠️ 迁移注意事项

### 需要更新的导入路径

所有现有的组件和页面需要更新导入路径：

1. **服务导入** - 更新所有服务的导入路径
2. **类型导入** - 从新的 types 模块导入类型
3. **状态管理** - 更新 store 的导入路径

### 推荐的更新顺序

1. 首先更新类型导入
2. 然后更新服务导入
3. 最后更新组件和页面中的导入

### 常见的路径更改

```typescript
// 旧路径 → 新路径
'src/services/musicService' → 'src/services/business/musicService'
'src/services/auth' → 'src/stores/authStore'
'src/services/httpService' → 'src/services/api/httpService'
'src/services/platform' → 'src/services/core/platform'
```

## 📈 后续优化建议

1. **批量更新导入路径** - 使用 IDE 的重构功能或脚本批量更新
2. **创建别名** - 在 vite.config.ts 中创建路径别名
3. **文档更新** - 更新项目文档和开发指南
4. **单元测试** - 为每个模块创建相应的测试文件

## ✅ 验证清单

- [ ] 所有 TypeScript 文件已正确分类
- [ ] 所有导出索引文件已创建
- [ ] 类型定义集中管理
- [ ] 服务层结构清晰
- [ ] 状态管理整理完成
- [ ] 项目能够正常编译
- [ ] 所有导入路径已更新

这次重组为项目建立了一个可扩展、易维护的代码结构，为后续开发奠定了良好的基础。
