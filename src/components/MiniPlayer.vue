<template>
  <Transition name="mini-player-slide" appear>
    <div
      v-if="shouldShowMiniPlayer"
      class="mini-player-container"
      :class="{ 'is-collapsed': isCollapsed }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <!-- 收起/展开按钮 -->
      <div class="collapse-btn-container" :class="{ visible: showCollapseButton }">
        <q-btn
          round
          flat
          :icon="isCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
          size="sm"
          @click.stop="toggleCollapse"
          class="collapse-btn"
        />
      </div>

      <div class="mini-player">
        <!-- 背景模糊层 -->
        <div class="background-blur" :style="backgroundStyle"></div>

        <!-- 主要内容 -->
        <div class="mini-player-content" @click="handleContentClick">
          <!-- 旋转封面 -->
          <div class="rotating-cover-container">
            <div class="rotating-cover" :class="{ spinning: isPlaying }">
              <q-img
                v-if="currentTrack?.coverUrl"
                :src="currentTrack.coverUrl"
                class="cover-image"
                fit="cover"
                :ratio="1"
              />
              <div v-else class="cover-placeholder">
                <q-icon name="music_note" size="24px" color="white" />
              </div>
            </div>
            <!-- 中心播放指示器 -->
            <div class="center-dot"></div>
          </div>

          <!-- 音乐信息和进度 -->
          <div class="track-section">
            <div class="track-info">
              <div class="track-title">{{ currentTrack?.title || 'No track selected' }}</div>
              <div class="track-artist">{{ currentTrack?.artist || 'Unknown Artist' }}</div>
            </div>

            <!-- 进度条 -->
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${progressPercent * 100}%` }"></div>
              </div>
            </div>
          </div>

          <!-- 控制按钮 -->
          <div class="control-section">
            <q-btn
              round
              flat
              :icon="isPlaying ? 'pause' : 'play_arrow'"
              size="md"
              @click.stop="togglePlayPause"
              class="play-btn"
            />
            <q-btn
              round
              flat
              icon="skip_next"
              size="sm"
              @click.stop="nextTrack"
              class="control-btn"
            />
          </div>

          <!-- 音量控制 -->
          <div class="volume-section" @click.stop="handleVolumeClick" ref="volumeSectionRef">
            <q-btn
              round
              flat
              :icon="volumeIcon"
              size="sm"
              @click.stop="toggleMute"
              class="volume-btn"
            />
            <!-- 音量滑条弹出层 -->
            <transition name="volume-fade">
              <div v-if="showVolumeSlider" class="volume-slider-popup">
                <q-slider
                  v-model="localVolume"
                  :min="0"
                  :max="100"
                  color="primary"
                  track-color="rgba(255,255,255,0.2)"
                  thumb-color="primary"
                  @update:model-value="onVolumeChange"
                  class="volume-slider"
                  vertical
                  reverse
                />
              </div>
            </transition>
          </div>
        </div>

        <!-- OSU! 风格的装饰元素 -->
        <div class="osu-decorations">
          <div class="osu-circle" :class="{ pulsing: isPlaying }"></div>
          <div class="osu-triangle"></div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 收起状态下的监听区域 -->
  <div
    v-if="isCollapsed"
    class="collapsed-hover-area"
    @mouseenter="handleCollapsedAreaEnter"
    @mouseleave="handleCollapsedAreaLeave"
  ></div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMusicStore } from 'src/stores/musicStore';

const router = useRouter();
const route = useRoute();
const musicStore = useMusicStore();

// 收起状态相关
const isCollapsed = ref(false);
const showCollapseButton = ref(false);
const collapseButtonTimer = ref<NodeJS.Timeout | null>(null);

// 本地音量状态
const localVolume = ref(Math.round(musicStore.volume * 100));
const showVolumeSlider = ref(false);
const isMuted = ref(false);
const previousVolume = ref(50);
const volumeSectionRef = ref<HTMLElement | null>(null);

// 计算属性
const currentTrack = computed(() => musicStore.currentTrack);
const isPlaying = computed(() => musicStore.isPlaying);
const progressPercent = computed(() => {
  const current = musicStore.currentTime;
  const total = musicStore.duration;
  return total > 0 ? current / total : 0;
});

const volumeIcon = computed(() => {
  if (isMuted.value || localVolume.value === 0) return 'volume_off';
  if (localVolume.value < 30) return 'volume_down';
  return 'volume_up';
});

const shouldShowMiniPlayer = computed(() => {
  return currentTrack.value && route.name !== 'player';
});

const backgroundStyle = computed(() => {
  if (currentTrack.value?.coverUrl) {
    return {
      backgroundImage: `url(${currentTrack.value.coverUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: 'blur(20px) brightness(0.3)',
    };
  }
  return {};
});

// 鼠标事件处理
const handleMouseEnter = () => {
  if (collapseButtonTimer.value) {
    clearTimeout(collapseButtonTimer.value);
    collapseButtonTimer.value = null;
  }
  showCollapseButton.value = true;
};

const handleMouseLeave = () => {
  collapseButtonTimer.value = setTimeout(() => {
    showCollapseButton.value = false;
  }, 300);
};

const handleCollapsedAreaEnter = () => {
  if (collapseButtonTimer.value) {
    clearTimeout(collapseButtonTimer.value);
    collapseButtonTimer.value = null;
  }
  showCollapseButton.value = true;
};

const handleCollapsedAreaLeave = () => {
  collapseButtonTimer.value = setTimeout(() => {
    showCollapseButton.value = false;
  }, 300);
};

// 收起/展开功能
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// 点击内容跳转到播放页面
const handleContentClick = () => {
  if (currentTrack.value) {
    router.push({ name: 'player' });
  }
};

// 播放控制
const togglePlayPause = () => {
  if (isPlaying.value) {
    musicStore.pause();
  } else {
    musicStore.play();
  }
};

const nextTrack = () => {
  musicStore.nextTrack();
};

// 音量控制
const toggleMute = () => {
  if (isMuted.value) {
    // 取消静音，恢复之前的音量
    localVolume.value = previousVolume.value;
    musicStore.setVolume(previousVolume.value / 100);
    isMuted.value = false;
  } else {
    // 静音，保存当前音量
    previousVolume.value = localVolume.value;
    localVolume.value = 0;
    musicStore.setVolume(0);
    isMuted.value = true;
  }
};

const onVolumeChange = (value: number | null) => {
  if (value !== null) {
    localVolume.value = value;
    musicStore.setVolume(value / 100);
    isMuted.value = value === 0;
  }
};

// 监听音量变化
watch(
  () => musicStore.volume,
  (newVolume) => {
    if (!isMuted.value) {
      localVolume.value = Math.round(newVolume * 100);
    }
  },
);

// 点击外部关闭音量滑条
const handleClickOutside = (event: MouseEvent) => {
  if (volumeSectionRef.value && !volumeSectionRef.value.contains(event.target as Node)) {
    showVolumeSlider.value = false;
  }
};

// 点击音量区域切换滑条显示
const handleVolumeClick = () => {
  showVolumeSlider.value = !showVolumeSlider.value;
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  if (collapseButtonTimer.value) {
    clearTimeout(collapseButtonTimer.value);
  }
});
</script>

<style lang="scss" scoped>
.mini-player-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: calc(100% - 40px);
  max-width: 800px;
  pointer-events: none;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  // 移动端：使用新的 CSS 变量正确适配底部安全区域
  @media (max-width: 768px) {
    width: calc(100% - 20px); // 移动端减少左右边距
    bottom: calc(var(--safe-area-inset-bottom, 0px) + 20px); // 安全区域 + 基本间距
  }

  &.is-collapsed {
    // 简单的向下平移收起，保持原来的宽度
    transform: translateX(-50%) translateY(60px);
    opacity: 0.6;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

    // 悬停状态：向上显示更多内容
    &:hover {
      transform: translateX(-50%) translateY(30px);
      opacity: 0.9;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mini-player {
      // 保持原有的形状和尺寸，不进行圆形收缩
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

      .mini-player-content {
        // 内容保持布局，只调整透明度
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

        .track-section,
        .control-section,
        .volume-section {
          opacity: 0.2;
          transition: opacity 0.4s ease;
        }

        .rotating-cover-container {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      }

      .osu-decorations {
        opacity: 0.1;
        transition: opacity 0.4s ease;
      }
    }
  }

  // 正常展开状态的过渡
  &:not(.is-collapsed) {
    .mini-player {
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

      .mini-player-content {
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

        .track-section,
        .control-section,
        .volume-section {
          opacity: 1;
          transition: opacity 0.4s ease 0.2s; // 延迟出现，移除缩放动画
        }

        .rotating-cover-container {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      }

      .osu-decorations {
        opacity: 1;
        transition: opacity 0.4s ease 0.3s; // 装饰元素最后出现，移除缩放动画
      }
    }
  }
}

.collapse-btn-container {
  position: absolute;
  top: -45px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  pointer-events: all;
  opacity: 0;
  transition: all 0.4s ease; // 延长过渡时间

  &.visible {
    opacity: 1;
  }

  // 在收起状态下调整位置
  .mini-player-container.is-collapsed & {
    top: -35px; // 收起时按钮位置稍微下移
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); // 与容器过渡保持一致
  }
}

.collapse-btn {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
  }
}

.collapsed-hover-area {
  position: fixed;
  bottom: 0px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px; // 增大悬停区域宽度
  height: 100px; // 增加高度以覆盖更多隐藏部分
  z-index: 999;
  pointer-events: all;
  // 调试用边框，生产环境可以删除
  // border: 1px solid rgba(255, 0, 0, 0.3);
}

.mini-player {
  position: relative;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 25px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); // 添加基础过渡
  pointer-events: all;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); // 悬停响应更快
  }
}

.background-blur {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  filter: blur(40px) brightness(0.3);
  opacity: 0.6;
  z-index: -1;
}

.mini-player-content {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  gap: 16px;
  position: relative;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); // 添加内容过渡
}

.rotating-cover-container {
  position: relative;
  width: 50px;
  height: 50px;
  flex-shrink: 0;
}

.rotating-cover {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  transition: transform 0.3s ease;

  &.spinning {
    animation: rotate 8s linear infinite;
  }

  &:hover {
    transform: scale(1.05);
  }
}

.cover-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.center-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.track-section {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); // 添加过渡
}

.track-info {
  margin-bottom: 6px;
}

.track-title {
  color: white;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.track-artist {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.progress-bar-container {
  width: 100%;
}

.progress-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b, #ff8e53, #ff6b6b);
  background-size: 200% 100%;
  animation: gradient-shift 3s ease-in-out infinite;
  border-radius: 2px;
  transition: width 0.1s ease;
  box-shadow: 0 0 8px rgba(255, 107, 107, 0.4);
}

.control-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); // 添加过渡
}

.play-btn {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
  }
}

.control-btn {
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }
}

.volume-section {
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); // 添加过渡
}

.volume-btn {
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }
}

.volume-slider-popup {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 40, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  padding: 16px 10px 10px 10px;
  min-width: 36px;
  display: flex;
  align-items: center;
  transition: opacity 0.2s;
}

.volume-slider {
  height: 120px;
  width: 20px;
}

.volume-slider :deep(.q-slider__track) {
  width: 4px;
  background: rgba(255, 255, 255, 0.2);
}

.volume-slider :deep(.q-slider__thumb) {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--q-primary);
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.volume-slider :deep(.q-slider__selection) {
  background: var(--q-primary);
  width: 4px;
}

.volume-fade-enter-active,
.volume-fade-leave-active {
  transition: opacity 0.2s ease;
}

.volume-fade-enter-from,
.volume-fade-leave-to {
  opacity: 0;
}

.osu-decorations {
  position: absolute;
  top: 0;
  right: 0;
  width: 60px;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); // 添加过渡
}

.osu-circle {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 40px;
  height: 40px;
  border: 2px solid rgba(255, 107, 107, 0.3);
  border-radius: 50%;
  opacity: 0.6;

  &.pulsing {
    animation: osu-pulse 2s ease-in-out infinite;
  }
}

.osu-triangle {
  position: absolute;
  bottom: 5px;
  right: 15px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 12px solid rgba(255, 142, 83, 0.4);
  opacity: 0.7;
  transform: rotate(45deg);
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes osu-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.3;
  }
}

.mini-player-slide-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); // 弹性进入效果
}

.mini-player-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.6, 0, 0.8, 1); // 平滑退出效果
}

.mini-player-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(120px) scale(0.8);
}

.mini-player-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(150px) scale(0.7);
}

@media (max-width: 768px) {
  .mini-player-container {
    bottom: 15px;
    width: calc(100% - 20px);

    &.is-collapsed {
      // 移动端的收起状态：更多向下隐藏
      transform: translateX(-50%) translateY(45px);
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateX(-50%) translateY(15px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
    }
  }

  .mini-player-content {
    padding: 10px 16px;
    gap: 12px;
  }

  .rotating-cover-container {
    width: 45px;
    height: 45px;
  }

  .track-title {
    font-size: 14px;
  }

  .track-artist {
    font-size: 12px;
  }

  .control-section {
    gap: 6px;
  }

  .osu-decorations {
    width: 50px;
  }

  .collapsed-hover-area {
    bottom: 0px;
    height: 90px; // 移动端增加悬停区域高度
    width: 110px;
  }
}
</style>
