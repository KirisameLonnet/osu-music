# OSU! Music - 跨平台桥接层文档

## 架构概述

本项目实现了统一的跨平台桥接层，使得 Electron 和 Capacitor（iOS/Android）能够无缝调用相同的接口。通过抽象化平台细节，确保业务逻辑代码在所有平台上保持一致。

## 平台支持

- ✅ **Electron** (Windows, macOS, Linux)
- ✅ **iOS** (通过 Capacitor)
- ✅ **Android** (通过 Capacitor)
- ✅ **Web** (降级支持)

## 核心组件

### 1. 平台接口定义 (`src/services/platform/types.ts`)

定义了统一的平台服务接口，包括：

- 📂 **文件系统操作** - 读写文件、目录管理
- 🌐 **HTTP 请求** - 统一的网络请求接口
- 💾 **本地存储** - 跨平台的键值存储
- 🔐 **OAuth 认证** - 统一的认证流程
- 📁 **文件选择** - 跨平台文件选择器
- 🔄 **应用生命周期** - 应用状态管理
- 📱 **移动端特性** - 状态栏、通知等

### 2. Electron 实现 (`src/services/platform/electron.ts`)

通过 Electron IPC 实现所有平台接口：

```typescript
// 示例：读取文件
await platform.readFile({ path: '/path/to/file.txt', encoding: 'utf8' });
```

### 3. Capacitor 实现 (`src/services/platform/capacitor.ts`)

使用 Capacitor 插件实现移动端功能：

- 📱 **iOS 特殊支持**：在 Files app 中创建专用的 OSU! Music 文件夹
- 🎵 **音频文件管理**：支持导入和管理音频文件
- 📁 **目录结构**：自动创建 Music、Playlists、Cache、Covers 子目录

### 4. 平台工厂 (`src/services/platform/index.ts`)

自动检测运行环境并返回对应的平台实现：

```typescript
import { getPlatformService } from '@/services/platform';

const platform = getPlatformService(); // 自动选择正确的实现
const info = platform.getPlatformInfo();
console.log(`Running on: ${info.type}`);
```

## 使用示例

### 基础使用

```typescript
import { getPlatformService } from '@/services/platform';

const platform = getPlatformService();

// 检查平台信息
const info = platform.getPlatformInfo();
console.log(`Platform: ${info.type}, Native: ${info.isNative}`);

// 文件操作
await platform.writeFile({
  path: 'songs/my-song.mp3',
  data: audioData,
});

const songData = await platform.readFile({
  path: 'songs/my-song.mp3',
  encoding: 'base64',
});

// HTTP 请求
const response = await platform.httpRequest({
  url: 'https://api.example.com/data',
  method: 'GET',
});

// 本地存储
await platform.setStorage('user-preferences', JSON.stringify(prefs));
const savedPrefs = await platform.getStorage('user-preferences');
```

### 音乐服务集成

```typescript
import { getMusicService } from '@/services/musicService';

const musicService = getMusicService();

// 导入音乐文件（跨平台）
const importedTracks = await musicService.importMusicFiles();

// 创建播放列表
const playlist = await musicService.createPlaylist('My Favorites', tracks);

// iOS 特定：获取 OSU Music 目录
const osuDir = await musicService.getOsuMusicDirectory();
console.log(`OSU Music directory: ${osuDir}`);
```

## 构建和部署

### Electron 构建

```bash
# 开发
npm run dev:electron

# 构建
npm run build:electron

# 特定平台构建
npm run build:electron:mac
npm run build:electron:win
npm run build:electron:linux
```

### Capacitor 构建

```bash
# 添加平台
npm run cap:add:ios
npm run cap:add:android

# 开发
npm run dev:ios
npm run dev:android

# 构建
npm run build:ios
npm run build:android

# 同步代码
npm run cap:sync
```

### 配置文件

#### Capacitor 配置 (`capacitor.config.json`)

```json
{
  "appId": "com.osumusic.app",
  "appName": "OSU! Music",
  "webDir": "dist/spa",
  "ios": {
    "scheme": "OSU Music",
    "contentInset": "automatic"
  },
  "android": {
    "allowMixedContent": true
  }
}
```

## iOS 特性

### Files App 集成

在 iOS 设备上，应用会自动在 Documents 目录下创建 `OSU-Music` 文件夹，用户可以通过 Files app 直接访问：

```
Documents/
  └── OSU-Music/
      ├── Music/      # 音频文件
      ├── Playlists/  # 播放列表
      ├── Cache/      # 缓存文件
      └── Covers/     # 封面图片
```

### iPad 支持

- ✅ 响应式 UI 适配不同窗口比例
- ✅ 支持分屏和滑动覆盖模式
- ✅ 键盘快捷键支持

## Android 特性

### 文件权限

应用会自动请求必要的文件访问权限：

- 读取外部存储
- 写入外部存储
- 音频播放权限

### 后台播放

支持 Android 后台音频播放：

- 媒体会话控制
- 通知栏播放控制
- 锁屏播放控制

## 开发最佳实践

### 1. 使用平台抽象

❌ **错误**：直接调用平台特定 API

```typescript
// 不要这样做
if (window.electron) {
  window.electron.ipcRenderer.invoke('read-file', path);
} else {
  Filesystem.readFile({ path });
}
```

✅ **正确**：使用统一接口

```typescript
// 这样做
const platform = getPlatformService();
await platform.readFile({ path, encoding: 'utf8' });
```

### 2. 错误处理

```typescript
try {
  const data = await platform.readFile({ path: 'config.json' });
  return JSON.parse(data);
} catch (error) {
  console.error('Failed to read config:', error);
  // 提供默认配置或降级处理
  return getDefaultConfig();
}
```

### 3. 平台特定功能

```typescript
const platform = getPlatformService();
const info = platform.getPlatformInfo();

if (info.type === 'ios') {
  // iOS 特定逻辑
  await platform.setStatusBarStyle?.('light');
} else if (info.type === 'android') {
  // Android 特定逻辑
}
```

## 故障排除

### 常见问题

1. **Capacitor 构建失败**

   - 确保已安装 Xcode (iOS) 或 Android Studio (Android)
   - 运行 `npm run cap:sync` 同步代码

2. **文件访问权限问题**

   - iOS：检查 Info.plist 文件权限配置
   - Android：检查 AndroidManifest.xml 权限声明

3. **音频播放问题**
   - 确保音频文件格式支持
   - 检查平台特定的音频权限

### 调试技巧

1. **启用平台日志**

```typescript
const platform = getPlatformService();
console.log('Platform info:', platform.getPlatformInfo());
```

2. **使用开发者工具**

```bash
# iOS
npm run cap:open:ios

# Android
npm run cap:open:android
```

## 更多资源

- [Quasar Framework](https://quasar.dev/)
- [Capacitor Documentation](https://capacitorjs.com/)
- [Electron Documentation](https://www.electronjs.org/)

## 贡献

欢迎提交 Issue 和 Pull Request 来改进跨平台支持！

- **播放列表目录**: `%USERPROFILE%\Music\osu-music\playlists\`
- **路径分隔符**: `\` (反斜杠)
- **特殊处理**:
  - 支持长文件名
  - 处理 Windows 文件名限制字符：`< > : " | ? * \`
  - 自动处理 UNC 路径

### macOS

- **支持版本**: macOS 10.14 及以上
- **音乐目录**: `~/Music/osu-music/`
- **播放列表目录**: `~/Music/osu-music/playlists/`
- **路径分隔符**: `/` (正斜杠)
- **特殊处理**:
  - 支持 Unicode 文件名
  - 处理 .DS_Store 文件自动忽略
  - 支持沙盒安全模型

### Linux

- **支持版本**: Ubuntu 18.04+, Fedora 30+, Arch Linux
- **音乐目录**: `~/Music/osu-music/` 或 `$XDG_MUSIC_DIR/osu-music/`
- **播放列表目录**: `~/Music/osu-music/playlists/`
- **路径分隔符**: `/` (正斜杠)
- **特殊处理**:
  - 遵循 XDG 基本目录规范
  - 支持符号链接
  - 处理权限管理

## 跨平台实现要点

### 1. 路径处理

```typescript
// ✅ 正确：使用 path.join() 和 app.getPath()
const musicPath = path.join(app.getPath('music'), 'osu-music');

// ❌ 错误：硬编码路径分隔符
const musicPath = os.homedir() + '/Music/osu-music';
```

### 2. 文件名处理

```typescript
// ✅ 正确：规范化文件名，移除不安全字符
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Windows 非法字符
    .replace(/[\u0000-\u001f]/g, '_') // 控制字符
    .trim()
    .substring(0, 255); // 限制长度
}
```

### 3. 目录创建

```typescript
// ✅ 正确：递归创建目录，处理权限
await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
```

### 4. 文件权限

```typescript
// ✅ 正确：设置合适的文件权限
await fs.writeFile(filePath, data, { mode: 0o644 });
```

## 测试覆盖

### Windows 测试要点

- [ ] 长路径支持 (>260 字符)
- [ ] 特殊字符文件名
- [ ] 不同磁盘驱动器
- [ ] 网络路径 (UNC)
- [ ] 管理员权限处理

### macOS 测试要点

- [ ] 中文/日文文件名
- [ ] 沙盒权限
- [ ] 外部存储设备
- [ ] 大小写敏感性
- [ ] .app 包权限

### Linux 测试要点

- [ ] 不同发行版兼容性
- [ ] SELinux/AppArmor 权限
- [ ] 符号链接处理
- [ ] 挂载点处理
- [ ] 用户权限变化

## 错误处理

### 常见错误及解决方案

#### ENOENT (文件不存在)

```typescript
try {
  await fs.access(filePath);
} catch (error) {
  if (error.code === 'ENOENT') {
    await ensureDirectoryExists(path.dirname(filePath));
  }
}
```

#### EACCES (权限拒绝)

```typescript
try {
  await fs.writeFile(filePath, data);
} catch (error) {
  if (error.code === 'EACCES') {
    // 尝试修改权限或使用备用位置
    console.warn('Permission denied, trying fallback location');
  }
}
```

#### EMFILE (文件句柄耗尽)

```typescript
// 使用连接池或限制并发文件操作
const semaphore = new Semaphore(10); // 限制同时打开10个文件
```

## 性能优化

### 文件系统性能

- 使用流式读写大文件
- 批量操作减少系统调用
- 缓存文件状态信息
- 异步操作避免阻塞

### 内存使用

- 及时释放文件句柄
- 使用分页加载大目录
- 限制并发文件操作数量

## 安全考虑

### 路径遍历防护

```typescript
function validatePath(userPath: string, baseDir: string): boolean {
  const resolvedPath = path.resolve(baseDir, userPath);
  return resolvedPath.startsWith(path.resolve(baseDir));
}
```

### 文件类型验证

```typescript
const allowedExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a'];
const isValidAudioFile = allowedExtensions.includes(path.extname(filename).toLowerCase());
```

### 大小限制

```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_PLAYLIST_SIZE = 1024 * 1024; // 1MB
```
