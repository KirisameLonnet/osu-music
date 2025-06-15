<template>
  <q-card class="music-card" bordered flat @click="handleCardClick">
    <div class="card-content">
      <!-- 封面图片 -->
      <div class="cover-section">
        <div class="cover-image-container">
          <img
            :src="smartCoverUrl"
            :alt="track.title"
            class="cover-image"
            @error="onImageError"
            draggable="false"
          />
          <div class="play-overlay">
            <q-btn
              round
              color="primary"
              icon="play_arrow"
              size="md"
              @click.stop="$emit('play', track)"
              class="play-button"
            />
          </div>
        </div>
      </div>

      <!-- 音乐信息 -->
      <div class="info-section">
        <div class="track-info">
          <h6 class="track-title text-weight-medium q-mb-xs">
            {{ track.title }}
          </h6>
          <p class="track-artist text-caption text-grey-6 q-mb-xs">
            {{ track.artist || 'Unknown Artist' }}
          </p>
        </div>

        <!-- 底部信息 -->
        <div class="track-meta row items-center justify-between q-mt-sm">
          <div class="duration text-caption text-grey-6">
            {{ formatDuration(track.duration) }}
          </div>
          <div class="actions row items-center">
            <!-- 快速收藏按钮 -->
            <q-btn
              flat
              round
              size="sm"
              :icon="isInFavorites ? 'favorite' : 'favorite_border'"
              :color="isInFavorites ? 'pink' : 'grey-6'"
              @click.stop="toggleFavorite"
              :loading="isAddingToFavorites"
              class="q-mr-xs"
            >
              <q-tooltip>{{
                isInFavorites ? 'Remove from Favorites' : 'Add to Favorites'
              }}</q-tooltip>
            </q-btn>

            <!-- 快速添加到播放列表按钮 -->
            <q-btn
              flat
              round
              size="sm"
              icon="playlist_add"
              color="grey-6"
              @click.stop="openAddToPlaylistDialog"
              class="q-mr-xs"
            >
              <q-tooltip>Add to Playlist</q-tooltip>
            </q-btn>

            <!-- 加入播放队列按钮 -->
            <q-btn
              flat
              round
              size="sm"
              icon="queue"
              color="grey-6"
              @click.stop="handleAddToQueue"
              class="q-mr-xs"
            >
              <q-tooltip>Add to Queue</q-tooltip>
            </q-btn>

            <!-- 删除按钮 -->
            <q-btn
              flat
              round
              size="sm"
              icon="delete"
              color="grey-6"
              @click.stop="handleDeleteTrack"
              :loading="isDeletingTrack"
            >
              <q-tooltip>Delete Track</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { type MusicTrack } from 'src/stores/musicStore';
import { usePlaylistStore, type PlaylistTrack } from 'src/stores/playlistStore';
import AddToPlaylistDialog from './AddToPlaylistDialog.vue';

// Props
const props = defineProps<{
  track: MusicTrack;
}>();

// Events
const emit = defineEmits<{
  play: [track: MusicTrack];
  addToQueue: [track: MusicTrack];
  playNext: [track: MusicTrack];
  delete: [track: MusicTrack];
}>();

// Composables
const $q = useQuasar();
const playlistStore = usePlaylistStore();

// State
const isAddingToFavorites = ref(false);
const isDeletingTrack = ref(false);

// 使用 osu! ppy 的默认封面
const defaultCover = 'https://osu.ppy.sh/images/layout/beatmaps/default-bg.png';

// 智能封面 URL 生成
const smartCoverUrl = computed(() => {
  // 如果有 coverUrl，直接使用
  if (props.track.coverUrl) {
    return props.track.coverUrl;
  }

  // 尝试从 beatmapset ID 生成封面 URL
  if (props.track.id && props.track.id !== 'unknown') {
    return `https://assets.ppy.sh/beatmaps/${props.track.id}/covers/card.jpg`;
  }

  // 使用默认封面
  return defaultCover;
});

// 检查是否在收藏夹中
const isInFavorites = computed(() => {
  const favPlaylist = playlistStore.defaultPlaylist;
  if (!favPlaylist) return false;
  return favPlaylist.tracks.some((t) => t.beatmapsetId === Number(props.track.id));
});

const coverSrc = ref(smartCoverUrl.value);

const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  const currentSrc = img.src;

  // 如果当前不是默认封面且还没尝试过其他尺寸
  if (currentSrc !== defaultCover && props.track.id && props.track.id !== 'unknown') {
    // 尝试其他封面尺寸
    if (currentSrc.includes('/card.jpg')) {
      // 尝试 list 尺寸
      const listUrl = `https://assets.ppy.sh/beatmaps/${props.track.id}/covers/list.jpg`;
      img.src = listUrl;
      coverSrc.value = listUrl;
      return;
    } else if (currentSrc.includes('/list.jpg')) {
      // 尝试 cover 尺寸
      const coverUrl = `https://assets.ppy.sh/beatmaps/${props.track.id}/covers/cover.jpg`;
      img.src = coverUrl;
      coverSrc.value = coverUrl;
      return;
    }
  }

  // 最后使用默认封面
  if (currentSrc !== defaultCover) {
    img.src = defaultCover;
    coverSrc.value = defaultCover;
  }
};

// 转换为播放列表歌曲格式
const convertToPlaylistTrack = (track: MusicTrack): Omit<PlaylistTrack, 'addedAt'> => {
  return {
    beatmapsetId: Number(track.id) || 0,
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    duration: track.duration || 0,
    bpm: 120, // 默认 BPM，因为 MusicTrack 中没有这个字段
  };
};

// 切换收藏状态
const toggleFavorite = async () => {
  const favPlaylist = playlistStore.defaultPlaylist;
  if (!favPlaylist) {
    $q.notify({
      type: 'negative',
      message: 'Favorites playlist not found',
      position: 'top',
    });
    return;
  }

  isAddingToFavorites.value = true;
  try {
    if (isInFavorites.value) {
      // 从收藏夹移除
      await playlistStore.removeTrackFromPlaylist(favPlaylist.id, Number(props.track.id));
      $q.notify({
        type: 'info',
        message: 'Removed from Favorites',
        position: 'top',
      });
    } else {
      // 添加到收藏夹
      const playlistTrack = convertToPlaylistTrack(props.track);
      await playlistStore.addTrackToPlaylist(favPlaylist.id, playlistTrack);
      $q.notify({
        type: 'positive',
        message: 'Added to Favorites!',
        position: 'top',
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to update favorites',
      position: 'top',
    });
  } finally {
    isAddingToFavorites.value = false;
  }
};

// 打开添加到播放列表对话框
const openAddToPlaylistDialog = () => {
  $q.dialog({
    component: AddToPlaylistDialog,
    componentProps: {
      track: props.track,
    },
  });
};

// 格式化时长
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 处理卡片点击 - 插入下一首播放
const handleCardClick = () => {
  emit('playNext', props.track);
};

// 加入播放队列末尾
const handleAddToQueue = () => {
  emit('addToQueue', props.track);
};

// 删除歌曲处理函数
const handleDeleteTrack = async () => {
  $q.dialog({
    title: 'Delete Track',
    message: `Are you sure you want to delete "${props.track.title}"? This action cannot be undone.`,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    emit('delete', props.track);
  });
};
</script>

<style lang="scss" scoped>
.music-card {
  background: #2a2a2e; // 更深的灰色背景，与搜索组件一致
  backdrop-filter: blur(10px);
  border: 1px solid rgba(196, 201, 212, 0.15); // 使用主文字颜色的透明边框
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  height: 300px; // 增加高度确保按钮有足够空间
  min-height: 260px; // 确保最小高度，防止内容被挤压

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    background: #35353a; // 悬停时稍微亮一点的深灰色
    border-color: rgba(255, 105, 180, 0.4); // 悬停时边框高亮

    .play-overlay {
      opacity: 1;
    }
  }

  .card-content {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .cover-section {
    position: relative;
    width: 100%;
    height: 170px; // 稍微减少封面高度，为信息区域留出更多空间
    overflow: hidden;

    .cover-image-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: block; // Ensure block display
      overflow: hidden; // Add overflow hidden here as well

      .cover-image {
        display: block; // Ensure block display for the image itself
        width: 100%;
        height: 100%;
        object-fit: cover; // 保证图片完全填充且不留空白
        object-position: center;
        background: #222; // 防止图片加载失败时有空白
        transition: transform 0.3s ease;
        user-select: none;
      }

      .play-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity 0.3s ease;

        .play-button {
          transform: scale(1);
          transition: transform 0.2s ease;

          &:hover {
            transform: scale(1.1);
          }
        }
      }
    }
  }

  .info-section {
    flex: 1;
    padding: 12px 12px 16px 12px; // 增加底部内边距确保按钮有足够空间
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 120px; // 确保信息区域有足够高度

    .track-info {
      .track-title {
        color: #ffffff; // 与 PlaylistPage 一致的主文字颜色
        font-size: 14px;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        margin-bottom: 4px;
      }

      .track-artist {
        color: #8b92b8; // 与 PlaylistPage 一致的次要文字颜色
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-bottom: 2px;
      }
    }

    .track-meta {
      margin-top: 8px;
      min-height: 32px; // 确保按钮区域有足够高度
      display: flex;
      align-items: center;
      justify-content: space-between;

      .actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0; // 防止按钮被压缩
        min-width: 140px; // 确保按钮区域有最小宽度

        .q-btn {
          z-index: 10; // 确保按钮在上层
          position: relative; // 确保 z-index 生效
          flex-shrink: 0; // 防止单个按钮被压缩

          // 基础尺寸，确保在所有情况下都可见
          min-width: 32px;
          min-height: 32px;

          // 强制显示，防止被其他样式隐藏
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
      }

      .duration {
        color: #8b92b8; // 与 PlaylistPage 一致的次要文字颜色
        font-family: 'JetBrains Mono', monospace;
        flex-shrink: 0; // 防止时长文本被压缩
        white-space: nowrap; // 防止换行
      }
    }
  }
}

// 菜单样式
.track-menu {
  z-index: 9999; // 确保菜单在最顶层

  .q-list {
    background: rgba(40, 40, 50, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 4px 0;
  }

  .q-item {
    color: #ffffff;
    border-radius: 6px;
    margin: 2px 6px;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 105, 180, 0.15);
      color: #ff69b4;
    }

    .q-icon {
      color: inherit;
    }
  }

  .q-separator {
    background: rgba(255, 255, 255, 0.1);
    margin: 4px 0;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .music-card {
    height: 280px; // 稍微增加移动端高度

    .cover-section {
      height: 150px; // 调整移动端封面高度
    }

    .info-section {
      padding: 10px 10px 14px 10px; // 增加底部内边距
      min-height: 130px; // 确保信息区域有足够高度

      .track-info {
        margin-bottom: 8px; // 确保有足够空间给按钮

        .track-title {
          font-size: 13px;
          line-height: 1.4;
          -webkit-line-clamp: 2; // 限制标题最多两行
          line-clamp: 2;
        }

        .track-artist {
          font-size: 11px;
        }
      }

      .track-meta {
        margin-top: 8px;
        min-height: 36px; // 增加按钮区域高度

        .actions {
          gap: 2px; // 减少按钮间距以适应小屏幕
          flex-wrap: nowrap; // 确保按钮不换行
          justify-content: flex-end; // 右对齐按钮

          .q-btn {
            min-width: 30px !important; // 确保触摸友好
            min-height: 30px !important;
            width: 30px;
            height: 30px;
            font-size: 12px;
            padding: 0 !important;

            // 强制显示按钮
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
            flex-shrink: 0; // 防止按钮被压缩

            .q-icon {
              font-size: 16px; // 保持图标清晰可见
            }
          }
        }

        .duration {
          font-size: 11px;
          flex-shrink: 0; // 防止时长被压缩
        }
      }
    }
  }
}

// 竖屏特定优化 (宽高比 < 0.8)
@media (max-aspect-ratio: 4/5) {
  .music-card {
    .info-section {
      .track-meta {
        .actions {
          .q-btn {
            // 在极窄屏幕上进一步优化按钮尺寸
            min-width: 28px;
            min-height: 28px;
            font-size: 14px;
          }
        }
      }
    }
  }
}

// 横向布局优化 (宽高比 >= 1.2，即横向布局)
@media (min-aspect-ratio: 6/5) {
  .music-card {
    height: 240px; // 在横向布局时增加高度以确保有足够空间

    .cover-section {
      height: 130px; // 调整封面高度
    }

    .info-section {
      padding: 8px 12px 12px 12px; // 增加底部内边距
      min-height: 110px; // 确保信息区域有最小高度

      .track-info {
        margin-bottom: 6px; // 减少标题和按钮间的距离

        .track-title {
          font-size: 12px;
          line-height: 1.3;
          // 限制行数，防止标题过长
          -webkit-line-clamp: 1;
          line-clamp: 1;
        }

        .track-artist {
          font-size: 10px;
          margin-bottom: 1px;
        }
      }

      .track-meta {
        margin-top: 6px; // 增加顶部间距
        min-height: 32px; // 确保按钮有足够空间

        .actions {
          gap: 2px; // 适中的按钮间距
          flex-wrap: nowrap; // 强制按钮不换行
          justify-content: flex-end; // 右对齐按钮

          .q-btn {
            min-width: 26px !important;
            min-height: 26px !important;
            width: 26px;
            height: 26px;
            font-size: 11px;
            padding: 0 !important;

            // 确保按钮在横向布局时可见
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
            flex-shrink: 0; // 防止按钮被压缩

            .q-icon {
              font-size: 14px; // 保持图标可见
            }
          }
        }

        .duration {
          font-size: 10px;
          white-space: nowrap; // 防止时长文本换行
          flex-shrink: 0; // 防止时长文本被压缩
        }
      }
    }
  }
}

// 极小屏幕优化 (宽度 < 480px)
@media (max-width: 480px) {
  .music-card {
    .info-section {
      .track-meta {
        .actions {
          gap: 0px; // 在极小屏幕上移除按钮间距

          .q-btn {
            min-width: 22px !important;
            min-height: 22px !important;
            width: 22px;
            height: 22px;
            font-size: 10px;

            .q-icon {
              font-size: 12px;
            }
          }
        }
      }
    }
  }
}
</style>
