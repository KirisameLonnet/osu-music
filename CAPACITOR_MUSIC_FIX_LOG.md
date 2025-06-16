# Capacitor 音乐文件名解析和封面显示修复日志

## 修复概览

在 Capacitor（iOS/Android）环境下，修复了以下问题：

1. Beatmap 音乐文件名解析
2. Music Card 信息展示
3. osu! 官方封面图片 CORS 问题

## 详细修复内容

### 1. 文件名解析增强 (`src/utils/beatmapFileNameParser.ts`)

#### 修复内容：

- **正则表达式模式**：支持 `{beatmapId}-{title}-{artist}.{ext}` 格式
- **字符转义增强**：添加了 HTML 实体解码
- **详细日志**：每个解析步骤都有详细的控制台输出

#### 日志输出：

```
[BeatmapFileNameParser] Parsing filename: 123456-Song_Title-Artist_Name.mp3
[BeatmapFileNameParser] Name without extension: 123456-Song_Title-Artist_Name
[BeatmapFileNameParser] Extension: .mp3
[BeatmapFileNameParser] Regex match result: ['123456-Song_Title-Artist_Name', '123456', 'Song_Title', 'Artist_Name']
[BeatmapFileNameParser] Extracted parts: { beatmapIdStr: '123456', title: 'Song_Title', artist: 'Artist_Name' }
[BeatmapFileNameParser] Unescaping filename: Song_Title
[BeatmapFileNameParser] Unescaped result: Song Title
[BeatmapFileNameParser] Unescaping filename: Artist_Name
[BeatmapFileNameParser] Unescaped result: Artist Name
[BeatmapFileNameParser] Successfully parsed: { beatmapId: 123456, title: 'Song Title', artist: 'Artist Name', extension: '.mp3', originalFileName: '123456-Song_Title-Artist_Name.mp3' }
```

### 2. Music Service 解析统一 (`src/services/musicService.ts`)

#### 修复内容：

- **统一解析逻辑**：所有音轨创建都使用 `parseTrackInfo` 方法
- **封面 URL 生成**：从 beatmap ID 自动生成封面 URL
- **异步封面加载**：支持后台加载实际可用的封面
- **音乐库同步增强**：新音轨添加后自动加载封面

#### 日志输出：

```
[MusicService] Starting music library sync...
[MusicService] Found new track: Song Title
[MusicService] Added 1 new tracks to library.
[MusicService] Starting to load covers for new tracks...
[MusicService] Loading cover for track: Song Title
[MusicService] Attempting to load cover for beatmap ID: 123456
[MusicService] Cover loaded successfully: blob:http://localhost:8080/abc123...
[MusicService] Updated cover URL in music library
[MusicService] Finished loading covers for new tracks.
```

### 3. 封面图片服务增强 (`src/services/coverImageService.ts`)

#### 修复内容：

- **CORS 问题解决**：使用 httpService 绕过跨域限制
- **多重回退策略**：Web 直连 → httpService 下载 → 占位符
- **详细日志记录**：每个步骤都有状态追踪
- **Blob URL 缓存**：避免重复下载，提高性能

#### 日志输出：

```
[CoverImageService] Requesting cover image: { beatmapId: 123456, size: 'card', url: 'https://assets.ppy.sh/beatmaps/123456/covers/card.jpg', platform: 'ios', isNative: true }
[CoverImageService] Downloading cover image: https://assets.ppy.sh/beatmaps/123456/covers/card.jpg
[CoverImageService] Cover image downloaded and cached: 123456-card
```

### 4. Music Card 组件修复 (`src/components/MusicCard.vue`)

#### 修复内容：

- **beatmapId 计算属性**：统一提取 beatmap ID 的逻辑
- **智能封面显示**：优先使用 coverUrl，回退到生成的 URL
- **beatmap ID 显示**：在卡片上显示 beatmap 链接
- **错误处理增强**：封面加载失败时尝试多种尺寸

#### 模板新增内容：

```vue
<!-- 显示 beatmap ID（如果有的话） -->
<p v-if="beatmapId" class="beatmap-id text-caption text-blue-6 q-mb-xs">
  <q-icon name="link" size="xs" class="q-mr-xs" />
  Beatmap #{{ beatmapId }}
</p>
```

#### 日志输出：

```
[MusicCard] Generating cover URL for track: { title: 'Song Title', artist: 'Artist Name', id: 'track_123...', album: 'osu! Beatmap #123456', coverUrl: 'blob:...', fileName: '123456-Song_Title-Artist_Name.mp3', extractedBeatmapId: 123456 }
[MusicCard] Using existing coverUrl: blob:http://localhost:8080/abc123...
[MusicCard] Image error for track: Song Title currentSrc: https://assets.ppy.sh/beatmaps/123456/covers/card.jpg
[MusicCard] Trying list cover: https://assets.ppy.sh/beatmaps/123456/covers/list.jpg
```

## 关键数据流程

### 文件名 → 音轨信息

```
输入: "123456-Song_Title-Artist_Name.mp3"
     ↓ BeatmapFileNameParser.parseBeatmapFileName()
输出: {
  beatmapId: 123456,
  title: "Song Title",
  artist: "Artist Name",
  extension: ".mp3"
}
     ↓ musicService.parseTrackInfo()
音轨: {
  id: "track_...",
  title: "Song Title",
  artist: "Artist Name",
  album: "osu! Beatmap #123456",
  coverUrl: "https://assets.ppy.sh/beatmaps/123456/covers/card.jpg"
}
```

### 封面获取流程

```
原始 URL: https://assets.ppy.sh/beatmaps/123456/covers/card.jpg
     ↓ (CORS 失败)
httpService: 下载为 ArrayBuffer
     ↓
Blob URL: blob:http://localhost:8080/abc123...
     ↓
Music Card: 显示封面图片
```

## 测试建议

### 1. 文件名解析测试

在控制台中运行：

```javascript
// 测试不同文件名格式
const testFiles = [
  '123456-Song_Title-Artist_Name.mp3',
  '789012-Another&lt;Song&gt;-Some_Artist.wav',
  'regular-song-file.mp3', // 非 beatmap 文件
];

testFiles.forEach((fileName) => {
  const result = BeatmapFileNameParser.parseBeatmapFileName(fileName);
  console.log('File:', fileName, 'Result:', result);
});
```

### 2. 封面加载测试

```javascript
// 测试封面服务
const coverService = new CoverImageService();
coverService.getCoverImage(123456, 'card').then((url) => {
  console.log('Cover URL:', url);
});
```

### 3. 整体流程测试

1. 添加一个 beatmap 音频文件到应用
2. 检查控制台日志输出
3. 验证 Music Card 显示的信息
4. 检查封面图片是否正确加载

## 可能的问题和解决方案

### 问题1：封面图片仍然不显示

**原因**：httpService 可能没有正确处理 ArrayBuffer
**解决方案**：检查 httpService 的 responseType 设置

### 问题2：文件名解析失败

**原因**：文件名格式不符合预期
**解决方案**：检查实际文件名格式，调整正则表达式

### 问题3：beatmapId 显示错误

**原因**：album 字段格式不正确
**解决方案**：检查 musicService 中的 album 字段设置

## 修复总结

✅ **已完成的修复：**

1. **文件名解析器 (`src/utils/beatmapFileNameParser.ts`)**

   - 增强了正则表达式匹配
   - 添加了 HTML 实体解码
   - 完整的日志记录

2. **音乐服务 (`src/services/musicService.ts`)**

   - 统一了文件名解析逻辑
   - 实现了异步封面加载
   - 修复了音乐库同步

3. **封面图片服务 (`src/services/coverImageService.ts`)**

   - 解决了 CORS 跨域问题
   - 实现了多重回退策略
   - 添加了详细的状态日志

4. **Music Card 组件 (`src/components/MusicCard.vue`)**

   - 添加了 beatmapId 计算属性
   - 修复了封面 URL 生成逻辑
   - 在界面上显示 beatmap ID
   - 增强了错误处理

5. **AllMusicPage 页面 (`src/pages/AllMusicPage.vue`)**
   - 修复了列表视图的封面显示
   - 统一了封面 URL 生成逻辑
   - 添加了日志记录

## 核心修复点

### 🔧 **关键问题修复**

- **问题**：MusicCard 和 AllMusicPage 使用 `track.id` 作为 beatmap ID
- **修复**：改为从 `track.album` 字段提取 beatmap ID (`"osu! Beatmap #123456"`)
- **影响**：确保封面 URL 正确生成和显示

### 📊 **数据流修复**

```
文件名: "123456-Song_Title-Artist_Name.mp3"
     ↓ parseTrackInfo()
MusicTrack: {
  id: "track_...",           // 唯一音轨 ID
  title: "Song Title",       // 解析出的标题
  artist: "Artist Name",     // 解析出的艺术家
  album: "osu! Beatmap #123456", // 包含 beatmap ID
  coverUrl: "原始或blob URL"   // 封面图片 URL
}
     ↓ UI 组件
显示: 标题、艺术家、Beatmap #123456、封面图片
```

## 测试建议

### 1. 文件名解析测试

在控制台中运行：

```javascript
// 测试不同文件名格式
const testFiles = [
  '123456-Song_Title-Artist_Name.mp3',
  '789012-Another&lt;Song&gt;-Some_Artist.wav',
  'regular-song-file.mp3', // 非 beatmap 文件
];

testFiles.forEach((fileName) => {
  const result = BeatmapFileNameParser.parseBeatmapFileName(fileName);
  console.log('File:', fileName, 'Result:', result);
});
```

### 2. 封面加载测试

```javascript
// 测试封面服务
const coverService = new CoverImageService();
coverService.getCoverImage(123456, 'card').then((url) => {
  console.log('Cover URL:', url);
});
```

### 3. 整体流程测试

1. 添加一个 beatmap 音频文件到应用
2. 检查控制台日志输出
3. 验证 Music Card 显示的信息
4. 检查封面图片是否正确加载
