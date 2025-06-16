// BEATMAP_FILENAME_PARSING_FIX.md

# Beatmap 文件名解析和封面获取修复方案

## 问题描述

1. Capacitor 下文件名解析出现问题
2. 需要从文件名中提取乐曲名/艺术家/铺面ID并正确显示在 Music Card 上
3. 音乐封面从 osu! 官方获取时遇到 CORS 问题
4. 需要添加详细日志来追踪每个步骤

## 当前文件名格式

```
{beatmapId}-{title}-{artist}.{ext}
例如: 721804-テオ-Omoi.mp3
```

## 解决方案

### 1. 文件名解析修复

- 更新 `BeatmapFileNameParser` 添加详细日志
- 确保正确解析中文/日文字符
- 处理特殊字符的转义和还原

### 2. Music Card 显示优化

- 确保 MusicTrack 包含正确的字段
- 在 Music Card 组件中正确显示解析的信息
- 添加 beatmap ID 和链接信息

### 3. 封面获取 CORS 修复

- 使用 httpService 或 coverImageService 避免 CORS
- 实现封面缓存机制
- 添加错误处理和回退方案

### 4. 日志增强

- 在文件名解析每个步骤添加日志
- 在封面获取过程添加详细日志
- 在 Music Card 渲染时添加调试信息

## 实施步骤

1. 增强 BeatmapFileNameParser 的日志和错误处理
2. 更新 musicService 的文件名解析逻辑
3. 修复封面获取的 CORS 问题
4. 确保 Music Card 正确显示所有信息
5. 添加全流程的调试日志
