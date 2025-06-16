<template>
  <q-layout
    view="lHh LpR fFf"
    class="main-layout edge-to-edge"
    :class="{ 'platform-mac': isOnMac, 'mobile-fullscreen': isMobile }"
  >
    <!-- 背景填充层 - 确保布局背景色撑满整个屏幕 -->
    <div class="layout-bg-fill" />

    <!-- Header -->
    <q-header class="main-header" :class="{ 'player-page-header': route.name === 'player' }">
      <q-toolbar class="header-toolbar-content" :style="toolbarStyle">
        <!-- 仅在非移动端显示红绿灯区域 -->
        <div
          v-if="!isMobile"
          class="logo-traffic-area q-ml-xs"
          @mouseenter="handleLogoAreaEnter"
          @mouseleave="handleLogoAreaLeave"
        >
          <AppLogo :is-drawer-open="leftDrawerOpen" @toggle-drawer="toggleLeftDrawer" />
          <CustomTrafficLights :isVisible="showTrafficLights" />
        </div>

        <!-- 移动端只显示Logo，不显示红绿灯 -->
        <div v-if="isMobile" class="mobile-logo-area q-ml-xs">
          <AppLogo :is-drawer-open="leftDrawerOpen" @toggle-drawer="toggleLeftDrawer" />
        </div>

        <q-toolbar-title class="header-title draggable-area"></q-toolbar-title>

        <q-btn
          dense
          flat
          round
          icon="queue_music"
          aria-label="Play Queue"
          @click="togglePlayQueue"
          class="non-draggable-area"
        />
      </q-toolbar>
    </q-header>

    <!-- Left Drawer (using AppDrawer component) -->
    <AppDrawer v-model:is-open="leftDrawerOpen" />

    <!-- Play Queue -->
    <PlayQueue
      :visible="playQueueOpen"
      :queue="playQueueData"
      :current-track="currentTrackData"
      @play-track="handlePlayTrack"
      @remove-from-queue="handleRemoveFromQueue"
      @clear-queue="handleClearQueue"
    />

    <!-- Page Container -->
    <q-page-container
      class="page-container-bg"
      :class="{
        'player-page-container': route.name === 'player',
        'edge-to-edge-container': shouldUseEdgeToEdge(),
      }"
      :style="shouldUseEdgeToEdge() ? edgeToEdgeStyle : {}"
    >
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>

      <!-- Mini Player -->
      <MiniPlayer />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMusicStore, type MusicTrack } from 'src/stores/musicStore';
import { useSafeArea } from 'src/composables/useSafeArea';
import AppLogo from 'components/AppLogo.vue';
import AppDrawer from 'components/AppDrawer.vue';
import MiniPlayer from 'components/MiniPlayer.vue';
import CustomTrafficLights from 'components/CustomTrafficLights.vue';
import PlayQueue from 'components/PlayQueue.vue';
import { Capacitor } from '@capacitor/core';

// 定义 Track 类型 - 与 PlayQueue 组件保持一致
interface Track {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  coverUrl?: string;
  beatmapsetId?: number;
}

const leftDrawerOpen = ref(false);
const playQueueOpen = ref(false);
const route = useRoute();
const isOnMac = ref(false);
const isMobile = ref(false);
const isFullScreen = ref(false); // 新增：追踪全屏状态
const showTrafficLights = ref(false); // 控制红绿灯显示
const musicStore = useMusicStore();

// 使用 SafeArea composable 获取动态的安全区域信息
const { edgeToEdgeStyle, shouldUseEdgeToEdge } = useSafeArea();

// 将 MusicTrack 转换为 PlayQueue 组件期望的 Track 类型
const convertToTrack = (musicTrack: MusicTrack): Track => {
  const track: Track = {
    id: musicTrack.id,
    title: musicTrack.title,
  };

  if (musicTrack.artist) track.artist = musicTrack.artist;
  if (musicTrack.duration) track.duration = musicTrack.duration;
  if (musicTrack.coverUrl) track.coverUrl = musicTrack.coverUrl;

  const beatmapsetId = parseInt(musicTrack.id);
  if (!isNaN(beatmapsetId)) track.beatmapsetId = beatmapsetId;

  return track;
};

// 转换播放队列数据
const playQueueData = computed(() => musicStore.playQueue.map(convertToTrack));
const currentTrackData = computed(() =>
  musicStore.currentTrack ? convertToTrack(musicStore.currentTrack) : null,
);

// 监听路由变化，切换到 player 页面时自动收起抽屉
watch(
  () => route.name,
  (newRouteName) => {
    if (newRouteName === 'player' && leftDrawerOpen.value) {
      leftDrawerOpen.value = false;
    }
  },
  { immediate: true },
);

// 动态计算 toolbar 的样式
const toolbarStyle = computed<CSSProperties>(() => {
  const baseStyle: CSSProperties = { paddingLeft: '12px' };

  // 如果在 PlayerPage 页面且抽屉收起，则让 header 透明
  if (route.name === 'player' && !leftDrawerOpen.value) {
    return {
      ...baseStyle,
      backgroundColor: 'transparent',
      backdropFilter: 'none',
      borderBottom: 'none',
    };
  }

  // 如果在 PlayerPage 页面且抽屉展开，则显示半透明背景
  if (route.name === 'player' && leftDrawerOpen.value) {
    return {
      ...baseStyle,
      backgroundColor: 'rgba(31, 31, 39, 0.8)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    };
  }

  return baseStyle;
});

let unlistenEnterFullScreen: (() => void) | undefined;
let unlistenLeaveFullScreen: (() => void) | undefined;

onMounted(async () => {
  // 检测是否为移动端平台
  isMobile.value = Capacitor.isNativePlatform();

  // SafeArea 插件已通过 capacitor.config.json 自动配置为透明状态栏和导航栏
  // initialize() 在 boot/safe-area.ts 中已调用，CSS 变量现在可用
  if (isMobile.value) {
    console.log('[MainLayout] Mobile platform detected - SafeArea CSS variables available');
  }

  // 桌面端 Electron 窗口控制配置
  if (window.electron?.process && window.electron.windowControls && window.electron.ipcRenderer) {
    const platform = window.electron.process.platform;
    isOnMac.value = platform === 'darwin';
    try {
      isFullScreen.value = await window.electron.windowControls.isFullScreen();
    } catch (e) {
      console.error('Error getting initial window states:', e);
    }
    unlistenEnterFullScreen = window.electron.windowControls.onEnterFullScreen(() => {
      isFullScreen.value = true;
    });
    unlistenLeaveFullScreen = window.electron.windowControls.onLeaveFullScreen(() => {
      isFullScreen.value = false;
    });
  } else {
    isOnMac.value = false;
  }
});

onUnmounted(() => {
  if (unlistenEnterFullScreen) unlistenEnterFullScreen();
  if (unlistenLeaveFullScreen) unlistenLeaveFullScreen();
});

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// 播放队列相关方法
function togglePlayQueue() {
  playQueueOpen.value = !playQueueOpen.value;
}

function handlePlayTrack(track: Track) {
  // 在播放队列中找到歌曲索引并播放
  const trackIndex = musicStore.playQueue.findIndex((t) => t.id === track.id);
  if (trackIndex >= 0) {
    musicStore.playFromQueue(trackIndex);
  }
  console.log('Playing track:', track.title);
}

function handleRemoveFromQueue(index: number) {
  musicStore.removeFromQueue(index);
}

function handleClearQueue() {
  musicStore.clearPlayQueue();
}

// 红绿灯区域鼠标事件处理（所有平台都启用）
function handleLogoAreaEnter() {
  showTrafficLights.value = true;
}

function handleLogoAreaLeave() {
  showTrafficLights.value = false;
}
</script>

<style lang="scss" scoped>
@use 'sass:color';

$header-bg: #1f1f27 !default;
$dark-page: #121218 !default;
$header-text: #ffffff !default;
$primary: #ff4081 !default; // 确保 $primary 已定义

// 布局背景填充层 - 确保背景色撑满整个屏幕
.layout-bg-fill {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  z-index: -1000; // 确保在所有内容之下
  background-color: $dark-page;
  pointer-events: none; // 确保不会阻止用户交互和滚动
}

// 移除空的样式规则以避免 lint 错误
.main-layout {
  // 确保布局始终占满整个屏幕
  min-height: 100vh !important;
  min-height: 100dvh !important;
  width: 100vw !important;
  background-color: $dark-page !important;
  position: relative;
  overflow-x: hidden; // 只隐藏水平滚动，保留垂直滚动

  // 移动端：确保布局占满整个屏幕并启用 Edge-to-Edge
  @media (max-width: 768px) {
    min-height: 100vh !important;
    min-height: 100dvh !important; // 动态视口高度
    width: 100vw !important;
    margin: 0 !important;
    padding: 0 !important;
    background-color: $dark-page !important; // 确保背景色延伸到底部

    // Edge-to-Edge 模式：确保内容延伸到状态栏和导航栏区域
    position: relative;
    overflow-x: hidden; // 只隐藏水平滚动，保留垂直滚动

    // 使用 CSS 变量来处理安全区域
    --status-bar-height: env(safe-area-inset-top);
    --navigation-bar-height: env(safe-area-inset-bottom);
    --safe-area-left: env(safe-area-inset-left);
    --safe-area-right: env(safe-area-inset-right);
  }
}

.page-container-bg {
  background-color: $dark-page;
  color: $header-text;
  position: relative;
  min-height: 100vh;
  min-height: 100dvh; // 动态视口高度

  // 默认情况下不添加 padding-bottom，保持 edge-to-edge
  // 只有当 MiniPlayer 显示时才通过 JavaScript 动态添加 margin-bottom

  // Player Page 特殊处理：完全延伸到屏幕边缘
  &.player-page-container {
    padding-bottom: 0 !important; // Player Page 不考虑任何安全区域
    min-height: 100vh !important;
    min-height: 100dvh !important;
  }
}

// Edge-to-Edge 容器样式
.edge-to-edge-container {
  // 移动端的 Edge-to-Edge 支持
  @media (max-width: 768px) {
    // 让内容延伸到整个屏幕
    position: relative;

    // 确保内容可以到达屏幕边缘
    margin: 0 !important;

    // 背景延伸模式：不添加任何 padding，让背景完全覆盖屏幕
    padding: 0 !important;

    // Player Page 特殊处理：完全覆盖到边缘
    &.player-page-container {
      padding: 0 !important;

      // 使用伪元素来处理背景延伸
      &::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: $dark-page;
        z-index: -1;
        pointer-events: none;
      }
    }
  }
}

.main-header {
  background: transparent !important;
  box-shadow: none !important;
  color: $header-text;
  -webkit-app-region: drag;

  // 移动端：让header延伸到状态栏区域，并保持固定定位，启用 Edge-to-Edge
  @media (max-width: 768px) {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 2000 !important;

    // Edge-to-Edge 模式：让头部延伸到状态栏区域
    padding-top: 0 !important;
    margin-top: 0 !important;

    // Player Page 特殊处理：完全隐藏
    &.player-page-header {
      display: none !important;
    }

    // 为状态栏区域添加毛玻璃效果（非 Player Page）
    &:not(.player-page-header)::before {
      content: '';
      position: absolute;
      top: calc(-1 * var(--safe-area-inset-top, 0px)); // 使用新的 CSS 变量
      left: 0;
      right: 0;
      height: calc(100% + var(--safe-area-inset-top, 0px)); // 使用新的 CSS 变量
      background-color: rgba(31, 31, 39, 0.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      z-index: -1;
      pointer-events: none;
    }
  }

  .header-toolbar-content {
    background-color: rgba(31, 31, 39, 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    width: 100%;
    padding-right: 12px;
    transition: all 0.3s ease;

    // 移动端：添加顶部padding以适配安全区域（非 Player Page）
    @media (max-width: 768px) {
      .main-header:not(.player-page-header) & {
        padding-top: var(--safe-area-inset-top, 0px); // 使用新的 CSS 变量
        background: transparent; // 因为毛玻璃效果由::before伪元素提供
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        border-bottom: none;
      }
    }
  }

  .header-logo-wrapper {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px; // 可以调整
    border-radius: 50%;
    -webkit-app-region: no-drag; // Logo 区域不可拖动，以便点击
    margin-left: 0; // 确保在 toolbarStyle 应用的 padding-left 之后正确对齐
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .logo-traffic-area {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 4px;
    padding-right: 80px; // 为红绿灯区域预留空间
    -webkit-app-region: no-drag; // 整个区域不可拖动，以便点击
    margin-left: 0;
    border-radius: 50px 20px 20px 50px; // 圆角设计，左侧更圆
    position: relative;

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  .mobile-logo-area {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 4px;
    -webkit-app-region: no-drag;
    margin-left: 0;
    border-radius: 50%;

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  .header-title {
    font-weight: 600;
    letter-spacing: 0.02em;
    margin-left: 8px;
    flex-grow: 1; // 让标题占据剩余空间，成为主要的拖动区域
    text-align: center; // 可以选择让标题居中
    // -webkit-app-region: drag; // 已在 .main-header 设置，这里不需要重复，除非想更精确控制
  }

  // 所有可交互元素设为不可拖动
  .q-btn,
  .q-toolbar__title:not(.draggable-area),
  .header-logo-wrapper {
    -webkit-app-region: no-drag;
  }
}

// --- Page Transitions ---
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
