<template>
  <div class="play-queue-container" v-show="isVisible" :class="{ 'queue-open': isOpen }">
    <!-- 队列头部 -->
    <div class="queue-header">
      <div class="header-content">
        <h6 class="queue-title">
          <q-icon name="queue_music" class="q-mr-sm" />
          播放队列
        </h6>
        <div class="queue-stats">{{ queue.length }} 首歌曲</div>
      </div>
    </div>

    <!-- 队列内容 -->
    <div class="queue-content">
      <div v-if="queue.length === 0" class="empty-queue">
        <q-icon name="queue_music" size="3rem" color="grey-5" />
        <p class="text-grey-6 q-mt-md">暂无播放队列</p>
        <p class="text-caption text-grey-7">添加歌曲到队列开始播放</p>
      </div>

      <div v-else class="queue-list">
        <div class="current-playing" v-if="currentTrack">
          <div class="section-title">正在播放</div>
          <div class="track-item current" @click="$emit('playTrack', currentTrack)">
            <div class="track-cover">
              <img :src="getTrackCover(currentTrack)" :alt="currentTrack.title" />
              <div class="play-indicator">
                <q-icon name="volume_up" />
              </div>
            </div>
            <div class="track-info">
              <div class="track-title">{{ currentTrack.title }}</div>
              <div class="track-artist">{{ currentTrack.artist || 'Unknown Artist' }}</div>
            </div>
            <div class="track-duration">{{ formatDuration(currentTrack.duration) }}</div>
          </div>
        </div>

        <div class="next-up" v-if="upNext.length > 0">
          <div class="section-title">
            接下来播放
            <q-btn
              flat
              dense
              size="sm"
              icon="clear_all"
              @click="$emit('clearQueue')"
              class="clear-btn"
            >
              清空
            </q-btn>
          </div>
          <div
            v-for="(track, index) in upNext"
            :key="`next-${index}`"
            class="track-item"
            @click="$emit('playTrack', track)"
          >
            <div class="track-index">{{ index + 1 }}</div>
            <div class="track-cover">
              <img :src="getTrackCover(track)" :alt="track.title" />
            </div>
            <div class="track-info">
              <div class="track-title">{{ track.title }}</div>
              <div class="track-artist">{{ track.artist || 'Unknown Artist' }}</div>
            </div>
            <div class="track-actions">
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="remove"
                @click.stop="
                  $emit('removeFromQueue', index + (currentIndex !== -1 ? currentIndex + 1 : 0))
                "
                class="remove-btn"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

// 定义简单的轨道类型
interface Track {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  coverUrl?: string;
  beatmapsetId?: number;
}

// Props
const props = defineProps<{
  visible: boolean;
  queue: Track[];
  currentTrack?: Track | null;
}>();

// Emits
defineEmits<{
  playTrack: [track: Track];
  removeFromQueue: [index: number];
  clearQueue: [];
}>();

// 响应式状态
const isVisible = ref(props.visible);
const isOpen = ref(false);

// 当前播放索引（在整个队列中的位置）
const currentIndex = computed(() => {
  if (!props.currentTrack) return -1;
  return props.queue.findIndex((track) => track.id === props.currentTrack?.id);
});

// 计算属性
const upNext = computed(() => {
  if (!props.currentTrack || props.queue.length === 0) {
    return props.queue;
  }
  if (currentIndex.value === -1) return props.queue;
  return props.queue.slice(currentIndex.value + 1);
});

// 监听 visible 变化
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      isVisible.value = true;
      setTimeout(() => {
        isOpen.value = true;
      }, 50);
    } else {
      isOpen.value = false;
      setTimeout(() => {
        isVisible.value = false;
      }, 300);
    }
  },
);

// 方法
const getTrackCover = (track: Track): string => {
  if (track.coverUrl) {
    return track.coverUrl;
  }

  if (track.beatmapsetId) {
    return `https://assets.ppy.sh/beatmaps/${track.beatmapsetId}/covers/list.jpg`;
  }

  return 'https://osu.ppy.sh/images/layout/beatmaps/default-bg.png';
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style lang="scss" scoped>
.play-queue-container {
  position: fixed;
  top: 80px; // 增加顶部距离，避免被应用栏覆盖
  right: 20px;
  bottom: 80px;
  width: 380px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.3),
    0 8px 24px rgba(0, 0, 0, 0.2);
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;

  &.queue-open {
    transform: translateX(0);
  }

  @media (max-width: 768px) {
    width: 350px;
    right: 10px;
    top: 10px;
    bottom: 70px;
  }

  @media (max-width: 480px) {
    width: calc(100vw - 20px);
    right: 10px;
    left: 10px;
    top: 10px;
    bottom: 70px;
  }
}

.queue-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 20px 20px 0 0;

  .header-content {
    flex: 1;

    .queue-title {
      color: #c4c9d4;
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0 0 0.25rem 0;
      display: flex;
      align-items: center;

      .q-icon {
        color: #8b92b8;
      }
    }

    .queue-stats {
      color: #8b92b8;
      font-size: 0.8rem;
      font-weight: 500;
    }
  }
}

.queue-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 146, 184, 0.3);
    border-radius: 3px;

    &:hover {
      background: rgba(139, 146, 184, 0.5);
    }
  }
}

.empty-queue {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  height: 300px;
}

.section-title {
  color: #c4c9d4;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .clear-btn {
    color: #8b92b8;
    font-size: 0.75rem;

    &:hover {
      color: #c4c9d4;
      background: rgba(196, 201, 212, 0.1);
    }
  }
}

.current-playing {
  margin-bottom: 1.5rem;
}

.track-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(4px);
  }

  &.current {
    background: rgba(139, 146, 184, 0.15);
    border: 1px solid rgba(139, 146, 184, 0.3);

    .track-title {
      color: #c4c9d4;
      font-weight: 600;
    }

    .play-indicator {
      color: #8b92b8;
      animation: pulse 2s infinite;
    }
  }

  .track-index {
    color: #8b92b8;
    font-size: 0.8rem;
    font-weight: 500;
    min-width: 1.5rem;
    text-align: center;
  }

  .track-cover {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .play-indicator {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
  }

  .track-info {
    flex: 1;
    min-width: 0;

    .track-title {
      color: #c4c9d4;
      font-size: 0.85rem;
      font-weight: 500;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 0.25rem;
    }

    .track-artist {
      color: #8b92b8;
      font-size: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .track-duration {
    color: #8b92b8;
    font-size: 0.75rem;
    font-family: 'JetBrains Mono', monospace;
  }

  .track-actions {
    .remove-btn {
      color: #8b92b8;
      opacity: 0;
      transition: all 0.2s ease;

      &:hover {
        color: #ff7675;
        background: rgba(255, 118, 117, 0.1);
      }
    }
  }

  &:hover .track-actions .remove-btn {
    opacity: 1;
  }
}

.empty-queue {
  p {
    color: #8b92b8;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

// 响应式设计
@media (max-width: 480px) {
  .queue-header {
    padding: 1rem;
  }

  .queue-content {
    padding: 0.75rem;
  }

  .track-item {
    padding: 0.5rem;
    gap: 0.5rem;

    .track-cover {
      width: 35px;
      height: 35px;
    }

    .track-info {
      .track-title {
        font-size: 0.8rem;
      }

      .track-artist {
        font-size: 0.7rem;
      }
    }
  }
}
</style>
