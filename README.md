# 🎵 Osu! Music

## 项目目标 🚀

Osu! Music 是一款集成 osu! API 的跨平台音乐软件，专为 osu! 玩家打造独特的音乐体验。用户可以通过本应用登录 osu! 账号，访问游玩历史、搜索浏览音乐，并享受与 osu! 生态深度整合的音乐功能。

## 当前状态与开发进度 📝

项目正在积极开发中，音乐库系统已实现。

### 已完成 ✅

**核心架构与认证系统**:

- 基于 Electron + Vue 3 + Quasar + Pinia + TypeScript 构建
- 实现无边框窗口设计，兼容 macOS 原生控件
- 完整的 osu! OAuth 2.0 认证流程 (Client Secret 流程)
- 支持自定义协议回调 (`osu-music-fusion://oauth/callback`)
- Token 自动刷新与会话持久化

**音乐库管理系统**:

- 完整的音乐文件扫描和管理功能
- 支持 osu! 音乐文件格式 (`id-songname.mp3`)
- 播放列表创建、编辑和删除
- Apple Music 风格的界面设计
- 音乐搜索和筛选功能

**用户界面**:

- 主布局：顶部栏 + 侧边导航抽屉
- 音乐库页面：播放列表管理 + 全部音乐浏览
- 播放器页面：完整的音乐播放控制界面
- 搜索页面：osu! 谱面搜索和浏览
- 设置页面：OAuth 凭证配置和账户管理

**播放功能**:

- 音乐播放、暂停、上一首/下一首控制
- 随机播放和循环播放模式
- 音量控制和进度条拖拽
- 播放状态管理和持久化

### 进行中/计划中 🚧

**核心功能完善**:

- [ ] **凭证安全存储**: 实现 Client ID 和 Client Secret 的加密持久化存储
- [ ] **音乐文件扫描**: 支持从实际文件系统扫描音乐文件
- [ ] **音频播放引擎**: 集成真实的音频播放功能
- [ ] **音频下载**: 实现 osu! 谱面音频下载和管理

**osu! 集成功能**:

- [ ] 读取用户游玩历史 (Recent Plays, Top Scores)
- [ ] 个人资料展示和统计信息
- [ ] 谱面收藏和推荐系统
- [ ] 与本地音乐库的关联功能

**UI/UX 优化**:

- [ ] **底部播放控制条**: 全局音乐播放控制界面
- [ ] 主题系统和个性化设置
- [ ] 页面过渡动画和交互优化
- [ ] 响应式设计完善

**跨平台支持**:

- [ ] Linux 构建支持完善
- [ ] 统一的多平台体验设计

## 技术栈 🛠️

- **桌面应用框架**: [Electron](https://www.electronjs.org/)
- **前端框架**: [Vue 3](https://vuejs.org/) (Composition API + TypeScript)
- **UI 组件库**: [Quasar Framework (v2)](https://quasar.dev/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/)
- **HTTP 客户端**: [Axios](https://axios-http.com/)
- **API 集成**: [osu! API v2](https://osu.ppy.sh/docs/index.html) (OAuth 2.0)

## 项目特色 ✨

- **🎵 音乐库管理**: 完整的本地音乐文件扫描、组织和播放功能
- **🎮 osu! 深度集成**: 原生支持 osu! 账户登录和数据同步
- **🎨 现代化界面**: 融合 Apple Music 和 osu! lazer 的设计语言
- **📱 跨平台支持**: 一次开发，多端部署 (桌面 + 移动端)
- **🤖 AI 友好开发**: 拥抱 AI 辅助编程，提高开发效率

## 参与贡献 ❤️

osu! Music 是一个开源项目，我们非常欢迎有兴趣的开发者加入！

**我们正在寻找这样的贡献者：**

- 对 Electron/Vue.js 前端开发有经验或兴趣
- 熟悉现代前端技术栈 (Vue 3, TypeScript, Quasar, Pinia)
- 有音乐应用或游戏相关开发经验优先
- **熟练使用 AI 编程工具** (GitHub Copilot, Claude, ChatGPT 等)
- 对 osu! 文化和音乐有热情
- 积极主动，善于沟通协作

**贡献流程：**

1. **Fork 本仓库** 并 clone 到本地
2. **创建功能分支** (`git checkout -b feature/your-feature-name`)
3. **进行开发** 并确保代码质量
4. **提交更改** (`git commit -m 'Add some feature'`)
5. **推送分支** (`git push origin feature/your-feature-name`)
6. **创建 Pull Request** 到主分支

如有任何问题或建议，欢迎通过 Issue 或 Discussions 与我们交流。

## 快速开始 🚀

### 环境要求

- Node.js 16+
- npm 或 yarn
- Git

### 安装步骤

1. **克隆仓库**:

   ```bash
   git clone https://github.com/KirisameLonnet/osu-music.git
   cd osu-music
   ```

2. **安装依赖**:

   ```bash
   npm install
   # 或者使用 yarn
   yarn install
   ```

3. **设置架构特定的依赖 (可选)**:

   为了支持不同架构的原生模块，你可以设置架构特定的 `node_modules`：

   ```bash
   # 自动检测并设置当前架构
   npm run setup-arch

   # Windows 用户也可以使用 PowerShell 脚本
   npm run setup-arch:win
   ```

   这将为你的架构（如 Windows ARM64、macOS ARM64 等）创建独立的依赖目录。详情请查看 [架构设置文档](docs/ARCHITECTURE_SETUP.md)。

4. **启动开发环境**:

   ```bash
   # 启动 Electron 开发模式
   npm run dev:electron
   # 或使用 Quasar CLI
   quasar dev -m electron
   ```

5. **构建生产版本**:
   ```bash
   # 构建 Electron 应用
   npm run build:electron
   # 或使用 Quasar CLI
   quasar build -m electron
   ```

## 许可证 📄

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 致谢 🙏

- [osu!](https://osu.ppy.sh/) - 提供优秀的音乐游戏和 API
- [Quasar Framework](https://quasar.dev/) - 强大的 Vue.js 框架
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用开发
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架

## 联系方式 📮

- 项目主页: [GitHub Repository](https://github.com/KirisameLonnet/osu-music)
- 问题反馈: [GitHub Issues](https://github.com/KirisameLonnet/osu-music/issues)
- 功能讨论: [GitHub Discussions](https://github.com/KirisameLonnet/osu-music/discussions)

---

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**
