<template>
  <q-page class="player-page" :style="pageBackgroundStyle">
    <!-- 动态背景层 -->
    <div class="dynamic-background" :style="backgroundStyle"></div>

    <div class="player-container">
      <!-- 当前播放的音乐信息 -->
      <div class="now-playing-section">
        <div class="album-art-container">
          <div class="album-art-wrapper">
            <!-- 主要专辑封面 -->
            <div class="album-art-main" :class="{ spinning: isPlaying }">
              <q-img
                v-if="currentTrack?.coverUrl"
                :src="currentTrack.coverUrl"
                class="album-image"
                fit="cover"
                :ratio="1"
              />
              <div v-else class="album-placeholder">
                <q-icon name="music_note" size="6rem" color="white" />
              </div>
              <!-- 反光效果 -->
              <div class="album-reflection"></div>
            </div>

            <!-- 背景模糊层 -->
            <div class="album-background-blur" :style="backgroundStyle"></div>

            <!-- OSU! 风格装饰 -->
            <div class="osu-decorations">
              <div class="osu-ring" :class="{ pulsing: isPlaying }"></div>
              <div class="osu-particles">
                <div
                  class="particle"
                  v-for="i in 6"
                  :key="i"
                  :style="{ '--delay': i * 0.2 + 's' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="track-info">
          <div class="track-details">
            <h4 class="track-title">
              {{ currentTrack?.title || 'No track selected' }}
            </h4>
            <p class="track-artist">
              {{ currentTrack?.artist || 'Select a track to start playing' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 播放控制 -->
      <div class="player-controls">
        <div class="progress-section">
          <span class="time-current">{{ formatTime(currentTime) }}</span>
          <q-slider
            v-model="currentTime"
            :max="duration"
            color="primary"
            track-color="grey-7"
            class="progress-slider"
            @change="onSeek"
          />
          <span class="time-total">{{ formatTime(duration) }}</span>
        </div>

        <div class="control-buttons">
          <q-btn
            round
            flat
            icon="skip_previous"
            size="lg"
            @click="previousTrack"
            :disable="!hasPrevious"
          />

          <q-btn
            round
            unelevated
            :icon="isPlaying ? 'pause' : 'play_arrow'"
            color="primary"
            size="xl"
            @click="togglePlayPause"
            class="play-pause-btn"
          />

          <q-btn round flat icon="skip_next" size="lg" @click="nextTrack" :disable="!hasNext" />
        </div>

        <div class="additional-controls">
          <q-btn
            round
            flat
            :icon="shuffleMode ? 'shuffle' : 'shuffle'"
            :color="shuffleMode ? 'primary' : 'grey-6'"
            @click="toggleShuffle"
          />

          <!-- 音量控制 -->
          <div class="volume-control-inline">
            <q-btn
              round
              flat
              :icon="volumeIcon"
              @click="toggleMute"
              :color="isMuted ? 'grey-6' : 'white'"
            />
            <q-slider
              v-model="localVolume"
              :min="0"
              :max="100"
              color="primary"
              track-color="grey-7"
              @update:model-value="onVolumeChange"
              class="volume-slider-inline"
            />
          </div>

          <q-btn
            round
            flat
            :icon="getRepeatIcon()"
            :color="repeatMode !== 'off' ? 'primary' : 'grey-6'"
            @click="toggleRepeat"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useMusicStore } from 'src/stores/musicStore';

const musicStore = useMusicStore();

// 保存原始的 overflow 样式
let originalBodyOverflow = '';
let originalHtmlOverflow = '';

// 组件挂载时禁用全局滚动
onMounted(() => {
  // 保存原始样式
  originalBodyOverflow = document.body.style.overflow;
  originalHtmlOverflow = document.documentElement.style.overflow;

  // 禁用滚动
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
});

// 组件卸载时恢复全局滚动
onUnmounted(() => {
  // 恢复原始样式
  document.body.style.overflow = originalBodyOverflow;
  document.documentElement.style.overflow = originalHtmlOverflow;
});

// 本地状态
const localVolume = ref(Math.round(musicStore.volume * 100));
const isMuted = ref(false);
const previousVolume = ref(50); // 静音前的音量

// 计算属性 - 从 store 获取状态
const currentTrack = computed(() => musicStore.currentTrack);
const isPlaying = computed(() => musicStore.isPlaying);
const shuffleMode = computed(() => musicStore.shuffleMode);
const repeatMode = computed(() => musicStore.repeatMode);
const currentTime = computed(() => musicStore.currentTime);
const duration = computed(() => musicStore.duration);
const hasPrevious = computed(
  () => musicStore.playQueue.length > 0 && musicStore.currentQueueIndex > 0,
);
const hasNext = computed(
  () =>
    musicStore.playQueue.length > 0 &&
    (musicStore.currentQueueIndex < musicStore.playQueue.length - 1 ||
      musicStore.repeatMode === 'all'),
);

// 音量图标计算
const volumeIcon = computed(() => {
  if (isMuted.value || localVolume.value === 0) {
    return 'volume_off';
  } else if (localVolume.value < 50) {
    return 'volume_down';
  } else {
    return 'volume_up';
  }
});

// 背景样式计算
const backgroundStyle = computed(() => {
  if (currentTrack.value?.coverUrl) {
    return {
      backgroundImage: `url(${currentTrack.value.coverUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: 'blur(60px) brightness(0.3)',
    };
  }
  return {};
});

// 页面背景样式（默认背景）
const pageBackgroundStyle = computed(() => {
  if (!currentTrack.value?.coverUrl) {
    return {
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d47 50%, #1e1e2e 100%)',
    };
  }
  return {};
});

// 监听 store 中的音量变化，同步到本地状态
watch(
  () => musicStore.volume,
  (newVolume) => {
    localVolume.value = Math.round(newVolume * 100);
    isMuted.value = newVolume === 0;
  },
);

// 方法
const togglePlayPause = () => {
  if (isPlaying.value) {
    musicStore.pause();
  } else {
    musicStore.play();
  }
};

const previousTrack = () => {
  musicStore.previousTrack();
};

const nextTrack = () => {
  musicStore.nextTrack();
};

const toggleShuffle = () => {
  musicStore.toggleShuffle();
};

const toggleRepeat = () => {
  musicStore.toggleRepeat();
};

const onSeek = (value: number) => {
  musicStore.seekTo(value);
};

const onVolumeChange = (value: number | null) => {
  if (value !== null) {
    musicStore.setVolume(value / 100);
    if (value > 0) {
      isMuted.value = false;
    }
  }
};

const toggleMute = () => {
  if (isMuted.value || localVolume.value === 0) {
    // 取消静音，恢复之前的音量
    isMuted.value = false;
    musicStore.setVolume(previousVolume.value / 100);
  } else {
    // 静音，记忆当前音量
    previousVolume.value = localVolume.value > 0 ? localVolume.value : 50;
    isMuted.value = true;
    musicStore.setVolume(0);
  }
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getRepeatIcon = (): string => {
  switch (repeatMode.value) {
    case 'one':
      return 'repeat_one';
    case 'all':
      return 'repeat';
    default:
      return 'repeat';
  }
};
</script>

<style lang="scss" scoped>
// 覆盖主布局的 padding-bottom，因为 PlayerPage 是全屏的
:global(.q-page-container.page-container-bg) {
  padding-bottom: 0 !important;
}

.player-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  max-height: 100vh;
  width: 100vw;
  max-width: 100vw;
  background: linear-gradient(135deg, #0c0c0c, #1a1a1a, #2a2a2a);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 10;

  // 移动端：完全延伸到屏幕边缘，忽略安全区域
  @media (max-width: 768px) {
    height: 100vh !important;
    height: 100dvh !important; // 动态视口高度
    width: 100vw !important;
    margin: 0 !important;
    padding: 0 !important;
    // 明确忽略安全区域
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    // 确保完全覆盖
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
  }

  &::before {
    content: '';
    position: absolute;
    top: -100px;
    left: -100px;
    right: -100px;
    bottom: -100px;
    background:
      radial-gradient(circle at 30% 70%, rgba(255, 107, 107, 0.1), transparent 50%),
      radial-gradient(circle at 70% 30%, rgba(255, 142, 83, 0.1), transparent 50%);
    pointer-events: none;
  }
}

// 动态背景层
.dynamic-background {
  position: fixed;
  top: -50px;
  left: -50px;
  right: -50px;
  bottom: -50px;
  width: calc(100vw + 100px);
  height: calc(100vh + 100px);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: blur(60px) brightness(0.3);
  opacity: 0.7;
  z-index: 0;
  transition: all 0.5s ease;
  transform: scale(1.1);

  // 移动端：确保背景完全覆盖，包括安全区域
  @media (max-width: 768px) {
    top: -100px !important;
    left: -100px !important;
    right: -100px !important;
    bottom: -100px !important;
    width: calc(100vw + 200px) !important;
    height: calc(100vh + 200px) !important;
    height: calc(100dvh + 200px) !important; // 动态视口高度
    transform: scale(1.2) !important; // 更大的缩放确保完全覆盖
  }
}

.player-container {
  max-width: 700px;
  width: 100%;
  height: 100vh;
  max-height: 100vh;
  padding: 1rem 2rem;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden; // 确保容器内容不滚动
  box-sizing: border-box; // 确保 padding 不会造成溢出
}

.now-playing-section {
  text-align: center;
  margin-bottom: 1.5rem; // 减少底部间距
  flex-shrink: 0; // 防止压缩
}

.album-art-container {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 2.5rem; // 增大专辑封面和歌名之间的距离
}

.album-art-wrapper {
  position: relative;
  width: 260px; // 减小专辑封面尺寸
  height: 260px;
}

.album-art-main {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.spinning {
    animation: gentle-rotate 20s linear infinite;
  }

  &:hover {
    transform: scale(1.02) translateY(-4px);
  }
}

.album-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 8px 25px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(1px);
}

.album-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(255, 107, 107, 0.8),
    rgba(255, 142, 83, 0.8),
    rgba(123, 104, 238, 0.8)
  );
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 8px 25px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(1px);
}

.album-reflection {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 70%
  );
  pointer-events: none;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.album-art-main:hover .album-reflection {
  opacity: 1;
}

.album-background-blur {
  position: absolute;
  top: -40px; // 进一步扩展模糊背景
  left: -40px;
  right: -40px;
  bottom: -40px;
  background-size: cover;
  background-position: center;
  filter: blur(60px) brightness(0.3) saturate(1.5);
  border-radius: 50%;
  z-index: -1;
  opacity: 0.6;
  transform: scale(1.2); // 额外缩放确保覆盖
}

.osu-decorations {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px; // 对应减小装饰圈的尺寸
  height: 300px;
  pointer-events: none;
  z-index: -1;
}

.osu-ring {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid rgba(255, 107, 107, 0.3);
  border-radius: 50%;

  &.pulsing {
    animation: osu-ring-pulse 3s ease-in-out infinite;
  }
}

.osu-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(255, 142, 83, 0.6);
  border-radius: 50%;
  animation: particle-float 4s ease-in-out infinite;
  animation-delay: var(--delay);

  &:nth-child(1) {
    top: 10%;
    left: 50%;
  }
  &:nth-child(2) {
    top: 20%;
    right: 20%;
  }
  &:nth-child(3) {
    top: 50%;
    right: 10%;
  }
  &:nth-child(4) {
    bottom: 20%;
    right: 20%;
  }
  &:nth-child(5) {
    bottom: 10%;
    left: 50%;
  }
  &:nth-child(6) {
    top: 50%;
    left: 10%;
  }
}

.track-info {
  .track-details {
    .track-title {
      font-size: 1.8rem; // 稍微减小字体大小
      font-weight: 700;
      color: white;
      margin: 0 0 0.3rem 0; // 减少底部间距
      line-height: 1.2;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      background: linear-gradient(135deg, #ffffff, #f0f0f0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .track-artist {
      font-size: 1.1rem; // 稍微减小字体大小
      color: rgba(255, 255, 255, 0.85);
      margin: 0 0 0.5rem 0; // 减小歌手和控制组件之间的距离
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }
  }
}

.audio-visualizer {
  display: flex;
  justify-content: center;
  gap: 3px;
  margin-top: 0.5rem; // 减少顶部间距
}

.visualizer-bar {
  width: 3px;
  height: 4px;
  background: rgba(255, 107, 107, 0.4);
  border-radius: 2px;
  transition: all 0.3s ease;

  &.active {
    animation: visualizer-bounce 1.5s ease-in-out infinite;
    animation-delay: var(--delay);
    background: linear-gradient(to top, #ff6b6b, #ff8e53);
  }
}

.player-controls {
  flex-shrink: 0; // 防止压缩

  .progress-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem; // 减少底部间距
    background: rgba(255, 255, 255, 0.05);
    padding: 0.8rem 1.2rem; // 稍微减少padding
    border-radius: 16px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);

    .time-current,
    .time-total {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      font-weight: 500;
      min-width: 45px;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .progress-slider {
      flex: 1;
    }
  }

  .control-buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem; // 稍微减少按钮间距
    margin-bottom: 1.5rem; // 减少底部间距

    .q-btn {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
      }
    }

    .play-pause-btn {
      width: 60px; // 稍微减小播放按钮尺寸
      height: 60px;
      background: linear-gradient(135deg, #ff6b6b, #ff8e53);
      box-shadow:
        0 8px 30px rgba(255, 107, 107, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);

      &:hover {
        transform: scale(1.08) translateY(-3px);
        box-shadow:
          0 12px 40px rgba(255, 107, 107, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }
    }
  }

  .additional-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem; // 稍微减少控制按钮间距
    margin-bottom: 0; // 移除底部间距

    .q-btn {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: scale(1.05);
      }
    }
  }

  .volume-control-inline {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 25px;
    padding: 0.4rem 0.8rem; // 稍微减少padding
    min-width: 120px; // 稍微减少最小宽度
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
    }

    .volume-slider-inline {
      flex: 1;
      min-width: 80px; // 稍微减少最小宽度
    }
  }
}

// 动画定义
@keyframes gentle-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes osu-ring-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.6;
  }
}

@keyframes particle-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-10px) scale(1.2);
    opacity: 1;
  }
}

@keyframes visualizer-bounce {
  0%,
  100% {
    height: 4px;
    opacity: 0.4;
  }
  50% {
    height: 16px;
    opacity: 1;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .player-container {
    padding: 1rem;
  }

  .album-art-wrapper {
    width: 220px; // 进一步减小移动端尺寸
    height: 220px;
  }

  .osu-decorations {
    width: 260px;
    height: 260px;
  }

  .track-info {
    .track-details {
      .track-title {
        font-size: 1.5rem;
      }

      .track-artist {
        font-size: 1rem;
      }
    }
  }

  .player-controls {
    .control-buttons {
      gap: 1.2rem;

      .play-pause-btn {
        width: 56px;
        height: 56px;
      }
    }

    .additional-controls {
      gap: 0.8rem;
    }

    .volume-control-inline {
      min-width: 100px;
      padding: 0.3rem 0.6rem;
    }
  }
}

@media (max-width: 480px) {
  .player-container {
    padding: 0.5rem;
  }

  .album-art-wrapper {
    width: 180px; // 小屏幕进一步减小
    height: 180px;
  }

  .osu-decorations {
    width: 220px;
    height: 220px;
  }

  .track-info {
    .track-details {
      .track-title {
        font-size: 1.3rem;
      }

      .track-artist {
        font-size: 0.9rem;
      }
    }
  }

  .player-controls {
    .progress-section {
      padding: 0.6rem 0.8rem;
      margin-bottom: 1rem;
    }

    .control-buttons {
      gap: 1rem;
      margin-bottom: 1rem;

      .play-pause-btn {
        width: 52px;
        height: 52px;
      }
    }

    .additional-controls {
      gap: 0.5rem;
    }

    .volume-control-inline {
      min-width: 90px;
      padding: 0.25rem 0.5rem;

      .volume-slider-inline {
        min-width: 60px;
      }
    }
  }
}

// 增加超小屏幕的支持
@media (max-width: 360px) {
  .album-art-wrapper {
    width: 160px;
    height: 160px;
  }

  .osu-decorations {
    width: 200px;
    height: 200px;
  }

  .track-info {
    .track-details {
      .track-title {
        font-size: 1.1rem;
      }

      .track-artist {
        font-size: 0.85rem;
      }
    }
  }
}

// 针对低高度屏幕的优化
@media (max-height: 700px) {
  .album-art-wrapper {
    width: 200px;
    height: 200px;
  }

  .osu-decorations {
    width: 240px;
    height: 240px;
  }

  .now-playing-section {
    margin-bottom: 1rem;
  }

  .album-art-container {
    margin-bottom: 1rem;
  }

  .track-info {
    .track-details {
      .track-title {
        font-size: 1.4rem;
        margin-bottom: 0.2rem;
      }

      .track-artist {
        font-size: 1rem;
        margin-bottom: 0.5rem;
      }
    }
  }

  .audio-visualizer {
    margin-top: 0.3rem;
  }

  .player-controls {
    .progress-section {
      margin-bottom: 1rem;
      padding: 0.6rem 1rem;
    }

    .control-buttons {
      margin-bottom: 1rem;

      .play-pause-btn {
        width: 56px;
        height: 56px;
      }
    }
  }
}

// 针对极低高度屏幕的优化（如横屏手机）
@media (max-height: 500px) {
  .player-container {
    padding: 0.5rem 1rem;
    justify-content: center; // 保持居中，移除滚动
    overflow: hidden; // 确保不滚动
    height: 100vh;
    max-height: 100vh;
  }

  .album-art-wrapper {
    width: 140px;
    height: 140px;
  }

  .osu-decorations {
    width: 180px;
    height: 180px;
  }

  .now-playing-section {
    margin-bottom: 0.5rem;
  }

  .album-art-container {
    margin-bottom: 0.5rem;
  }

  .track-info {
    .track-details {
      .track-title {
        font-size: 1.2rem;
        margin-bottom: 0.1rem;
      }

      .track-artist {
        font-size: 0.9rem;
        margin-bottom: 0.3rem;
      }
    }
  }

  .audio-visualizer {
    margin-top: 0.2rem;
  }

  .player-controls {
    .progress-section {
      margin-bottom: 0.5rem;
      padding: 0.5rem 0.8rem;
    }

    .control-buttons {
      margin-bottom: 0.5rem;
      gap: 1rem;

      .play-pause-btn {
        width: 48px;
        height: 48px;
      }
    }

    .additional-controls {
      gap: 0.5rem;
    }

    .volume-control-inline {
      min-width: 80px;
      padding: 0.2rem 0.4rem;
    }
  }
}
</style>
