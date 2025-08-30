<template>
  <q-page class="playlist-detail-page">
    <div v-if="loading" class="loading-container">
      <q-spinner-hourglass color="primary" size="3em" />
      <p class="q-mt-md">Loading playlist...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <q-icon name="error" color="negative" size="3em" />
      <h5>{{ error }}</h5>
      <q-btn @click="goBack" color="primary" label="Go Back" class="osu-btn" />
    </div>

    <div v-else-if="playlist" class="playlist-content">
      <!-- Playlist Header -->
      <div class="playlist-header q-mb-xl">
        <div
          class="header-background"
          :style="{ backgroundImage: `url(${playlistCoverUrl})` }"
        ></div>
        <div class="header-content">
          <div class="header-info">
            <div class="playlist-cover">
              <q-img
                :src="playlistCoverUrl"
                :alt="playlist.name"
                class="cover-image"
                loading="lazy"
                no-transition
                fit="cover"
              >
                <template v-slot:error>
                  <div class="cover-placeholder">
                    <q-icon name="library_music" size="4rem" color="grey-5" />
                  </div>
                </template>
              </q-img>
            </div>

            <div class="playlist-meta">
              <div class="playlist-type">PLAYLIST</div>
              <h1 class="playlist-title">{{ playlist.name }}</h1>
              <p v-if="playlist.description" class="playlist-description">
                {{ playlist.description }}
              </p>
              <div class="playlist-stats">
                <span class="stat-item">
                  <q-icon name="music_note" size="16px" />
                  {{ playlist.tracks?.length || 0 }} tracks
                </span>
                <span class="stat-item" v-if="playlist.createdAt">
                  <q-icon name="event" size="16px" />
                  {{ formatDate(playlist.createdAt) }}
                </span>
              </div>
              <div class="playlist-tags" v-if="playlist.tags?.length">
                <q-chip
                  v-for="tag in playlist.tags"
                  :key="tag"
                  color="primary"
                  text-color="white"
                  size="sm"
                  dense
                >
                  {{ tag }}
                </q-chip>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="header-actions">
            <q-btn
              @click="playPlaylist"
              color="primary"
              size="md"
              unelevated
              class="play-btn osu-btn"
              :disabled="!playlist.tracks?.length"
            >
              <q-icon name="play_arrow" size="18px" class="q-mr-sm" />
              Play
            </q-btn>
            <q-btn
              @click="shufflePlaylist"
              color="grey-7"
              size="md"
              outline
              class="action-btn osu-btn"
              :disabled="!playlist.tracks?.length"
            >
              <q-icon name="shuffle" size="16px" class="q-mr-sm" />
              Shuffle
            </q-btn>
            <q-btn
              @click="showEditDialog = true"
              color="grey-7"
              size="md"
              flat
              class="action-btn osu-btn-icon"
            >
              <q-icon name="edit" size="16px" />
            </q-btn>
            <q-btn
              @click="downloadPlaylist"
              color="grey-7"
              size="md"
              flat
              class="action-btn osu-btn-icon"
            >
              <q-icon name="download" size="16px" />
            </q-btn>
          </div>
        </div>
      </div>

      <!-- Track List -->
      <div class="tracks-section">
        <div class="tracks-header q-mb-md">
          <h6 class="q-my-none tracks-title">Tracks</h6>
          <q-space />
          <q-btn
            @click="addTracksToPlaylist"
            color="primary"
            outline
            size="sm"
            class="add-tracks-btn osu-btn"
            dense
          >
            <q-icon name="add" size="14px" class="q-mr-xs" />
            Add Tracks
          </q-btn>
          <q-btn-dropdown
            color="grey-6"
            flat
            size="sm"
            dropdown-icon="more_vert"
            class="q-ml-sm"
            dense
          >
            <q-list>
              <q-item clickable v-close-popup @click="sortTracks('title')">
                <q-item-section>
                  <q-item-label>Sort by Title</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="sortTracks('artist')">
                <q-item-section>
                  <q-item-label>Sort by Artist</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="sortTracks('duration')">
                <q-item-section>
                  <q-item-label>Sort by Duration</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="clearPlaylist">
                <q-item-section>
                  <q-item-label class="text-negative">Clear All Tracks</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>

        <div v-if="!playlist.tracks?.length" class="empty-tracks">
          <q-icon name="queue_music" size="4rem" color="grey-6" />
          <h6>No tracks in this playlist</h6>
          <p class="text-grey-6">Add some tracks to get started</p>
          <q-btn @click="addTracksToPlaylist" color="primary" outline class="q-mt-md osu-btn">
            <q-icon name="add" class="q-mr-sm" />
            Add Tracks
          </q-btn>
        </div>

        <div v-else class="tracks-list">
          <div class="tracks-list-header">
            <div class="track-index">#</div>
            <div class="track-title">Title</div>
            <div class="track-artist">Artist</div>
            <div class="track-album">Beatmap ID</div>
            <div class="track-actions"></div>
          </div>

          <div
            v-for="(track, index) in playlist.tracks"
            :key="track.beatmapsetId || index"
            class="track-item"
            @dblclick="playTrack(track)"
          >
            <div class="track-index">
              <span class="track-number">{{ index + 1 }}</span>
              <q-btn
                @click="playTrack(track)"
                flat
                round
                size="xs"
                class="play-overlay"
                color="primary"
              >
                <q-icon name="play_arrow" size="14px" />
              </q-btn>
            </div>
            <div class="track-title">
              <div class="track-name">{{ track.title || 'Unknown Title' }}</div>
            </div>
            <div class="track-artist">{{ track.artist || 'Unknown Artist' }}</div>
            <div class="track-album">{{ track.beatmapsetId || 'Unknown' }}</div>
            <div class="track-actions">
              <q-btn
                @click="removeTrackFromPlaylist(index)"
                flat
                round
                size="xs"
                color="negative"
                class="remove-track-btn"
              >
                <q-icon name="remove" size="14px" />
              </q-btn>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Playlist Dialog -->
    <q-dialog v-model="showEditDialog">
      <q-card class="lazer-card">
        <q-card-section class="lazer-dialog-header row items-center q-pb-none">
          <div class="lazer-title-icon-wrapper">
            <q-icon name="edit" class="lazer-title-icon" />
          </div>
          <div class="lazer-title-text">
            <div class="text-h6">Edit Playlist</div>
            <div class="text-caption text-lazer-secondary">Modify playlist details</div>
          </div>
          <q-space />
          <q-btn
            icon="close"
            flat
            round
            dense
            @click="showEditDialog = false"
            class="lazer-close-btn"
          />
        </q-card-section>

        <q-separator class="lazer-separator" />

        <q-card-section class="q-pt-md">
          <q-input
            v-model="editForm.name"
            label="Playlist Name"
            outlined
            dark
            dense
            class="q-mb-md lazer-input"
            label-color="white"
            color="primary"
          />
          <q-input
            v-model="editForm.description"
            label="Description"
            type="textarea"
            outlined
            dark
            dense
            rows="3"
            class="q-mb-md lazer-input"
            label-color="white"
            color="primary"
          />
          <q-input
            v-model="tagsInput"
            label="Tags (comma separated)"
            outlined
            dark
            dense
            hint="e.g. rock, pop, favorites"
            class="lazer-input"
            label-color="white"
            color="primary"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            flat
            label="Cancel"
            color="grey-6"
            @click="showEditDialog = false"
            class="osu-btn cancel-btn"
          />
          <q-btn
            @click="savePlaylistChanges"
            label="Save"
            color="primary"
            unelevated
            class="osu-btn q-ml-sm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { usePlaylistStore, type Playlist, type PlaylistTrack } from 'src/stores/playlistStore';
import { useMusicStore, type MusicTrack } from 'src/stores/musicStore';

// Define a type alias for better readability
type Track = PlaylistTrack;

// Props from route
const props = defineProps<{
  id: string;
}>();

// Composables
const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const playlistStore = usePlaylistStore();
const musicStore = useMusicStore();

// Reactive data
const loading = ref(false);
const error = ref('');
const playlist = ref<Playlist | null>(null);
const showEditDialog = ref(false);
const editForm = ref({
  name: '',
  description: '',
});
const tagsInput = ref('');

// Computed
const playlistCoverUrl = computed(() => {
  // 使用第一首歌的封面作为播放列表封面
  if (playlist.value?.tracks?.length) {
    const firstTrack = playlist.value.tracks[0];
    if (firstTrack?.beatmapsetId) {
      return `https://assets.ppy.sh/beatmaps/${firstTrack.beatmapsetId}/covers/cover@2x.jpg`;
    }
  }
  return '';
});

// Methods
const loadPlaylist = async () => {
  loading.value = true;
  error.value = '';

  try {
    const playlistId = props.id || (route.params.id as string);

    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    // Load playlist from store
    const foundPlaylist = playlistStore.playlists.find((p) => p.id === playlistId);

    if (!foundPlaylist) {
      throw new Error(`Playlist with ID "${playlistId}" not found`);
    }

    playlist.value = foundPlaylist;

    // Set edit form values
    editForm.value = {
      name: foundPlaylist.name,
      description: foundPlaylist.description || '',
    };
    tagsInput.value = foundPlaylist.tags?.join(', ') || '';
  } catch (err) {
    console.error('Error loading playlist:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load playlist';
  } finally {
    loading.value = false;
  }
};

const playPlaylist = () => {
  if (!playlist.value?.tracks?.length) return;

  // 使用增强的 findTrackByBeatmapsetId 方法查找实际音频文件
  const musicTracks: MusicTrack[] = playlist.value.tracks
    .map((track) => musicStore.findTrackByBeatmapsetId(track.beatmapsetId))
    .filter((track) => track !== null) as MusicTrack[];

  if (musicTracks.length === 0) {
    $q.notify({
      message: 'No audio files found for this playlist',
      icon: 'warning',
      color: 'warning',
    });
    return;
  }

  // 清空播放队列并加载新的播放列表
  musicStore.setPlayQueue(musicTracks, 0);

  // 开始播放第一首歌
  if (musicTracks[0]) {
    musicStore.playTrack(musicTracks[0]);
  }

  $q.notify({
    message: `Playing "${playlist.value.name}" (${musicTracks.length} tracks found)`,
    icon: 'play_arrow',
    color: 'positive',
  });
};

const shufflePlaylist = () => {
  if (!playlist.value?.tracks?.length) return;

  // 使用增强的 findTrackByBeatmapsetId 方法查找实际音频文件
  const musicTracks: MusicTrack[] = playlist.value.tracks
    .map((track) => musicStore.findTrackByBeatmapsetId(track.beatmapsetId))
    .filter((track) => track !== null) as MusicTrack[];

  if (musicTracks.length === 0) {
    $q.notify({
      message: 'No audio files found for this playlist',
      icon: 'warning',
      color: 'warning',
    });
    return;
  }

  // 设置播放队列并启用随机模式
  musicStore.setPlayQueue(musicTracks, 0);
  musicStore.shuffleMode = 'on';
  musicStore.shuffleQueue();

  // 开始播放第一首歌（已被随机打乱）
  if (musicStore.playQueue[0]) {
    musicStore.playTrack(musicStore.playQueue[0]);
  }

  $q.notify({
    message: `Shuffling "${playlist.value.name}" (${musicTracks.length} tracks found)`,
    icon: 'shuffle',
    color: 'secondary',
  });
};

const playTrack = (track: Track) => {
  if (!playlist.value) return;
  // 查找该 track 对应的实际 MusicTrack
  const musicTrack = musicStore.findTrackByBeatmapsetId(track.beatmapsetId);
  if (!musicTrack) {
    $q.notify({ message: 'Audio file not found', icon: 'warning', color: 'warning' });
    return;
  }
  // 如果当前队列已经是此歌单的曲目集合，则仅替换当前索引
  const inQueueIndex = musicStore.playQueue.findIndex((t) => t.id === musicTrack.id);
  if (inQueueIndex !== -1) {
    musicStore.currentQueueIndex = inQueueIndex;
    musicStore.playTrack(musicTrack);
  } else {
    // 否则仍按原逻辑构建（过滤某些缺失音频的情况）
    const musicTracks: MusicTrack[] = playlist.value.tracks
      .map((t) => musicStore.findTrackByBeatmapsetId(t.beatmapsetId))
      .filter((t) => t !== null) as MusicTrack[];
    const originalTrackIndex = playlist.value.tracks.findIndex(
      (t) => t.beatmapsetId === track.beatmapsetId,
    );
    let trackIndex = 0;
    if (originalTrackIndex >= 0) {
      const tracksBeforeTarget = playlist.value.tracks.slice(0, originalTrackIndex);
      trackIndex = tracksBeforeTarget.filter(
        (t) => musicStore.findTrackByBeatmapsetId(t.beatmapsetId) !== null,
      ).length;
    }
    musicStore.setPlayQueue(musicTracks, trackIndex);
    const candidate = musicTracks[trackIndex];
    if (candidate !== undefined) {
      // candidate 经过显式判空后被收窄为 MusicTrack
      musicStore.playTrack(candidate);
    }
  }
  $q.notify({ message: `Playing "${track.title}"`, icon: 'play_arrow', color: 'positive' });
};

const addTracksToPlaylist = () => {
  // TODO: Implement add tracks functionality
  $q.notify({
    message: 'Add tracks feature coming soon',
    icon: 'add',
    color: 'info',
  });
};

const removeTrackFromPlaylist = async (trackIndex: number) => {
  if (!playlist.value) return;

  try {
    const updatedTracks = [...playlist.value.tracks];
    const removedTrack = updatedTracks.splice(trackIndex, 1)[0];

    if (!removedTrack) {
      $q.notify({
        message: 'Track not found',
        icon: 'error',
        color: 'negative',
      });
      return;
    }

    await playlistStore.updatePlaylist(playlist.value.id, {
      tracks: updatedTracks,
    });

    playlist.value.tracks = updatedTracks;

    $q.notify({
      message: `Removed "${removedTrack.title}" from playlist`,
      icon: 'remove',
      color: 'positive',
    });
  } catch (err) {
    console.error('Error removing track:', err);
    $q.notify({
      message: 'Failed to remove track',
      icon: 'error',
      color: 'negative',
    });
  }
};

const clearPlaylist = async () => {
  if (!playlist.value) return;

  try {
    await $q.dialog({
      title: 'Clear Playlist',
      message: 'Are you sure you want to remove all tracks from this playlist?',
      cancel: true,
      persistent: true,
    });

    await playlistStore.updatePlaylist(playlist.value.id, {
      tracks: [],
    });

    playlist.value.tracks = [];

    $q.notify({
      message: 'All tracks removed from playlist',
      icon: 'clear',
      color: 'positive',
    });
  } catch (err) {
    // User cancelled or error occurred
    if (err !== false) {
      console.error('Error clearing playlist:', err);
      $q.notify({
        message: 'Failed to clear playlist',
        icon: 'error',
        color: 'negative',
      });
    }
  }
};

const sortTracks = (sortBy: 'title' | 'artist' | 'duration') => {
  if (!playlist.value?.tracks?.length) return;

  const sortedTracks = [...playlist.value.tracks].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      case 'artist':
        return (a.artist || '').localeCompare(b.artist || '');
      case 'duration':
        return (a.duration || 0) - (b.duration || 0);
      default:
        return 0;
    }
  });

  playlist.value.tracks = sortedTracks;

  $q.notify({
    message: `Sorted by ${sortBy}`,
    icon: 'sort',
    color: 'positive',
  });
};

const savePlaylistChanges = async () => {
  if (!playlist.value) return;

  try {
    const tags = tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    await playlistStore.updatePlaylist(playlist.value.id, {
      name: editForm.value.name,
      description: editForm.value.description,
      tags,
    });

    // Update local playlist data
    playlist.value.name = editForm.value.name;
    playlist.value.description = editForm.value.description;
    playlist.value.tags = tags;

    showEditDialog.value = false;

    $q.notify({
      message: 'Playlist updated successfully',
      icon: 'check',
      color: 'positive',
    });
  } catch (err) {
    console.error('Error updating playlist:', err);
    $q.notify({
      message: 'Failed to update playlist',
      icon: 'error',
      color: 'negative',
    });
  }
};

const downloadPlaylist = () => {
  if (!playlist.value) return;

  // TODO: Implement download playlist functionality
  $q.notify({
    message: 'Download feature coming soon',
    icon: 'download',
    color: 'info',
  });
};

const goBack = () => {
  router.go(-1);
};

const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString();
};

// Watchers
watch(() => props.id, loadPlaylist, { immediate: true });

// Lifecycle
onMounted(() => {
  if (!props.id && route.params.id) {
    loadPlaylist();
  }
});
</script>

<style scoped lang="scss">
.playlist-detail-page {
  padding: 0;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  min-height: 100vh;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  text-align: center;
  gap: 1rem;

  p,
  h5 {
    color: #e8e8f0;
    font-weight: 600;
  }

  p {
    font-size: 0.95rem;
  }

  h5 {
    margin: 0;
    font-size: 1.1rem;
  }

  .q-btn {
    margin-top: 0.5rem;
    font-weight: 600;
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
  }
}

.playlist-header {
  position: relative;
  padding: 3rem 2rem 2rem;
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border-radius: 0 0 24px 24px;
  overflow: hidden;

  .header-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-size: cover;
    background-position: center;
    filter: blur(30px) brightness(0.2) saturate(1.2);
    z-index: 0;
  }

  .header-content {
    position: relative;
    z-index: 1;
  }

  .header-info {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;

    @media (max-width: 768px) {
      flex-direction: column;
      gap: 1rem;
    }
  }

  .playlist-cover {
    .cover-image {
      width: 200px;
      height: 200px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

      @media (max-width: 768px) {
        width: 150px;
        height: 150px;
      }
    }

    .cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.08) 0%,
        rgba(255, 255, 255, 0.03) 100%
      );
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  }

  .playlist-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;

    .playlist-type {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #8b92b8;
      margin-bottom: 0.25rem;
      letter-spacing: 0.1em;
    }

    .playlist-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.75rem 0;
      line-height: 1.1;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);

      @media (max-width: 768px) {
        font-size: 1.8rem;
      }
    }

    .playlist-description {
      font-size: 0.95rem;
      color: #c4c9d4;
      margin-bottom: 1rem;
      line-height: 1.4;
    }

    .playlist-stats {
      display: flex;
      gap: 1.25rem;
      margin-bottom: 1rem;

      @media (max-width: 768px) {
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: #c4c9d4;
        font-size: 0.85rem;
        font-weight: 500;

        .q-icon {
          opacity: 0.9;
          color: #8b92b8;
        }
      }
    }

    .playlist-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    @media (max-width: 768px) {
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .play-btn {
      min-width: 100px;
      padding: 0.6rem 1.5rem;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .action-btn {
      min-width: 44px;
      padding: 0.5rem 0.75rem;

      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
    }

    // osu 风格按钮样式
    .osu-btn {
      border-radius: 25px !important; // osu 风格的椭圆形按钮
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 64, 129, 0.3);
      }
    }

    .osu-btn-icon {
      border-radius: 50% !important; // 图标按钮保持圆形
      width: 44px;
      height: 44px;

      &:hover {
        transform: translateY(-1px);
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
    }
  }
}

.tracks-section {
  padding: 1.5rem 2rem 2rem;

  .tracks-header {
    display: flex;
    align-items: center;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(139, 146, 184, 0.15);

    .tracks-title {
      color: #ffffff;
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
    }

    .add-tracks-btn {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;

      &.osu-btn {
        border-radius: 20px !important;
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(255, 64, 129, 0.2);
        }
      }
    }
  }

  .empty-tracks {
    text-align: center;
    padding: 3rem 2rem;
    color: #8b92b8;

    h6 {
      margin: 1rem 0 0.5rem 0;
      color: #c4c9d4;
      font-weight: 600;
    }

    p {
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
  }

  .tracks-list-header {
    display: grid;
    grid-template-columns: 3rem 1fr 200px 200px 60px;
    gap: 1rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.75rem;
    font-weight: 600;
    color: #8b92b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    @media (max-width: 1024px) {
      grid-template-columns: 3rem 1fr 150px 60px;

      .track-album {
        display: none;
      }
    }

    @media (max-width: 768px) {
      grid-template-columns: 3rem 1fr 60px;

      .track-artist {
        display: none;
      }
    }
  }

  .track-item {
    display: grid;
    grid-template-columns: 3rem 1fr 200px 200px 60px;
    gap: 1rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    transition: all 0.2s ease;
    color: #c4c9d4;
    cursor: pointer;

    @media (max-width: 1024px) {
      grid-template-columns: 3rem 1fr 150px 60px;

      .track-album {
        display: none;
      }
    }

    @media (max-width: 768px) {
      grid-template-columns: 3rem 1fr 60px;

      .track-artist {
        display: none;
      }
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
      transform: translateY(-1px);

      .track-number {
        opacity: 0;
      }

      .play-overlay {
        opacity: 1;
      }

      .track-actions {
        opacity: 1;
      }
    }

    .track-index {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;

      .track-number {
        transition: opacity 0.15s ease;
        font-size: 0.85rem;
        font-weight: 500;
        color: #8b92b8;
      }

      .play-overlay {
        position: absolute;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
    }

    .track-title {
      .track-name {
        font-weight: 600;
        color: #ffffff;
        font-size: 0.9rem;
      }
    }

    .track-artist,
    .track-album {
      display: flex;
      align-items: center;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .track-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.15s ease;

      .remove-track-btn {
        &:hover {
          background-color: rgba(244, 67, 54, 0.1);
        }
      }
    }
  }
}

// Lazer 风格的对话框样式
.lazer-card {
  background: rgba(22, 33, 62, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: #ffffff;
  min-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);

  @media (max-width: 768px) {
    min-width: 90vw;
  }
}

.lazer-dialog-header {
  padding: 1.5rem 1.5rem 1rem;

  .lazer-title-icon-wrapper {
    margin-right: 1rem;

    .lazer-title-icon {
      font-size: 1.5rem;
      color: $primary;
    }
  }

  .lazer-title-text {
    .text-h6 {
      color: #ffffff;
      font-weight: 700;
      margin: 0;
    }

    .text-lazer-secondary {
      color: rgba(196, 201, 212, 0.7);
      font-size: 0.8rem;
    }
  }
  .lazer-close-btn {
    color: rgba(196, 201, 212, 0.8);

    &:hover {
      background-color: rgba(255, 255, 255, 0.08);
    }
  }
}

.lazer-separator {
  background-color: rgba(139, 146, 184, 0.2);
}

.lazer-input {
  .q-field__control {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);

    &:hover {
      border-color: rgba(255, 255, 255, 0.3);
    }
  }

  .q-field__label {
    color: rgba(196, 201, 212, 0.8) !important;
  }

  .q-field__native,
  .q-field__input,
  input,
  textarea {
    color: #ffffff !important;
  }

  .q-field__bottom {
    color: rgba(196, 201, 212, 0.6);
  }

  // 确保提示文本颜色正确
  .q-field__messages {
    color: rgba(196, 201, 212, 0.6) !important;
  }

  &.q-field--focused {
    .q-field__label {
      color: $primary !important;
    }

    .q-field__control {
      border-color: $primary;
    }
  }
  &.q-field--dark {
    .q-field__label {
      color: rgba(196, 201, 212, 0.8) !important;
    }

    .q-field__native,
    .q-field__input,
    input,
    textarea {
      color: #ffffff !important;
    }

    // 确保dark模式下的文本颜色
    .q-field__bottom {
      color: rgba(196, 201, 212, 0.6) !important;
    }

    // 占位符颜色
    ::placeholder {
      color: rgba(196, 201, 212, 0.5) !important;
    }
  }
}

// 全局 osu 风格按钮样式
.osu-btn {
  border-radius: 25px !important;
  transition: all 0.2s ease;
  font-weight: 600 !important;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 64, 129, 0.3);
  }

  &:active {
    transform: translateY(0px);
  }

  &.q-btn--outline {
    border-width: 2px;
  }

  // Cancel 按钮特殊样式 - 去除粉色阴影
  &.cancel-btn {
    &:hover {
      box-shadow: 0 4px 12px rgba(139, 146, 184, 0.2);
    }
  }
}

.osu-btn-icon {
  border-radius: 50% !important;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  &:active {
    transform: translateY(0px);
  }
}

// 让空状态下的按钮也应用 osu 风格
.empty-tracks .osu-btn {
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
}
</style>
