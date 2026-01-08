<template>
  <div class="all-music-page">
    <!-- 页面标题 -->
    <section class="page-header q-mb-xl">
      <div class="title-section">
        <h4 class="q-mt-none q-mb-md text-h4 text-white">
          <q-icon name="music_note" class="q-mr-sm" />
          🎵 All Music
        </h4>
        <q-separator dark spaced class="q-mb-lg" />
      </div>

      <!-- 统计信息 -->
      <div class="stats-cards row q-col-gutter-md q-mt-lg">
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="text-center">
              <q-icon name="music_note" size="2rem" color="primary" />
              <div class="text-h6 q-mt-sm">{{ musicStore.totalTracks }}</div>
              <div class="text-caption text-grey-6">Tracks</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="text-center">
              <q-icon name="schedule" size="2rem" color="secondary" />
              <div class="text-h6 q-mt-sm">{{ totalDuration }}</div>
              <div class="text-caption text-grey-6">Total Duration</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="text-center">
              <q-icon name="person" size="2rem" color="accent" />
              <div class="text-h6 q-mt-sm">{{ artistCount }}</div>
              <div class="text-caption text-grey-6">Artists</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </section>

    <q-separator spaced="xl" />

    <!-- 操作栏 -->
    <section class="actions-bar q-mb-lg">
      <div class="row items-center justify-between">
        <div class="col-auto">
          <h2 class="text-h5 text-weight-medium q-mb-none text-white">Music Library</h2>
        </div>
        <div class="col-auto">
          <div class="row q-gutter-md no-wrap">
            <q-btn
              icon="refresh"
              label="Scan Music"
              @click="scanMusic"
              :loading="musicStore.isLoading"
              class="lazer-action-btn lazer-bg-pink"
            />
            <q-btn
              icon="shuffle"
              label="Shuffle All"
              @click="shuffleAll"
              :disable="musicStore.totalTracks === 0"
              class="lazer-action-btn lazer-bg-purple"
            />
            <q-btn
              icon="bug_report"
              label="Debug"
              @click="showDebugMenu = true"
              class="lazer-action-btn lazer-bg-orange"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- 搜索和过滤 -->
    <section class="search-section q-mb-lg">
      <div class="row q-gutter-md items-end no-wrap">
        <div class="col">
          <q-input
            v-model="searchQuery"
            label="Search music..."
            outlined
            dark
            clearable
            @update:model-value="onSearchChange"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-auto">
          <q-select
            v-model="sortBy"
            :options="sortOptions"
            option-value="value"
            option-label="label"
            outlined
            dark
            label="Sort by"
            style="min-width: 150px"
            @update:model-value="onSortChange"
          />
        </div>
      </div>
    </section>

    <!-- 加载状态 -->
    <div v-if="musicStore.isLoading" class="loading-section text-center q-py-xl">
      <q-spinner color="primary" size="3rem" />
      <p class="text-subtitle2 text-grey-6 q-mt-md">Scanning music files...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="musicStore.error" class="error-section text-center q-py-xl">
      <q-icon name="error_outline" size="4rem" color="negative" />
      <h5 class="text-negative q-mt-md">Scan Failed</h5>
      <p class="text-grey-6">{{ musicStore.error }}</p>
      <q-btn
        color="primary"
        label="Retry"
        icon="refresh"
        outline
        @click="scanMusic"
        class="q-mt-md"
      />
    </div>

    <!-- 音乐网格/列表 -->
    <section v-else class="music-content">
      <!-- 网格视图 -->
      <div v-if="viewMode === 'grid'" class="music-grid">
        <div v-if="filteredTracks.length > 0" class="row q-col-gutter-lg">
          <div
            v-for="track in filteredTracks"
            :key="track.id"
            class="col-12 col-sm-6 col-md-4 col-lg-3"
          >
            <MusicCard
              :track="track"
              @play="playTrack(track)"
              @addToQueue="addTrackToQueue(track)"
              @playNext="playTrackNext(track)"
              @delete="handleDeleteTrack(track)"
            />
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state text-center q-py-xl">
          <q-icon name="music_off" size="5rem" color="grey-5" />
          <h5 class="text-grey-5 q-mt-md">
            {{ searchQuery ? 'No matching tracks' : 'No music found' }}
          </h5>
          <p class="text-grey-6">
            {{
              searchQuery
                ? 'Try a different search term'
                : 'Scan your music folder to import tracks'
            }}
          </p>
          <q-btn
            v-if="!searchQuery"
            color="primary"
            label="Scan Music"
            icon="refresh"
            outline
            @click="scanMusic"
            class="q-mt-md"
          />
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="music-list show-scrollbar">
        <q-list v-if="filteredTracks.length > 0" dark separator class="music-list-container">
          <q-item
            v-for="track in filteredTracks"
            :key="track.id"
            clickable
            @click="playTrack(track)"
            class="music-list-item"
          >
            <q-item-section avatar>
              <q-avatar size="50px" rounded>
                <img :src="getSmartCoverUrl(track)" :alt="track.title" @error="onCoverImageError" />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-white text-weight-medium">{{ track.title }}</q-item-label>
              <q-item-label caption class="text-grey-6">{{
                track.artist || 'Unknown Artist'
              }}</q-item-label>
            </q-item-section>

            <q-item-section side>
              <div class="row items-center q-gutter-sm">
                <q-btn
                  flat
                  round
                  size="sm"
                  icon="play_arrow"
                  color="primary"
                  @click.stop="playTrack(track)"
                />
                <!-- 次级菜单按钮 -->
                <q-btn flat round size="sm" icon="more_vert" color="grey-6" @click.stop>
                  <q-menu auto-close>
                    <q-list style="min-width: 180px">
                      <q-item clickable @click="addTrackToQueue(track)">
                        <q-item-section avatar>
                          <q-icon name="queue" />
                        </q-item-section>
                        <q-item-section>Add to Queue</q-item-section>
                      </q-item>

                      <q-item clickable @click="playTrackNext(track)">
                        <q-item-section avatar>
                          <q-icon name="skip_next" />
                        </q-item-section>
                        <q-item-section>Play Next</q-item-section>
                      </q-item>

                      <q-item clickable @click="openAddToPlaylistDialog(track)">
                        <q-item-section avatar>
                          <q-icon name="playlist_add" />
                        </q-item-section>
                        <q-item-section>Add to Playlist</q-item-section>
                      </q-item>

                      <q-item clickable @click="toggleFavorite(track)">
                        <q-item-section avatar>
                          <q-icon
                            :name="isTrackInFavorites(track) ? 'favorite' : 'favorite_border'"
                          />
                        </q-item-section>
                        <q-item-section>
                          {{
                            isTrackInFavorites(track) ? 'Remove from Favorites' : 'Add to Favorites'
                          }}
                        </q-item-section>
                      </q-item>

                      <q-separator />

                      <q-item clickable @click="confirmDeleteTrack(track)" class="text-negative">
                        <q-item-section avatar>
                          <q-icon name="delete" color="negative" />
                        </q-item-section>
                        <q-item-section>Delete Track</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- 空状态 -->
        <div v-else class="empty-state text-center q-py-xl">
          <q-icon name="music_off" size="5rem" color="grey-5" />
          <h5 class="text-grey-5 q-mt-md">
            {{ searchQuery ? 'No matching tracks' : 'No music found' }}
          </h5>
          <p class="text-grey-6">
            {{
              searchQuery
                ? 'Try a different search term'
                : 'Scan your music folder to import tracks'
            }}
          </p>
          <q-btn
            v-if="!searchQuery"
            color="primary"
            label="Scan Music"
            icon="refresh"
            outline
            @click="scanMusic"
            class="q-mt-md"
          />
        </div>
      </div>
    </section>

    <!-- 歌曲信息对话框 -->

    <!-- 调试菜单对话框 -->
    <q-dialog v-model="showDebugMenu">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">🐛 Debug Tools</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="q-mb-md">
            <strong>Current Stats:</strong><br />
            Total Tracks: {{ musicStore.totalTracks }}<br />
            Filtered Tracks: {{ filteredTracks.length }}<br />
            Music Store Loading: {{ musicStore.isLoading }}<br />
            Music Store Error: {{ musicStore.error || 'None' }}
          </div>

          <div class="row q-gutter-sm">
            <q-btn
              color="primary"
              label="Sync Library"
              @click="syncLibrary"
              :loading="isSyncing"
              class="col-12 q-mb-sm"
            />
            <q-btn
              color="warning"
              label="Clean Library"
              @click="cleanLibrary"
              :loading="isCleaning"
              class="col-12 q-mb-sm"
            />
            <q-btn
              color="negative"
              label="Reset Library"
              @click="confirmResetLibrary"
              class="col-12 q-mb-sm"
            />
            <q-btn color="info" label="Log Library Data" @click="logLibraryData" class="col-12" />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" @click="showDebugMenu = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useMusicStore, type MusicTrack } from 'src/stores/musicStore';
import { usePlaylistStore, type PlaylistTrack } from 'src/stores/playlistStore';
import MusicCard from 'src/components/MusicCard.vue';
import AddToPlaylistDialog from 'src/components/AddToPlaylistDialog.vue';

const $q = useQuasar();
const musicStore = useMusicStore();
const playlistStore = usePlaylistStore();

// 响应式数据
const searchQuery = ref('');
const sortBy = ref('title');
const windowWidth = ref(window.innerWidth);
const windowHeight = ref(window.innerHeight);
const showDebugMenu = ref(false);
const isSyncing = ref(false);
const isCleaning = ref(false);

// 计算属性
const totalDuration = computed(() => {
  const seconds = musicStore.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
});

const artistCount = computed(() => {
  const artists = new Set(
    musicStore.tracks
      .map((track) => track.artist?.trim())
      .filter((artist) => artist && artist !== 'Unknown Artist'),
  );
  return artists.size;
});

// 根据屏幕比例自动选择视图模式
const viewMode = computed(() => {
  const aspectRatio = windowWidth.value / windowHeight.value;
  // 当宽高比小于 3:4 (0.75) 时使用列表视图（竖屏），否则使用网格视图
  return aspectRatio < 0.75 ? 'list' : 'grid';
});

const filteredTracks = computed(() => {
  let tracks = searchQuery.value ? musicStore.searchTracks(searchQuery.value) : musicStore.tracks;

  // 排序
  switch (sortBy.value) {
    case 'title':
      tracks = [...tracks].sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'artist':
      tracks = [...tracks].sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      break;
    case 'bpm':
      tracks = [...tracks].sort((a, b) => (b.bpm || 0) - (a.bpm || 0));
      break;
    case 'duration':
      tracks = [...tracks].sort((a, b) => (b.duration || 0) - (a.duration || 0));
      break;
    case 'recent':
      tracks = [...tracks].sort(
        (a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime(),
      );
      break;
  }

  return tracks;
});

// 选项配置
const sortOptions = [
  { label: 'Title', value: 'title' },
  { label: 'Artist', value: 'artist' },
  { label: 'BPM', value: 'bpm' },
  { label: 'Duration', value: 'duration' },
  { label: 'Recently Added', value: 'recent' },
];

// 方法
const scanMusic = async () => {
  try {
    await musicStore.scanMusicFiles();

    if (musicStore.error) {
      $q.notify({
        message: 'Failed to scan music files',
        icon: 'error',
        color: 'negative',
      });
    } else {
      $q.notify({
        message: `Found ${musicStore.totalTracks} tracks`,
        icon: 'music_note',
        color: 'positive',
      });
    }
  } catch {
    $q.notify({
      message: 'An error occurred while scanning music files',
      icon: 'error',
      color: 'negative',
    });
  }
};

const playTrack = (track: MusicTrack) => {
  const trackIndex = filteredTracks.value.findIndex((t) => t.id === track.id);
  const startIndex = trackIndex >= 0 ? trackIndex : 0;
  musicStore.setPlayQueue(filteredTracks.value, startIndex);
  const target = filteredTracks.value[startIndex];
  if (target) {
    musicStore.playTrack(target);
    $q.notify({ message: `Now playing: ${target.title}`, icon: 'play_arrow', color: 'positive' });
  }
};

// 新增：替换当前播放歌曲而不改变队列其他部分
const replaceCurrentTrackInQueue = (track: MusicTrack) => {
  if (!musicStore.playQueue.length) {
    // 如果队列为空，行为等同 playTrack
    playTrack(track);
    return;
  }
  const idx = musicStore.playQueue.findIndex((t) => t.id === track.id);
  if (idx !== -1) {
    musicStore.currentQueueIndex = idx;
    musicStore.playTrack(track);
  } else {
    // 用当前过滤集合重建队列并定位
    const trackIndex = filteredTracks.value.findIndex((t) => t.id === track.id);
    const startIndex = trackIndex >= 0 ? trackIndex : 0;
    musicStore.setPlayQueue(filteredTracks.value, startIndex);
    const target = filteredTracks.value[startIndex];
    if (target) musicStore.playTrack(target);
  }
};

const addTrackToQueue = (track: MusicTrack) => {
  // 需求调整：点击添加即替换当前正在播放
  replaceCurrentTrackInQueue(track);
  $q.notify({ message: `Switched to: ${track.title}`, icon: 'play_arrow', color: 'positive' });
};

const playTrackNext = (track: MusicTrack) => {
  // 需求调整：也直接替换当前播放
  replaceCurrentTrackInQueue(track);
  $q.notify({ message: `Switched to: ${track.title}`, icon: 'play_arrow', color: 'positive' });
};

// 删除歌曲处理函数
const handleDeleteTrack = async (track: MusicTrack) => {
  try {
    const result = await musicStore.deleteTrackFile(track);

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: `Successfully deleted "${track.title}"`,
        icon: 'delete',
        position: 'top',
      });
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to delete track',
        icon: 'error',
        position: 'top',
      });
    }
  } catch (error) {
    console.error('Error deleting track:', error);
    $q.notify({
      type: 'negative',
      message: 'An error occurred while deleting the track',
      icon: 'error',
      position: 'top',
    });
  }
};

// 确认删除歌曲（用于列表视图）
const confirmDeleteTrack = (track: MusicTrack) => {
  $q.dialog({
    title: 'Delete Track',
    message: `Are you sure you want to delete "${track.title}"? This action cannot be undone.`,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(() => {
    handleDeleteTrack(track);
  });
};

// 调试方法
const syncLibrary = async () => {
  isSyncing.value = true;
  try {
    // 调用 store 的同步方法
    await musicStore.syncMusicLibrary();
    $q.notify({
      message: 'Library synced successfully',
      icon: 'sync',
      color: 'positive',
    });
  } catch (error) {
    console.error('Sync failed:', error);
    $q.notify({
      message: 'Failed to sync library',
      icon: 'error',
      color: 'negative',
    });
  } finally {
    isSyncing.value = false;
  }
};

const cleanLibrary = async () => {
  isCleaning.value = true;
  try {
    // 清理无效的音乐记录
    await musicStore.cleanupMusicLibrary();
    $q.notify({
      message: 'Library cleaned successfully',
      icon: 'cleaning_services',
      color: 'positive',
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
    $q.notify({
      message: 'Failed to clean library',
      icon: 'error',
      color: 'negative',
    });
  } finally {
    isCleaning.value = false;
  }
};

const confirmResetLibrary = () => {
  $q.dialog({
    title: 'Reset Music Library',
    message: 'This will remove all music records (but not files). Are you sure?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await musicStore.resetMusicLibrary();
      $q.notify({
        message: 'Library reset successfully',
        icon: 'refresh',
        color: 'positive',
      });
    } catch (error) {
      console.error('Reset failed:', error);
      $q.notify({
        message: 'Failed to reset library',
        icon: 'error',
        color: 'negative',
      });
    }
  });
};

const logLibraryData = () => {
  console.log('=== MUSIC LIBRARY DEBUG INFO ===');
  console.log('Music Store State:', {
    totalTracks: musicStore.totalTracks,
    tracks: musicStore.tracks,
    isLoading: musicStore.isLoading,
    error: musicStore.error,
  });
  console.log('Filtered Tracks:', filteredTracks.value);
  console.log('Search Query:', searchQuery.value);
  console.log('Sort By:', sortBy.value);
  $q.notify({
    message: 'Debug info logged to console',
    icon: 'info',
    color: 'info',
  });
};

// 恢复 shuffleAll 功能：随机选择并直接播放（保持替换语义）
const shuffleAll = () => {
  if (musicStore.totalTracks === 0) return;
  const randomTrack = filteredTracks.value.length
    ? filteredTracks.value[Math.floor(Math.random() * filteredTracks.value.length)]
    : musicStore.tracks[Math.floor(Math.random() * musicStore.tracks.length)];
  if (randomTrack) {
    playTrack(randomTrack);
    $q.notify({ message: 'Shuffle play', icon: 'shuffle', color: 'info' });
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

// 检查是否在收藏夹中
const isTrackInFavorites = (track: MusicTrack): boolean => {
  const favPlaylist = playlistStore.defaultPlaylist;
  if (!favPlaylist) return false;
  return favPlaylist.tracks.some((t) => t.beatmapsetId === Number(track.id));
};

// 切换收藏状态
const toggleFavorite = async (track: MusicTrack) => {
  const favPlaylist = playlistStore.defaultPlaylist;
  if (!favPlaylist) {
    $q.notify({
      type: 'negative',
      message: 'Favorites playlist not found',
      position: 'top',
    });
    return;
  }

  try {
    if (isTrackInFavorites(track)) {
      // 从收藏夹移除
      await playlistStore.removeTrackFromPlaylist(favPlaylist.id, Number(track.id));
      $q.notify({
        type: 'info',
        message: 'Removed from Favorites',
        position: 'top',
      });
    } else {
      // 添加到收藏夹
      const playlistTrack = convertToPlaylistTrack(track);
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
  }
};

// 打开添加到播放列表对话框
const openAddToPlaylistDialog = (track: MusicTrack) => {
  $q.dialog({
    component: AddToPlaylistDialog,
    componentProps: {
      track: track,
    },
  });
};

// 智能封面 URL 生成 - 与 MusicCard.vue 保持一致
const getSmartCoverUrl = (track: MusicTrack): string => {
  console.log('[AllMusicPage] Generating cover URL for track:', {
    title: track.title,
    id: track.id,
    album: track.album,
    coverUrl: track.coverUrl,
  });

  // 如果有 coverUrl，直接使用
  if (track.coverUrl) {
    console.log('[AllMusicPage] Using existing coverUrl:', track.coverUrl);
    return track.coverUrl;
  }

  // 尝试从 album 字段中提取 beatmap ID（格式："osu! Beatmap #123456"）
  if (track.album && track.album.includes('osu! Beatmap #')) {
    const beatmapIdMatch = track.album.match(/osu! Beatmap #(\d+)/);
    if (beatmapIdMatch && beatmapIdMatch[1]) {
      const beatmapId = beatmapIdMatch[1];
      const coverUrl = `https://assets.ppy.sh/beatmaps/${beatmapId}/covers/card.jpg`;
      console.log('[AllMusicPage] Generated cover URL from album:', coverUrl);
      return coverUrl;
    }
  }

  // 使用 osu! 默认封面
  console.log('[AllMusicPage] Using default cover for track:', track.title);
  return 'https://osu.ppy.sh/images/layout/beatmaps/default-bg.png';
};

// 封面图片错误处理
const onCoverImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  const currentSrc = img.src;
  const defaultCover = 'https://osu.ppy.sh/images/layout/beatmaps/default-bg.png';

  // 从 img 元素找到对应的 track
  const trackTitle = img.alt;
  const track = filteredTracks.value.find((t) => t.title === trackTitle);

  console.log('[AllMusicPage] Image error for track:', trackTitle, 'currentSrc:', currentSrc);

  if (!track) {
    // 如果找不到对应 track，直接使用默认封面
    if (currentSrc !== defaultCover) {
      console.log('[AllMusicPage] Track not found, using default cover');
      img.src = defaultCover;
    }
    return;
  }

  // 尝试从 album 字段中提取 beatmap ID
  let beatmapId: string | null = null;
  if (track.album && track.album.includes('osu! Beatmap #')) {
    const beatmapIdMatch = track.album.match(/osu! Beatmap #(\d+)/);
    if (beatmapIdMatch && beatmapIdMatch[1]) {
      beatmapId = beatmapIdMatch[1];
    }
  }

  // 如果当前不是默认封面且有 beatmap ID
  if (currentSrc !== defaultCover && beatmapId) {
    // 尝试其他封面尺寸
    if (currentSrc.includes('/card.jpg')) {
      // 尝试 list 尺寸
      const listUrl = `https://assets.ppy.sh/beatmaps/${beatmapId}/covers/list.jpg`;
      console.log('[AllMusicPage] Trying list cover:', listUrl);
      img.src = listUrl;
      return;
    } else if (currentSrc.includes('/list.jpg')) {
      // 尝试 cover 尺寸
      const coverUrl = `https://assets.ppy.sh/beatmaps/${beatmapId}/covers/cover.jpg`;
      console.log('[AllMusicPage] Trying cover size:', coverUrl);
      img.src = coverUrl;
      return;
    } else if (currentSrc.includes('/cover.jpg')) {
      // 尝试 slimcover 尺寸
      const slimcoverUrl = `https://assets.ppy.sh/beatmaps/${beatmapId}/covers/slimcover.jpg`;
      console.log('[AllMusicPage] Trying slimcover:', slimcoverUrl);
      img.src = slimcoverUrl;
      return;
    }
  }

  // 最后使用默认封面
  if (currentSrc !== defaultCover) {
    console.log('[AllMusicPage] Using default cover for:', trackTitle);
    img.src = defaultCover;
  }
};

// 事件处理
const onSearchChange = () => {
  // 搜索逻辑已在计算属性中处理
};

const onSortChange = () => {
  // 排序逻辑已在计算属性中处理
};

// 窗口大小变化处理
const handleResize = () => {
  windowWidth.value = window.innerWidth;
  windowHeight.value = window.innerHeight;
};

// 组件挂载
onMounted(() => {
  // 自动扫描音乐文件
  void scanMusic();

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize);
});

// 组件卸载
onUnmounted(() => {
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize);
});
</script>

<style lang="scss" scoped>
.all-music-page {
  background: transparent; // 使用透明背景，避免黑边问题
  color: #c4c9d4; // 保持一致的文字颜色
  min-height: 100vh;
  padding: 24px;

  .page-header {
    .title-section {
      .text-h4 {
        font-weight: 700;
        // osu!lazer 风格的粉紫渐变
        background: linear-gradient(135deg, #ff69b4, #c77dff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        display: inline-flex;
        align-items: center;
        padding-bottom: 4px;

        .q-icon {
          color: #c4c9d4; // 与 PlaylistPage 一致的图标颜色
          margin-right: 12px;
          font-size: 2.5rem;
        }
      }

      // 更新分隔线样式
      .q-separator {
        background-color: rgba(196, 201, 212, 0.2); // 使用主文字颜色的透明版本
        height: 1px;
      }
    }

    .stats-cards {
      .stat-card {
        background: rgba(255, 255, 255, 0.05); // 与 PlaylistPage 完全一致的卡片背景
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1); // 与 PlaylistPage 一致的边框
        border-radius: 8px;
        transition: all 0.25s ease-in-out;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

        .q-icon {
          color: #ff69b4;
        }

        .text-h6 {
          color: #c4c9d4; // 与 PlaylistPage 一致的主文字颜色
          font-weight: 600;
        }

        .text-caption {
          color: #8b92b8; // 与 PlaylistPage 一致的次要文字颜色
        }

        &:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
          background: #35353a; // 悬停时稍微亮一点的深灰色
          border-color: rgba(255, 105, 180, 0.5);
        }
      }
    }
  }

  .actions-bar {
    padding: 16px 0;

    // 强制横向布局，不响应屏幕大小变化
    .row {
      flex-wrap: nowrap !important;

      .col-auto {
        .row {
          flex-wrap: nowrap !important;
        }
      }
    }

    // 为按钮容器应用强制横向布局样式
    .col-auto .row {
      flex-wrap: nowrap !important;
    }

    // 应用与search-section相同的横向布局样式
    .row:not(.stats-cards .row) {
      flex-wrap: nowrap !important;
    }

    h2 {
      color: #c4c9d4; // 与 PlaylistPage 一致的标题颜色
      font-weight: 600;
      margin-bottom: 0;
    }

    // 新增：Lazer 风格药丸按钮通用样式
    .lazer-action-btn {
      border-radius: 9999px !important; // 使用非常大的值强制药丸形状，并用 !important 提高优先级
      text-transform: none;
      font-weight: 600;
      padding: 8px 22px; // 稍微调整 padding 以适应药丸形状
      color: white !important;
      transition: all 0.2s ease-in-out;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
      border: none;
      min-height: 40px; // 确保按钮有一定高度

      .q-icon {
        margin-right: 8px; // 稍微增大图标和文字间距
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.25);
        filter: brightness(1.1);
      }

      &:active {
        transform: translateY(0px);
        filter: brightness(0.9);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }

      &.q-btn--loading {
        .q-spinner {
          color: white;
        }
      }

      &.q-btn--disable {
        opacity: 0.5;
        filter: grayscale(50%) brightness(0.7);
        box-shadow: none;
        cursor: not-allowed;

        &:hover {
          transform: none;
          box-shadow: none;
          filter: grayscale(50%) brightness(0.7);
        }
      }
    }

    // 新增：特定背景颜色类
    .lazer-bg-pink {
      background: #ff69b4;

      &:hover {
        background: #ff69b4;
      }

      &.q-btn--disable {
        background: #ff69b4 !important;
      }
    }

    .lazer-bg-purple {
      background: #aa79f5;

      &:hover {
        background: #aa79f5;
      }

      &.q-btn--disable {
        background: #aa79f5 !important;
      }
    }

    // 原有的 .q-btn 样式，现在主要作为其他按钮的默认或被覆盖
    .q-btn {
      // &.q-btn--outline 相关的样式可以保留，以备其他地方使用
      &.q-btn--outline {
        border-color: rgba(255, 105, 180, 0.7);
        color: rgba(255, 105, 180, 0.9);
        transition: all 0.2s ease-in-out;
        // 确保这里的 border-radius 不会覆盖 .lazer-action-btn 的设置
        // 如果需要，可以为这类按钮设置不同的 border-radius 或不设置
        border-radius: 6px;

        &:hover {
          background: rgba(255, 105, 180, 0.1);
          color: #ff69b4;
          border-color: #ff69b4;
        }
      }

      &.q-btn--unelevated {
        color: white;
        transition: all 0.2s ease-in-out;
        // 确保这里的 border-radius 不会覆盖 .lazer-action-btn 的设置
        border-radius: 6px;
      }
    }
  }

  .search-section {
    padding-bottom: 20px;

    // 强制横向布局，不响应屏幕大小变化
    .row {
      flex-wrap: nowrap !important;
    }

    .q-input,
    .q-select {
      :deep(.q-field__control) {
        background: #2a2a2e; // 更深的灰色背景
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #f0f0f0;
        transition: all 0.2s ease-in-out;

        &:hover {
          border-color: rgba(255, 105, 180, 0.5);
          background: #35353a; // 悬停时稍微亮一点的深灰色
        }
      }

      :deep(.q-field__native),
      :deep(.q-field__label),
      :deep(.q-select__display-value) {
        color: #c4c9d4; // 与 PlaylistPage 一致的文字颜色
      }

      :deep(.q-field__prepend .q-icon) {
        color: #8b92b8; // 与 PlaylistPage 一致的图标颜色
      }
    }

    .q-btn-toggle {
      border-radius: 6px;
      border: 1px solid rgba(255, 105, 180, 0.7);

      :deep(.q-btn) {
        background: transparent;
        color: rgba(255, 105, 180, 0.9);
        transition: background 0.2s ease-in-out;

        &.q-btn--active {
          background: rgba(255, 105, 180, 0.2);
          color: #ff69b4;
        }

        &:hover:not(.q-btn--active) {
          background: rgba(255, 105, 180, 0.1);
        }
      }
    }
  }

  .loading-section,
  .error-section,
  .empty-state {
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #8b92b8; // 与 PlaylistPage 一致的次要文字颜色

    .q-icon {
      font-size: 4rem;
      margin-bottom: 16px;
    }

    h5 {
      color: #c4c9d4; // 与 PlaylistPage 一致的主文字颜色
      font-weight: 600;
      margin-top: 8px;
      margin-bottom: 8px;
    }

    p {
      font-size: 0.95rem;
      max-width: 400px;
      line-height: 1.6;
    }

    .q-btn {
      margin-top: 20px;
      border-radius: 6px;
      text-transform: none;
      font-weight: 500;
      padding: 8px 20px;
      border-color: rgba(255, 105, 180, 0.7);
      color: rgba(255, 105, 180, 0.9);
      transition: all 0.2s ease-in-out;

      &:hover {
        background: rgba(255, 105, 180, 0.1);
        color: #ff69b4;
        border-color: #ff69b4;
      }
    }
  }

  .error-section {
    .q-icon {
      color: #ff69b4; // 错误状态使用 lazer 粉色
    }

    h5 {
      color: #ff69b4;
    }
  }

  .music-grid {
    .row {
      margin: 0 -10px; // 调整卡片间距
    }

    // MusicCard 样式将在其组件内部或通过 props 控制，此处确保容器适配
  }

  .music-list {
    max-height: calc(100vh - 420px); // 根据其他元素高度调整，确保滚动区域合理
    overflow-y: auto;
    padding-right: 6px; // 为滚动条留出空间

    &.show-scrollbar::-webkit-scrollbar {
      width: 8px;
    }

    &.show-scrollbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    &.show-scrollbar::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #ff69b4, #c77dff);
      border-radius: 4px;

      &:hover {
        background: linear-gradient(135deg, #c77dff, #ff69b4);
      }
    }

    .music-list-container {
      background: transparent; // 列表容器背景透明
      border: none; // 移除 Quasar 默认的深色列表分隔线，如果存在
    }

    .music-list-item {
      background: #2a2a2e; // 更深的灰色背景，与其他组件一致
      border: 1px solid rgba(196, 201, 212, 0.15); // 使用主文字颜色的透明边框
      border-radius: 6px;
      margin-bottom: 8px;
      padding: 10px 16px;
      transition: all 0.2s ease-in-out;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);

      &:hover {
        background: #35353a; // 悬停时稍微亮一点的深灰色
        border-color: rgba(255, 105, 180, 0.4);
        transform: translateY(-1px) scale(1.01);
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
      }

      .q-item__section--avatar .q-avatar {
        border-radius: 4px;
      }

      .q-item__label.text-white {
        color: #c4c9d4 !important; // 与 PlaylistPage 一致的标题颜色
        font-weight: 500;
      }

      .q-item__label--caption {
        color: #8b92b8 !important; // 与 PlaylistPage 一致的副标题颜色
      }

      .q-btn {
        color: #8b92b8; // 与 PlaylistPage 一致的按钮默认颜色

        &:hover {
          color: #ff69b4;
        }
      }

      .text-caption.text-grey-6 {
        color: #8b92b8 !important; // 与 PlaylistPage 一致的时长文本颜色
      }

      .q-item__section--side {
        .delete-btn {
          opacity: 0.7;
          transition: all 0.2s ease;

          &:hover {
            opacity: 1;
            color: #ff69b4 !important;
            transform: scale(1.1);
          }
        }
      }
    }
  }

  // 歌曲信息对话框样式
  :deep(.q-dialog) {
    .q-card {
      background-color: #2a2a2e; // 更深的灰色背景，与其他组件一致
      border: 1px solid rgba(196, 201, 212, 0.15); // 使用主文字颜色的透明边框
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      color: #c4c9d4; // 与 PlaylistPage 一致的文字颜色

      .q-card__section--title,
      .text-h6 {
        color: #c4c9d4; // 与 PlaylistPage 一致的标题颜色
        font-weight: 600;
        border-bottom: 1px solid rgba(196, 201, 212, 0.2); // 使用主文字颜色的透明分隔线
        padding-bottom: 12px;
      }

      .q-card__section {
        .text-subtitle1 {
          color: #c4c9d4; // 与 PlaylistPage 一致的主文字颜色
          font-weight: 500;
        }

        .text-body2 {
          color: #8b92b8; // 与 PlaylistPage 一致的次要文字颜色
        }

        .text-caption {
          color: #8b92b8; // 与 PlaylistPage 一致的说明文字颜色
        }

        .q-img {
          border-radius: 6px;
        }
      }

      .q-card__actions {
        border-top: 1px solid rgba(196, 201, 212, 0.2); // 使用主文字颜色的透明分隔线
        padding-top: 12px;
        background-color: rgba(0, 0, 0, 0.1);

        .q-btn--flat {
          color: #8b92b8; // 与 PlaylistPage 一致的按钮颜色

          &:hover {
            color: #c4c9d4;
            background-color: rgba(196, 201, 212, 0.1);
          }
        }

        .q-btn[color='primary'] {
          background: linear-gradient(135deg, #ff69b4, #c77dff);
          color: white;
          border-radius: 6px;
          font-weight: 500;

          &:hover {
            background: linear-gradient(135deg, #e65aa1, #b264e6);
          }
        }
      }
    }
  }

  // 新增：Lazer 风格药丸按钮通用样式
  .lazer-action-btn {
    border-radius: 9999px !important; // 使用非常大的值强制药丸形状，并用 !important 提高优先级
    text-transform: none;
    font-weight: 600;
    padding: 8px 22px; // 稍微调整 padding 以适应药丸形状
    color: white !important;
    transition: all 0.2s ease-in-out;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
    border: none;
    min-height: 40px; // 确保按钮有一定高度

    .q-icon {
      margin-right: 8px; // 稍微增大图标和文字间距
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.25);
      filter: brightness(1.1);
    }

    &:active {
      transform: translateY(0px);
      filter: brightness(0.9);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }

    &.q-btn--loading {
      .q-spinner {
        color: white;
      }
    }

    &.q-btn--disable {
      opacity: 0.5;
      filter: grayscale(50%) brightness(0.7);
      box-shadow: none;
      cursor: not-allowed;

      &:hover {
        transform: none;
        box-shadow: none;
        filter: grayscale(50%) brightness(0.7);
      }
    }
  }

  // 新增：特定背景颜色类
  .lazer-bg-pink {
    background: #ff69b4;

    &:hover {
      background: #ff69b4;
    }

    &.q-btn--disable {
      background: #ff69b4 !important;
    }
  }

  .lazer-bg-purple {
    background: #aa79f5;

    &:hover {
      background: #aa79f5;
    }

    &.q-btn--disable {
      background: #aa79f5 !important;
    }
  }

  // 原有的 .q-btn 样式，现在主要作为其他按钮的默认或被覆盖
  .q-btn {
    // &.q-btn--outline 相关的样式可以保留，以备其他地方使用
    &.q-btn--outline {
      border-color: rgba(255, 105, 180, 0.7);
      color: rgba(255, 105, 180, 0.9);
      transition: all 0.2s ease-in-out;
      // 确保这里的 border-radius 不会覆盖 .lazer-action-btn 的设置
      // 如果需要，可以为这类按钮设置不同的 border-radius 或不设置
      border-radius: 6px;

      &:hover {
        background: rgba(255, 105, 180, 0.1);
        color: #ff69b4;
        border-color: #ff69b4;
      }
    }

    // &.q-btn--unelevated 的特定样式如果不再需要，可以完全移除
    // 或者只保留不与 .lazer-action-btn 冲突的部分
    &.q-btn--unelevated {
      color: white;
      transition: all 0.2s ease-in-out;
      // 确保这里的 border-radius 不会覆盖 .lazer-action-btn 的设置
      border-radius: 6px;
    }
  }
}

// 菜单样式（用于列表视图的次级菜单）
:deep(.q-menu) {
  .q-list {
    background: #1a1a1a; // 更深的黑色背景
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 6px 0;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    min-width: 200px;
  }

  .q-item {
    color: #ffffff !important; // 强制白色文字
    border-radius: 8px;
    margin: 3px 8px;
    padding: 12px 16px;
    transition: all 0.25s ease;
    font-weight: 500;

    &:hover {
      background: rgba(255, 105, 180, 0.12) !important;
      color: #ff69b4 !important;
      transform: translateX(4px);
    }

    .q-icon {
      color: inherit !important;
      margin-right: 12px;
    }

    // 删除按钮特殊样式
    &.text-negative {
      color: #ff7675 !important;

      &:hover {
        background: rgba(255, 118, 117, 0.15) !important;
        color: #ff5757 !important;
      }

      .q-icon {
        color: #ff7675 !important;
      }
    }
  }

  .q-separator {
    background: rgba(255, 255, 255, 0.08);
    margin: 8px 12px;
    height: 1px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .all-music-page {
    padding: 16px; // 减少移动端的内边距

    .page-header {
      .title-section {
        .text-h4 {
          font-size: 1.8rem;
        }
      }

      .stats-cards {
        .row {
          margin: 0 -8px; // 减少卡片间距
        }

        .stat-card {
          margin-bottom: 12px; // 增加垂直间距
        }
      }
    }

    .actions-bar {
      .row {
        flex-direction: column;
        gap: 16px;
        text-align: center;

        .col-auto {
          width: 100%;
        }
      }
    }

    // 列表视图优化
    .music-list {
      max-height: calc(100vh - 320px); // 为移动端调整高度

      .music-list-item {
        padding: 12px 16px; // 增加触摸区域
        margin-bottom: 10px;

        .q-item__section--side {
          .row {
            gap: 8px; // 增加按钮间距

            .q-btn {
              min-width: 36px; // 确保按钮触摸区域足够大
              min-height: 36px;
            }
          }
        }
      }
    }
  }
}
</style>
