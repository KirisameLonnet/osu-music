<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    persistent
    class="add-to-playlist-dialog-component"
  >
    <q-card class="lazer-card">
      <!-- 头部 -->
      <q-card-section class="lazer-dialog-header row items-center q-pb-none">
        <div class="lazer-title-icon-wrapper">
          <q-icon name="playlist_add" class="lazer-title-icon" />
        </div>
        <div class="lazer-title-text">
          <div class="text-h6">Add to Playlist</div>
          <div class="text-caption text-lazer-secondary">Select playlists or create a new one</div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense @click="onDialogHide" class="lazer-close-btn" />
      </q-card-section>

      <!-- 歌曲信息 -->
      <q-card-section class="track-info-section">
        <div class="track-info-content row items-center no-wrap">
          <img :src="trackCoverUrl" class="track-thumbnail q-mr-md" @error="onCoverError" />
          <div class="track-details ellipsis">
            <div class="track-title ellipsis">{{ track.title }}</div>
            <div class="track-artist ellipsis text-lazer-secondary">
              {{ track.artist || 'Unknown Artist' }}
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator class="lazer-separator" />

      <!-- 播放列表选择 -->
      <q-card-section class="playlist-selection-section">
        <div class="text-subtitle1 q-mb-sm section-header">Your Playlists</div>
        <q-scroll-area style="height: 200px; max-width: 100%" class="lazer-scroll-area">
          <q-list v-if="customPlaylists.length > 0" class="playlist-list">
            <q-item
              v-for="playlist in customPlaylists"
              :key="playlist.id"
              clickable
              v-ripple
              @click="togglePlaylistSelection(playlist.id)"
              class="lazer-list-item"
              :class="{ 'lazer-list-item--selected': selectedPlaylists.includes(playlist.id) }"
            >
              <q-item-section avatar>
                <q-checkbox
                  :model-value="selectedPlaylists.includes(playlist.id)"
                  @update:model-value="togglePlaylistSelection(playlist.id)"
                  color="lazer-accent-pink"
                  class="lazer-checkbox"
                  dense
                />
              </q-item-section>
              <q-item-section>
                <q-item-label class="ellipsis">{{ playlist.name }}</q-item-label>
                <q-item-label caption class="text-lazer-secondary ellipsis">
                  {{ playlist.trackCount }} track{{ playlist.trackCount !== 1 ? 's' : '' }}
                </q-item-label>
              </q-item-section>
              <q-item-section side v-if="playlistContainsTrack(playlist.id)">
                <q-icon
                  name="check_circle"
                  :color="selectedPlaylists.includes(playlist.id) ? 'white' : 'positive'"
                  size="xs"
                >
                  <q-tooltip class="lazer-tooltip">Already in this playlist</q-tooltip>
                </q-icon>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else class="text-center text-lazer-secondary q-pa-md">
            No playlists found. Create one below!
          </div>
        </q-scroll-area>
      </q-card-section>

      <!-- 创建新播放列表 -->
      <q-card-section class="create-playlist-section">
        <q-expansion-item
          icon="add_circle_outline"
          label="Create New Playlist"
          class="lazer-expansion-item"
          header-class="lazer-expansion-header"
        >
          <div class="q-pt-md">
            <q-input
              v-model="newPlaylistName"
              label="Playlist Name"
              outlined
              dense
              class="lazer-input q-mb-sm"
              @keyup.enter="handleCreateAndAddToPlaylist"
              :rules="[(val) => !!val.trim() || 'Playlist name is required']"
            />
            <!-- 可选的描述输入框 -->
            <!--
            <q-input
              v-model="newPlaylistDescription"
              label="Description (Optional)"
              outlined
              dense
              type="textarea"
              rows="2"
              class="lazer-input q-mb-md"
            />
            -->
            <q-btn
              label="Create & Add Track"
              unelevated
              color="lazer-accent-pink"
              class="full-width lazer-btn lazer-btn--primary"
              :loading="isCreatingPlaylist"
              :disable="!newPlaylistName.trim()"
              @click="handleCreateAndAddToPlaylist"
            />
          </div>
        </q-expansion-item>
      </q-card-section>

      <q-separator class="lazer-separator" />

      <!-- 操作按钮 -->
      <q-card-actions class="lazer-dialog-actions justify-end">
        <q-btn flat label="Cancel" @click="onDialogHide" class="lazer-btn lazer-btn--flat" />
        <q-btn
          label="Add to Selected"
          unelevated
          color="lazer-accent-purple"
          class="lazer-btn lazer-btn--primary"
          :loading="isAddingToSelected"
          :disable="
            selectedPlaylists.length === 0 &&
            !(selectedPlaylists[0] && playlistContainsTrack(selectedPlaylists[0]))
          "
          @click="handleAddToSelectedPlaylists"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDialogPluginComponent, useQuasar, QSpinnerBall } from 'quasar';
import { usePlaylistStore, type PlaylistTrack } from 'src/stores/playlistStore';
import { type MusicTrack } from 'src/stores/musicStore';

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const $q = useQuasar();
const playlistStore = usePlaylistStore();

const props = defineProps<{
  track: MusicTrack;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const selectedPlaylists = ref<string[]>([]);
const newPlaylistName = ref('');
// const newPlaylistDescription = ref(''); // 如果添加描述输入框，取消此行注释

const isCreatingPlaylist = ref(false);
const isAddingToSelected = ref(false);

const customPlaylists = computed(() => playlistStore.customPlaylists.filter((p) => !p.isDefault)); // 通常不直接添加到 "Favorites"

const trackCoverUrl = computed(() => {
  if (props.track.coverUrl) return props.track.coverUrl;
  if (props.track.id && props.track.id !== 'unknown') {
    return `https://assets.ppy.sh/beatmaps/${props.track.id}/covers/card.jpg`;
  }
  return 'https://osu.ppy.sh/images/layout/beatmaps/default-bg.png';
});

const onCoverError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.src = 'https://osu.ppy.sh/images/layout/beatmaps/default-bg.png';
};

const convertToPlaylistTrack = (trackData: MusicTrack): Omit<PlaylistTrack, 'addedAt'> => {
  return {
    beatmapsetId: Number(trackData.id) || 0,
    title: trackData.title,
    artist: trackData.artist || 'Unknown Artist',
    duration: trackData.duration || 0,
    bpm: 120, // Default BPM since MusicTrack has no bpm property
  };
};

const playlistContainsTrack = (playlistId: string): boolean => {
  if (!playlistId) return false;
  const playlist = playlistStore.getPlaylistById(playlistId);
  return playlist?.tracks.some((t) => t.beatmapsetId === Number(props.track.id)) || false;
};

const togglePlaylistSelection = (playlistId: string) => {
  if (playlistContainsTrack(playlistId)) {
    return;
  }
  const index = selectedPlaylists.value.indexOf(playlistId);
  if (index > -1) {
    selectedPlaylists.value.splice(index, 1);
  } else {
    selectedPlaylists.value.push(playlistId);
  }
};

const showLoading = (message: string) => {
  if ($q.loading && typeof $q.loading.show === 'function') {
    $q.loading.show({
      spinner: QSpinnerBall,
      spinnerColor: 'lazer-accent-pink',
      messageColor: 'white',
      backgroundColor: 'rgba(0,0,0,0.7)',
      message,
    });
  } else if ($q.notify && typeof $q.notify === 'function') {
    // 降级方案：使用通知代替加载中
    $q.notify({ type: 'info', message });
  }
};

const hideLoading = () => {
  if ($q.loading && typeof $q.loading.hide === 'function') {
    $q.loading.hide();
  }
};

const handleCreateAndAddToPlaylist = async () => {
  if (!newPlaylistName.value.trim()) return;
  isCreatingPlaylist.value = true;
  showLoading('Creating playlist...');
  try {
    const newPlaylist = await playlistStore.createPlaylist(
      newPlaylistName.value.trim(),
      // newPlaylistDescription.value.trim() // 如果添加描述输入框
    );
    const playlistTrack = convertToPlaylistTrack(props.track);
    await playlistStore.addTrackToPlaylist(newPlaylist.id, playlistTrack);
    $q.notify({
      type: 'positive',
      message: `Track added to new playlist "${newPlaylist.name}"`,
      color: 'lazer-accent-purple',
      textColor: 'white',
      position: 'top',
    });
    newPlaylistName.value = '';
    // newPlaylistDescription.value = '';
    onDialogOK();
  } catch (error) {
    console.error('Error creating playlist and adding track:', error);
    $q.notify({ type: 'negative', message: 'Failed to create playlist', position: 'top' });
  } finally {
    isCreatingPlaylist.value = false;
    hideLoading();
  }
};

const handleAddToSelectedPlaylists = async () => {
  if (selectedPlaylists.value.length === 0) return;
  isAddingToSelected.value = true;
  showLoading('Adding to selected playlists...');
  try {
    const playlistTrack = convertToPlaylistTrack(props.track);
    let successCount = 0;
    for (const playlistId of selectedPlaylists.value) {
      if (!playlistContainsTrack(playlistId)) {
        // Double check, though toggle should prevent this
        try {
          await playlistStore.addTrackToPlaylist(playlistId, playlistTrack);
          successCount++;
        } catch (err) {
          console.error(`Failed to add to playlist ${playlistId}:`, err);
          // Optionally notify per-playlist failure
        }
      }
    }
    if (successCount > 0) {
      $q.notify({
        type: 'positive',
        message: `Track added to ${successCount} playlist${successCount > 1 ? 's' : ''}`,
        color: 'lazer-accent-purple',
        textColor: 'white',
        position: 'top',
      });
    } else if (selectedPlaylists.value.every((pid) => playlistContainsTrack(pid))) {
      $q.notify({
        type: 'info',
        message: `Track is already in all selected playlists.`,
        position: 'top',
      });
    }
    onDialogOK();
  } catch (error) {
    console.error('Error adding to selected playlists:', error);
    $q.notify({ type: 'negative', message: 'Failed to add tracks to playlists', position: 'top' });
  } finally {
    isAddingToSelected.value = false;
    hideLoading();
  }
};
</script>

<style lang="scss" scoped>
// --- Lazer-Inspired Variables (Inspired by AllMusicPage.vue & PlaylistCard.vue) ---
$lazer-bg-dialog: #212428;
$lazer-bg-element: #2c3034;
$lazer-bg-element-hover: #383c41;
$lazer-border-color: rgba(255, 255, 255, 0.1);
$lazer-text-primary: #e6e6e6;
$lazer-text-secondary: #9097a1;
$lazer-accent-pink: #ff69b4;
$lazer-accent-purple: #aa79f5;
$lazer-radius-dialog: 12px;
$lazer-radius-element: 6px;
$lazer-transition: all 0.2s ease-out;

.lazer-card {
  background: $lazer-bg-dialog;
  border: 1px solid $lazer-border-color;
  border-radius: $lazer-radius-dialog;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  color: $lazer-text-primary;
  min-width: 460px;
  max-width: 500px;
  backdrop-filter: blur(10px);
}

.lazer-dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid $lazer-border-color;

  .lazer-title-icon-wrapper {
    background: linear-gradient(135deg, $lazer-accent-pink, $lazer-accent-purple);
    border-radius: $lazer-radius-element;
    padding: 8px;
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;

    .lazer-title-icon {
      color: white;
      font-size: 20px;
    }
  }

  .lazer-title-text {
    .text-h6 {
      font-size: 1.1rem;
      font-weight: 600;
    }

    .text-caption {
      font-size: 0.8rem;
      color: $lazer-text-secondary;
    }
  }

  .lazer-close-btn {
    color: $lazer-text-secondary;

    &:hover {
      color: $lazer-text-primary;
      background: rgba(255, 255, 255, 0.05);
    }
  }
}

.track-info-section,
.playlist-selection-section,
.create-playlist-section {
  padding: 16px 20px;
}

.track-info-content {
  background-color: $lazer-bg-element;
  padding: 12px;
  border-radius: $lazer-radius-element;
  border: 1px solid rgba(255, 255, 255, 0.12); // 替代 darken() 函数

  .track-thumbnail {
    width: 48px;
    height: 48px;
    border-radius: $lazer-radius-element * 0.75;
    object-fit: cover;
  }

  .track-title {
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.3;
  }

  .track-artist {
    font-size: 0.8rem;
    line-height: 1.3;
    color: $lazer-text-secondary;
  }
}

.lazer-separator {
  background-color: $lazer-border-color;
  height: 1px;
  margin: 0 20px;
  opacity: 0.6;
}

.playlist-selection-section {
  .section-header {
    font-weight: 500;
    color: $lazer-text-primary;
    margin-bottom: 10px;
    font-size: 0.95rem;
  }

  .lazer-scroll-area {
    border: 1px solid $lazer-border-color;
    border-radius: $lazer-radius-element;
    background-color: rgba(0, 0, 0, 0.1);
  }
}

.playlist-list {
  .lazer-list-item {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: $lazer-transition;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: $lazer-bg-element-hover;
    }

    &.lazer-list-item--selected {
      background-color: rgba($lazer-accent-pink, 0.12);

      .q-item__label {
        color: $lazer-accent-pink;
        font-weight: 500;
      }
    }

    .q-item__label {
      font-size: 0.9rem;
    }

    .q-item__label--caption {
      font-size: 0.75rem;
      color: $lazer-text-secondary;
    }
  }
}

.lazer-checkbox {
  :deep(.q-checkbox__inner) {
    font-size: 48px;

    &:before {
      border-color: $lazer-text-secondary;
    }
  }
}

.create-playlist-section {
  padding-top: 12px;
}

.lazer-expansion-item {
  border: 1px solid $lazer-border-color;
  border-radius: $lazer-radius-element;
  background-color: $lazer-bg-element;
  margin-top: 8px;

  .lazer-expansion-header {
    padding: 10px 14px;
    font-weight: 500;
    font-size: 0.9rem;
    color: $lazer-text-primary;
    transition: $lazer-transition;

    &:hover {
      background-color: $lazer-bg-element-hover;
    }

    :deep(.q-item__section--avatar .q-icon) {
      color: $lazer-text-secondary;
      font-size: 1.2em;
      transition: $lazer-transition;
    }

    &.q-item--active :deep(.q-item__section--avatar .q-icon) {
      transform: rotate(180deg);
      color: $lazer-accent-pink;
    }
  }

  :deep(.q-expansion-item__content) {
    padding: 12px 14px 14px;
    border-top: 1px solid $lazer-border-color;
  }
}

.lazer-input {
  :deep(.q-field__control) {
    background: rgba(0, 0, 0, 0.15);
    border-radius: $lazer-radius-element * 0.75;

    &:before {
      border-color: $lazer-border-color;
    }

    &:after {
      border-color: $lazer-accent-pink;
    }
  }

  :deep(.q-field__label) {
    color: $lazer-text-secondary;
  }

  :deep(.q-field__native) {
    color: $lazer-text-primary;
  }
}

.lazer-btn {
  border-radius: $lazer-radius-element;
  font-weight: 500;
  padding: 6px 14px;
  text-transform: none;
  transition: $lazer-transition;
  font-size: 0.85rem;
  min-height: 38px;

  &.lazer-btn--primary {
    color: white;

    &:hover {
      filter: brightness(1.12);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
      filter: brightness(0.92);
    }

    &.q-btn--loading .q-spinner {
      color: white;
    }
  }

  &.lazer-btn--flat {
    color: $lazer-text-secondary;
    border: 1px solid transparent;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: $lazer-text-primary;
    }
  }
}

.lazer-dialog-actions {
  padding: 12px 20px;
  border-top: 1px solid $lazer-border-color;
  background: rgba(0, 0, 0, 0.05);
}

.text-lazer-secondary {
  color: $lazer-text-secondary;
}

.lazer-tooltip {
  background-color: #181a1d;
  color: $lazer-text-primary;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: $lazer-radius-element * 0.5;
}

.add-to-playlist-dialog-component {
  :deep(.q-dialog__inner > .lazer-card) {
    animation: dialogFadeIn 0.25s $lazer-transition;
  }
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(15px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (max-width: 500px) {
  .lazer-card {
    min-width: auto;
    margin: 16px;
  }

  .lazer-dialog-header,
  .track-info-section,
  .playlist-selection-section,
  .create-playlist-section,
  .lazer-dialog-actions {
    padding: 12px 16px;
  }

  .lazer-scroll-area {
    height: 150px !important;
  }

  .lazer-dialog-actions {
    .lazer-btn {
      width: 100%;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>
