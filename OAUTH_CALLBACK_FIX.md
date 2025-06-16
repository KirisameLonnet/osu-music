# OAuth 回调超时问题修复指南

## 问题描述

用户在 iOS 上进行 OAuth 登录时，浏览器打开后显示 "Opening Browser"，然后超时，没有收到来自 osu.ppy.sh 的回调。

## 已应用的修复

### 1. 改进深链接处理逻辑 (`src/boot/deeplink.ts`)

- **修复前**: 立即关闭所有打开的浏览器，可能导致用户还未完成授权就关闭了
- **修复后**: 只有在确认收到 OAuth 回调时才关闭浏览器
- **好处**: 用户有足够时间完成 OAuth 授权流程

### 2. 增加 OAuth 超时时间 (`src/services/platform/capacitor.ts`)

- **修复前**: 30秒超时，可能不够用户完成授权
- **修复后**: 60秒超时，并提供更详细的错误信息
- **好处**: 给用户更多时间，错误信息更有帮助

### 3. 改进平台服务注册时机 (`src/pages/OsuCallbackPage.vue`)

- **修复前**: 在开始 OAuth 的同时注册平台服务
- **修复后**: 在开始 OAuth 前注册平台服务，并等待初始化完成
- **好处**: 确保深链接处理器能正确接收回调

### 4. 添加诊断和测试功能 (`src/pages/AuthSettingsPage.vue`)

- 新增"测试深链接"按钮
- 改进诊断信息显示
- 提供测试 URL 供用户验证深链接功能

## 故障排除步骤

### 步骤 1: 验证 OSU! 开发者控制台设置

1. 访问 https://osu.ppy.sh/home/account/edit#oauth
2. 确认应用的 "Redirect URIs" 包含: `osu-music-fusion://oauth/callback`
3. 确认应用类型为 "Public Client"（公共客户端）
4. 确认权限范围包含所需的 scopes

### 步骤 2: 测试深链接功能

1. 在应用的 Auth Settings 页面点击"测试深链接"
2. 复制提供的测试 URL
3. 在 Safari 中输入该 URL
4. 确认应用能够正确打开并处理深链接

### 步骤 3: 检查网络连接

1. 确保设备可以访问 osu.ppy.sh
2. 检查是否有防火墙或代理干扰
3. 尝试在浏览器中直接访问 OSU! 网站

### 步骤 4: 查看调试日志

启用开发者工具查看控制台日志，关键日志包括：

- `[DeepLink] App opened with URL:` - 确认收到深链接
- `[DeepLink] OAuth callback detected!` - 确认识别为 OAuth 回调
- `[CapacitorPlatform] OAuth completed successfully` - 确认 OAuth 完成

## 用户指导

### 如果仍然遇到超时问题：

1. **检查 OSU! 应用设置**

   - 登录 OSU! 开发者控制台
   - 确认 Redirect URI 完全匹配：`osu-music-fusion://oauth/callback`
   - 确认 Client ID 和 Client Secret 正确

2. **重试流程**

   - 关闭并重新打开应用
   - 确保网络连接稳定
   - 在 OAuth 页面上完成授权后，查看是否有"打开应用"的提示

3. **手动测试**
   - 使用"测试深链接"功能验证深链接是否工作
   - 如果深链接测试失败，可能需要重新安装应用

## 技术细节

### URL Scheme 配置

- iOS Info.plist 配置了两个 schemes：`osumusic` 和 `osu-music-fusion`
- 应用使用 `osu-music-fusion://oauth/callback` 作为回调 URL
- 确保 OSU! 控制台中的设置与此完全匹配

### 回调流程

1. 用户点击登录 → 打开浏览器
2. 用户在 OSU! 页面授权 → OSU! 重定向到 `osu-music-fusion://oauth/callback?code=...`
3. iOS 系统识别 URL scheme → 打开应用
4. 深链接处理器接收 URL → 提取授权码
5. 应用用授权码换取访问令牌 → 完成登录

### 常见失败点

- Redirect URI 不匹配
- 深链接处理器未正确注册
- 浏览器关闭过早
- 网络连接问题
- Client ID/Secret 错误

## 开发建议

对于未来的改进：

1. 添加更多用户友好的错误提示
2. 实现 OAuth 重试机制
3. 提供替代登录方法（如复制粘贴授权码）
4. 添加网络连接检测
5. 提供详细的设置指导界面
