<template>
  <q-card class="beatmap-card cursor-pointer" @click="$emit('click')" flat bordered>
    <!-- 封面图片 -->
    <div class="card-image-container">
      <q-img
        :src="coverImage"
        :alt="`${beatmapset.title} cover`"
        class="card-image"
        fit="cover"
        :ratio="1.8"
        @error="onImageError"
        style="object-fit: cover; object-position: center; background: #222"
      >
        <template #loading>
          <div class="absolute-full flex flex-center">
            <q-spinner color="white" size="2em" />
          </div>
        </template>
      </q-img>

      <!-- 状态标签 -->
      <div class="status-badge" :class="`status-${beatmapset.status}`">
        {{ formatStatus(beatmapset.status) }}
      </div>

      <!-- 播放按钮叠加层 -->
      <div class="play-overlay absolute-full flex flex-center">
        <q-btn
          fab
          :color="isCurrentlyPlaying ? 'secondary' : 'primary'"
          :icon="getPlayButtonIcon"
          size="md"
          class="play-button"
          :loading="isCurrentlyLoading"
          @click.stop="playPreview"
        />
      </div>
    </div>

    <!-- 卡片内容 -->
    <q-card-section class="card-content">
      <!-- 标题和艺术家 -->
      <div class="song-info">
        <h6 class="song-title q-ma-none">
          {{ displayTitle }}
        </h6>
        <p class="artist-name text-grey-6 q-ma-none q-mt-xs">by {{ displayArtist }}</p>
      </div>

      <!-- 创建者和来源 -->
      <div class="creator-info q-mt-sm">
        <p class="text-caption text-grey-7 q-ma-none">
          <q-icon name="person" size="14px" class="q-mr-xs" />
          {{ beatmapset.creator }}
        </p>
        <p v-if="beatmapset.source" class="text-caption text-grey-7 q-ma-none q-mt-xs">
          <q-icon name="source" size="14px" class="q-mr-xs" />
          {{ beatmapset.source }}
        </p>
      </div>

      <!-- 统计信息 -->
      <div class="stats-row q-mt-md">
        <div class="stat-item">
          <q-icon name="play_circle" size="16px" />
          <span class="stat-value">{{ formatNumber(beatmapset.play_count) }}</span>
        </div>
        <div class="stat-item">
          <q-icon name="favorite" size="16px" />
          <span class="stat-value">{{ formatNumber(beatmapset.favourite_count) }}</span>
        </div>
        <div class="stat-item">
          <q-icon name="speed" size="16px" />
          <span class="stat-value">{{ beatmapset.bpm }} BPM</span>
        </div>
      </div>

      <!-- 难度信息 -->
      <div class="difficulties q-mt-sm">
        <div class="difficulty-chips">
          <q-chip
            v-for="beatmap in sortedBeatmaps"
            :key="beatmap.id"
            :color="getDifficultyColor(beatmap.difficulty_rating)"
            text-color="white"
            size="sm"
            dense
            class="difficulty-chip"
          >
            <q-icon :name="getModeIcon(beatmap.mode)" size="12px" class="q-mr-xs" />
            {{ beatmap.difficulty_rating.toFixed(2) }}★
          </q-chip>
        </div>
      </div>
    </q-card-section>

    <!-- 操作按钮 -->
    <q-card-actions class="card-actions row items-center justify-between">
      <!-- 左侧：收藏和播放列表按钮 -->
      <div class="left-actions row items-center">
        <!-- 收藏按钮 -->
        <q-btn
          flat
          round
          size="sm"
          :icon="isInFavorites ? 'favorite' : 'favorite_border'"
          :color="isInFavorites ? 'pink' : 'grey-6'"
          @click.stop="toggleFavorite"
          :loading="isAddingToFavorites"
        >
          <q-tooltip>{{ isInFavorites ? 'Remove from Favorites' : 'Add to Favorites' }}</q-tooltip>
        </q-btn>

        <!-- 添加到播放列表按钮 -->
        <q-btn
          flat
          round
          size="sm"
          icon="playlist_add"
          color="grey-6"
          @click.stop="openAddToPlaylistDialog"
          class="q-ml-xs"
        >
          <q-tooltip>Add to Playlist</q-tooltip>
        </q-btn>
      </div>

      <!-- 右侧：查看和下载按钮 -->
      <div class="right-actions row items-center">
        <q-btn
          flat
          color="primary"
          icon="open_in_new"
          label="View"
          size="sm"
          @click.stop="openInBrowser"
          class="q-mr-sm"
        />

        <!-- 下载按钮和进度 -->
        <div class="download-section">
          <!-- 下载进度条 -->
          <div v-if="downloadProgress" class="download-progress-mini q-mb-xs">
            <q-linear-progress
              :value="downloadProgress.progress / 100"
              color="secondary"
              size="2px"
            />
          </div>

          <q-btn
            flat
            :color="
              downloadProgress?.status === 'completed'
                ? 'positive'
                : downloadProgress?.status === 'error'
                  ? 'negative'
                  : 'secondary'
            "
            :icon="
              downloadProgress?.status === 'completed'
                ? 'check_circle'
                : downloadProgress?.status === 'error'
                  ? 'error'
                  : 'download'
            "
            :label="
              downloadProgress?.status === 'completed'
                ? 'Downloaded'
                : downloadProgress?.status === 'downloading'
                  ? 'Downloading...'
                  : downloadProgress?.status === 'extracting'
                    ? 'Extracting...'
                    : downloadProgress?.status === 'error'
                      ? 'Failed'
                      : 'Download'
            "
            size="sm"
            :loading="
              downloadProgress?.status === 'downloading' ||
              downloadProgress?.status === 'extracting'
            "
            :disable="downloadProgress?.status === 'completed'"
            @click.stop="downloadBeatmap"
          >
            <q-tooltip v-if="!downloadProgress || downloadProgress.status === 'error'">
              Download audio files (MP3/OGG/FLAC formats, sound effects excluded)
            </q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useAudioService } from 'src/services/business/audioPlayPreviewService';
import { useBeatmapDownloadService } from 'src/services/business/beatmapDownloadService';
import { usePlaylistStore, type PlaylistTrack } from 'src/stores/playlistStore';
import AddToPlaylistDialog from './AddToPlaylistDialog.vue';

interface Beatmap {
  id: number;
  mode: string;
  difficulty_rating: number;
  version: string;
  accuracy: number;
  ar: number;
  bpm: number;
  cs: number;
  drain: number;
  total_length: number;
  hit_length: number;
  count_circles: number;
  count_sliders: number;
  count_spinners: number;
}

interface BeatmapSet {
  id: number;
  title: string;
  title_unicode?: string;
  artist: string;
  artist_unicode?: string;
  creator: string;
  source: string;
  status: string;
  bpm: number;
  play_count: number;
  favourite_count: number;
  submitted_date: string;
  last_updated: string;
  tags: string;
  covers: {
    cover: string;
    cover2x: string;
    card: string;
    card2x: string;
    list: string;
    list2x: string;
    slimcover: string;
    slimcover2x: string;
  };
  beatmaps: Beatmap[];
}

interface Props {
  beatmapset: BeatmapSet;
}

const props = defineProps<Props>();
// const emit = defineEmits(['click']);
const $q = useQuasar();
const audioService = useAudioService();
const downloadService = useBeatmapDownloadService();
const playlistStore = usePlaylistStore();

// 默认封面图片
const defaultCover = 'https://osu.ppy.sh/images/layout/beatmaps/default-bg.png';

// 标题显示（优先使用 unicode）
const displayTitle = computed(() => {
  return props.beatmapset.title_unicode || props.beatmapset.title;
});

// 艺术家显示（优先使用 unicode）
const displayArtist = computed(() => {
  return props.beatmapset.artist_unicode || props.beatmapset.artist;
});

const coverImage = computed(() => {
  // 优先使用高质量的 card 图片，其次是 cover，最后是默认图片
  const covers = props.beatmapset.covers;
  if (covers?.card) {
    return covers.card;
  }
  if (covers?.cover) {
    return covers.cover;
  }
  return defaultCover;
});

// 计算下载进度
const downloadProgress = computed(() => {
  return downloadService.getDownloadProgress(props.beatmapset.id);
});

// 音频播放状态
const isCurrentlyPlaying = computed(() => audioService.isPlayingBeatmap(props.beatmapset.id));

const isCurrentlyLoading = computed(() => audioService.isLoadingBeatmap(props.beatmapset.id));

const getPlayButtonIcon = computed(() => {
  if (isCurrentlyLoading.value) {
    return 'hourglass_empty';
  }
  return isCurrentlyPlaying.value ? 'pause' : 'play_arrow';
});

// 图片加载错误处理
const onImageError = (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  // 防止无限循环，只在不是默认图片时才设置为默认图片
  if (imgElement.src !== defaultCover) {
    imgElement.src = defaultCover;
  }
};

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// 格式化状态
const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    ranked: 'Ranked',
    approved: 'Approved',
    qualified: 'Qualified',
    loved: 'Loved',
    pending: 'Pending',
    graveyard: 'Graveyard',
    wip: 'WIP',
  };
  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
};

// 获取难度颜色
const getDifficultyColor = (rating: number): string => {
  if (rating < 2) return 'light-blue-6';
  if (rating < 2.7) return 'green-6';
  if (rating < 4) return 'yellow-8';
  if (rating < 5.3) return 'orange-6';
  if (rating < 6.5) return 'red-6';
  return 'purple-6';
};

// 获取游戏模式图标
const getModeIcon = (mode: string): string => {
  const modeIcons: Record<string, string> = {
    osu: 'radio_button_unchecked',
    taiko: 'album',
    fruits: 'catching_pokemon',
    mania: 'piano',
  };
  return modeIcons[mode] || 'music_note';
};

// 播放列表相关
const isAddingToFavorites = ref(false);

// 判断是否在收藏夹中
const isInFavorites = computed(() => {
  const favPlaylist = playlistStore.defaultPlaylist;
  if (!favPlaylist) return false;
  return favPlaylist.tracks.some((t) => t.beatmapsetId === props.beatmapset.id);
});

// 转换为播放列表轨道格式
const convertToPlaylistTrack = (): Omit<PlaylistTrack, 'addedAt'> => {
  return {
    beatmapsetId: props.beatmapset.id,
    title: displayTitle.value,
    artist: displayArtist.value,
    duration: props.beatmapset.beatmaps[0]?.total_length || 0,
    bpm: props.beatmapset.bpm,
  };
};

// 转换为 MusicTrack 格式以兼容 AddToPlaylistDialog
const convertToMusicTrack = () => {
  return {
    id: props.beatmapset.id.toString(),
    title: displayTitle.value,
    artist: displayArtist.value,
    album: props.beatmapset.source || 'osu! Beatmap',
    duration: props.beatmapset.beatmaps[0]?.total_length || 0,
    bpm: props.beatmapset.bpm,
    coverUrl: coverImage.value,
  };
};

// 切换收藏状态
const toggleFavorite = async () => {
  const favPlaylist = playlistStore.defaultPlaylist;
  if (!favPlaylist) {
    $q.notify({
      message: 'Favorites playlist not found',
      icon: 'error',
      color: 'negative',
      timeout: 3000,
    });
    return;
  }

  if (isAddingToFavorites.value) return;

  isAddingToFavorites.value = true;

  try {
    if (isInFavorites.value) {
      // 从收藏夹移除
      await playlistStore.removeTrackFromPlaylist(favPlaylist.id, props.beatmapset.id);
      $q.notify({
        message: 'Removed from Favorites',
        icon: 'favorite_border',
        color: 'info',
        timeout: 2000,
      });
    } else {
      // 添加到收藏夹
      const playlistTrack = convertToPlaylistTrack();
      await playlistStore.addTrackToPlaylist(favPlaylist.id, playlistTrack);
      $q.notify({
        message: 'Added to Favorites',
        icon: 'favorite',
        color: 'pink',
        timeout: 2000,
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    $q.notify({
      message: error instanceof Error ? error.message : 'Failed to update favorites',
      icon: 'error',
      color: 'negative',
      timeout: 3000,
    });
  } finally {
    isAddingToFavorites.value = false;
  }
};

// 打开添加到播放列表对话框
const openAddToPlaylistDialog = () => {
  const musicTrack = convertToMusicTrack();

  $q.dialog({
    component: AddToPlaylistDialog,
    componentProps: {
      track: musicTrack,
    },
  });
};

// 操作函数
const playPreview = async () => {
  try {
    const title = displayTitle.value;
    await audioService.playPreview(props.beatmapset.id, title);

    if (isCurrentlyPlaying.value) {
      $q.notify({
        message: `Playing preview: ${title}`,
        icon: 'music_note',
        color: 'positive',
        timeout: 2000,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to play preview';
    $q.notify({
      message: errorMessage,
      icon: 'error',
      color: 'negative',
      timeout: 3000,
    });
  }
};

const openInBrowser = () => {
  const url = `https://osu.ppy.sh/beatmapsets/${props.beatmapset.id}`;

  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('open-external-url', url);
  } else {
    window.open(url, '_blank');
  }
};

const downloadBeatmap = async () => {
  const beatmapsetId = props.beatmapset.id;
  const title = displayTitle.value;

  // 检查是否已在下载中
  if (downloadService.isDownloading(beatmapsetId)) {
    $q.notify({
      message: `"${title}" is already downloading`,
      icon: 'info',
      color: 'info',
    });
    return;
  }

  console.log(`[BeatmapCard] Starting download for beatmapset ID: ${beatmapsetId} - ${title}`);

  // 显示开始下载通知
  $q.notify({
    message: `Starting download: ${title}`,
    icon: 'download',
    color: 'info',
    timeout: 2000,
  });

  try {
    await downloadService.downloadBeatmap(beatmapsetId, title);

    // 成功通知
    $q.notify({
      message: `Successfully downloaded: ${title}`,
      icon: 'check_circle',
      color: 'positive',
      timeout: 3000,
    });
  } catch (error) {
    console.error('[BeatmapCard] Download failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Download failed';

    // 错误通知
    $q.notify({
      message: `Download failed: ${errorMessage}`,
      icon: 'error',
      color: 'negative',
      timeout: 5000,
    });
  }
};

// 按难度排序的谱面列表
const sortedBeatmaps = computed(() => {
  return [...props.beatmapset.beatmaps].sort((a, b) => a.difficulty_rating - b.difficulty_rating);
});

// 组件卸载时清理资源
onUnmounted(() => {
  // 如果当前卡片的音频正在播放，停止播放并清理资源
  if (isCurrentlyPlaying.value) {
    audioService.stop();
  }
});
</script>

<style lang="scss" scoped>
.beatmap-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    background: rgba(255, 255, 255, 0.08);

    .play-overlay {
      opacity: 1;
    }

    .card-image {
      transform: scale(1.05);
    }
  }
}

.card-image-container {
  position: relative;
  height: 160px;
  overflow: hidden;

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover; // 保证图片完全填充
    object-position: center;
    background: #222;
    transition: transform 0.3s ease;
  }

  .status-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    backdrop-filter: blur(10px);

    &.status-ranked,
    &.status-approved {
      background: rgba(76, 175, 80, 0.9);
      color: white;
    }

    &.status-qualified {
      background: rgba(33, 150, 243, 0.9);
      color: white;
    }

    &.status-loved {
      background: rgba(233, 30, 99, 0.9);
      color: white;
    }

    &.status-pending,
    &.status-wip {
      background: rgba(255, 193, 7, 0.9);
      color: black;
    }

    &.status-graveyard {
      background: rgba(158, 158, 158, 0.9);
      color: white;
    }
  }

  .play-overlay {
    opacity: 0;
    background: rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s ease;

    .play-button {
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.card-content {
  padding: 16px;

  .song-title {
    font-size: 16px;
    font-weight: 600;
    color: white;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .artist-name {
    font-size: 14px;
    line-height: 1.2;
  }

  .creator-info {
    .text-caption {
      display: flex;
      align-items: center;
      font-size: 12px;
    }
  }

  .stats-row {
    display: flex;
    gap: 16px;
    align-items: center;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;

      .q-icon {
        opacity: 0.7;
      }

      .stat-value {
        font-weight: 500;
      }
    }
  }

  .difficulties {
    .difficulty-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

      .difficulty-chip {
        border-radius: 6px;
        font-size: 10px;
        font-weight: 600;
      }
    }
  }
}

.card-actions {
  padding: 8px 16px 16px;
  background: rgba(255, 255, 255, 0.02);

  .q-btn {
    font-size: 12px;
    padding: 4px 12px;
  }

  .download-section {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .download-progress-mini {
      width: 100%;
      min-width: 80px;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .beatmap-card {
    .card-image-container {
      height: 140px;
    }

    .stats-row {
      gap: 12px;

      .stat-item {
        font-size: 11px;
      }
    }

    .card-actions {
      .q-btn {
        padding: 3px 8px;
        font-size: 11px;
      }
    }
  }
}
</style>
