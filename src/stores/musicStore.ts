import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { audioService } from 'src/services/business/audioService';
import { MusicService } from 'src/services/business/musicService';

export interface MusicTrack {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  duration?: number | undefined; // 可选
  artist?: string;
  album?: string;
  coverUrl?: string;
  addedDate: string;
}

// 播放模式类型
type ShuffleMode = 'off' | 'on';
type RepeatMode = 'off' | 'one' | 'all';

// 歌单类型
type Playlist = {
  id: string;
  name: string;
  tracks: MusicTrack[];
};

export const useMusicStore = defineStore('music', () => {
  // 状态
  const tracks = ref<MusicTrack[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentTrack = ref<MusicTrack | null>(null);
  const isPlaying = ref(false);

  // 新增状态
  const shuffleMode = ref<ShuffleMode>('off');
  const repeatMode = ref<RepeatMode>('off');
  const currentPlaylist = ref<Playlist | null>(null);
  const volume = ref(0.5); // 0~1 (默认50%)
  const seek = ref(0); // 秒
  const currentTime = ref(0); // 当前播放时间（秒）
  const duration = ref(0); // 音频总时长（秒）

  // 播放队列相关状态
  const playQueue = ref<MusicTrack[]>([]);
  const currentQueueIndex = ref(0);
  const originalQueue = ref<MusicTrack[]>([]); // 保存原始队列用于随机模式切换

  // 创建音乐服务实例 - 负责跨平台的音乐文件管理
  const musicService = new MusicService();

  // 初始化音频服务事件监听
  const initAudioEvents = () => {
    audioService.on('play', () => {
      isPlaying.value = true;
    });

    audioService.on('pause', () => {
      isPlaying.value = false;
    });

    audioService.on('ended', () => {
      isPlaying.value = false;
      // 处理播放结束逻辑
      if (repeatMode.value === 'one') {
        // 单曲循环
        if (currentTrack.value) {
          playTrack(currentTrack.value);
        }
      } else {
        // 播放下一曲
        nextTrack();
      }
    });

    audioService.on('timeupdate', (time: number) => {
      currentTime.value = time;
    });

    audioService.on('durationchange', (dur: number) => {
      duration.value = dur;
    });

    audioService.on('error', (error: Error) => {
      console.error('Audio playback error:', error);
      isPlaying.value = false;
      // 可以在这里添加错误处理，比如显示通知
    });
  };

  // 初始化事件监听
  initAudioEvents();

  // 计算属性
  const totalTracks = computed(() => tracks.value.length);
  const totalDurationMinutes = computed(() => {
    const totalSeconds = tracks.value.reduce((total, track) => {
      return total + (track.duration || 0);
    }, 0);
    return Math.round(totalSeconds / 60);
  });

  // 按标题排序的曲目
  const tracksSorted = computed(() => {
    return [...tracks.value].sort((a, b) => a.title.localeCompare(b.title));
  });

  // 最近添加的曲目
  const recentTracks = computed(() => {
    return [...tracks.value]
      .sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime())
      .slice(0, 20);
  });

  // 扫描音乐文件 - 使用统一的 musicService 接口（支持 Electron & Capacitor）
  const scanMusicFiles = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[MusicStore] Starting music scan using musicService...');

      // 使用 musicService 进行音乐库同步（内部处理平台差异）
      await musicService.syncMusicLibrary();

      // 从 musicService 获取音乐库
      const musicTracks = await musicService.getMusicLibrary();
      console.log(`[MusicStore] Found ${musicTracks.length} tracks from musicService`);

      // 转换为 MusicStore 的 MusicTrack 格式
      const scannedTracks: MusicTrack[] = musicTracks.map((track) => ({
        id: track.id,
        title: track.title,
        fileName: track.filePath.split('/').pop() || track.title,
        filePath: track.filePath,
        duration: track.duration,
        artist: track.artist || 'Unknown Artist',
        album: 'Unknown Album',
        coverUrl: track.coverUrl || generateOsuCoverUrl(track.id),
        addedDate: new Date().toISOString(),
      }));

      tracks.value = scannedTracks;
      console.log(`[MusicStore] Successfully loaded ${scannedTracks.length} tracks`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to scan music files';
      console.error('[MusicStore] Music scan error:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // 播放曲目
  const playTrack = async (track: MusicTrack) => {
    try {
      currentTrack.value = track;
      await audioService.loadTrack(track);
      await audioService.play();
      isPlaying.value = true;
      console.log('Playing track:', track.title);
    } catch (error) {
      console.error('Failed to play track:', error);
      isPlaying.value = false;
    }
  };

  // 播放
  const play = async () => {
    try {
      if (currentTrack.value) {
        // 如果已有当前曲目，直接播放
        if (audioService.getCurrentTrack()?.id === currentTrack.value.id) {
          await audioService.play();
        } else {
          await audioService.loadTrack(currentTrack.value);
          await audioService.play();
        }
        isPlaying.value = true;
      } else if (tracks.value.length > 0) {
        // 如果没有当前曲目，播放第一首
        currentTrack.value = tracks.value[0] || null;
        if (currentTrack.value) {
          await audioService.loadTrack(currentTrack.value);
          await audioService.play();
          isPlaying.value = true;
        }
      }
    } catch (error) {
      console.error('Failed to play:', error);
      isPlaying.value = false;
    }
  };

  // 暂停播放
  const pauseTrack = () => {
    audioService.pause();
    isPlaying.value = false;
  };

  // 暂停
  const pause = () => {
    audioService.pause();
    isPlaying.value = false;
  };

  // 停止播放
  const stopTrack = () => {
    audioService.stop();
    currentTrack.value = null;
    isPlaying.value = false;
  };

  // 上一曲
  const previousTrack = async () => {
    if (playQueue.value.length === 0) return;

    if (currentQueueIndex.value > 0) {
      currentQueueIndex.value--;
      const track = playQueue.value[currentQueueIndex.value];
      if (track) {
        await playTrack(track);
      }
    }
  };

  // 下一曲
  const nextTrack = async () => {
    if (playQueue.value.length === 0) return;

    if (currentQueueIndex.value < playQueue.value.length - 1) {
      currentQueueIndex.value++;
      const track = playQueue.value[currentQueueIndex.value];
      if (track) {
        await playTrack(track);
      }
    } else if (repeatMode.value === 'all') {
      // 重复播放整个列表
      currentQueueIndex.value = 0;
      const firstTrack = playQueue.value[0];
      if (firstTrack) {
        await playTrack(firstTrack);
      }
    }
  };

  // 切换随机模式
  const toggleShuffle = () => {
    shuffleMode.value = shuffleMode.value === 'off' ? 'on' : 'off';

    if (shuffleMode.value === 'on') {
      shuffleQueue();
    } else {
      restoreOriginalQueue();
    }
  };

  // 切换重复模式
  const toggleRepeat = () => {
    if (repeatMode.value === 'off') repeatMode.value = 'all';
    else if (repeatMode.value === 'all') repeatMode.value = 'one';
    else repeatMode.value = 'off';
  };

  // 跳转到指定时间
  const seekTo = (value: number) => {
    seek.value = value;
    audioService.seekTo(value);
  };

  // 设置音量
  const setVolume = (value: number) => {
    volume.value = Math.max(0, Math.min(1, value));
    audioService.setVolume(volume.value);
  };

  // 设置当前歌单
  const setCurrentPlaylist = (playlist: Playlist) => {
    currentPlaylist.value = playlist;
    if (playlist.tracks.length > 0) {
      currentTrack.value = playlist.tracks[0] || null;
      isPlaying.value = true;
    }
  };

  // 播放队列管理方法
  const setPlayQueue = (tracks: MusicTrack[], startIndex = 0) => {
    playQueue.value = [...tracks];
    originalQueue.value = [...tracks];
    currentQueueIndex.value = startIndex;

    if (tracks.length > 0 && tracks[startIndex]) {
      currentTrack.value = tracks[startIndex];
    }
  };

  const clearPlayQueue = () => {
    playQueue.value = [];
    originalQueue.value = [];
    currentQueueIndex.value = 0;
    currentTrack.value = null;
    isPlaying.value = false;
  };

  const addToQueue = (track: MusicTrack) => {
    playQueue.value.push(track);
    originalQueue.value.push(track);
  };

  const addToQueueNext = (track: MusicTrack) => {
    const insertIndex = currentQueueIndex.value + 1;
    playQueue.value.splice(insertIndex, 0, track);
    originalQueue.value.splice(insertIndex, 0, track);
  };

  const removeFromQueue = (index: number) => {
    if (index < 0 || index >= playQueue.value.length) return;

    playQueue.value.splice(index, 1);
    originalQueue.value.splice(index, 1);

    // 调整当前播放索引
    if (index < currentQueueIndex.value) {
      currentQueueIndex.value--;
    } else if (index === currentQueueIndex.value) {
      // 如果删除的是当前播放的歌曲
      if (playQueue.value.length === 0) {
        clearPlayQueue();
      } else {
        // 播放下一首，如果没有下一首则播放第一首
        currentQueueIndex.value = Math.min(currentQueueIndex.value, playQueue.value.length - 1);
        currentTrack.value = playQueue.value[currentQueueIndex.value] || null;
      }
    }
  };

  const shuffleQueue = () => {
    if (playQueue.value.length <= 1) return;

    const currentTrackData = currentTrack.value;
    const shuffledTracks = [...playQueue.value];

    // Fisher-Yates 洗牌算法
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffledTracks[i];
      if (temp && shuffledTracks[j]) {
        shuffledTracks[i] = shuffledTracks[j];
        shuffledTracks[j] = temp;
      }
    }

    playQueue.value = shuffledTracks;

    // 更新当前播放索引
    if (currentTrackData) {
      currentQueueIndex.value = playQueue.value.findIndex((t) => t.id === currentTrackData.id);
    }
  };

  const restoreOriginalQueue = () => {
    playQueue.value = [...originalQueue.value];

    // 更新当前播放索引
    if (currentTrack.value) {
      currentQueueIndex.value = playQueue.value.findIndex((t) => t.id === currentTrack.value?.id);
    }
  };

  // 播放队列中的指定歌曲
  const playFromQueue = async (index: number) => {
    if (index < 0 || index >= playQueue.value.length) return;

    currentQueueIndex.value = index;
    const track = playQueue.value[index];
    if (track) {
      await playTrack(track);
    }
  };

  // 搜索曲目
  const searchTracks = (query: string) => {
    if (!query.trim()) return tracks.value;

    const lowercaseQuery = query.toLowerCase();
    return tracks.value.filter(
      (track) =>
        track.title.toLowerCase().includes(lowercaseQuery) ||
        track.artist?.toLowerCase().includes(lowercaseQuery) ||
        track.album?.toLowerCase().includes(lowercaseQuery),
    );
  };

  // 添加新的音轨到库中
  const addTracks = (newTracks: MusicTrack[]) => {
    // 过滤重复的音轨（基于 ID）
    const existingIds = new Set(tracks.value.map((track) => track.id));
    const uniqueNewTracks = newTracks.filter((track) => !existingIds.has(track.id));

    if (uniqueNewTracks.length > 0) {
      tracks.value.push(...uniqueNewTracks);
      console.log(`Added ${uniqueNewTracks.length} new tracks to library`);
    }
  };

  // 根据 ID 移除音轨
  const removeTrack = (trackId: string) => {
    const index = tracks.value.findIndex((track) => track.id === trackId);
    if (index > -1) {
      tracks.value.splice(index, 1);
      console.log(`Removed track with ID: ${trackId}`);
    }
  };

  // 删除音乐文件（支持 Electron & Capacitor） - 使用统一的 musicService 接口
  const deleteTrackFile = async (
    track: MusicTrack,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`[MusicStore] Deleting track: ${track.title}`);

      // 使用 musicService 删除文件（内部处理平台差异和库更新）
      await musicService.deleteMusicFile(track.filePath);

      // 从本地状态中移除
      removeTrack(track.id);

      // 如果正在播放这首歌，停止播放
      if (currentTrack.value?.id === track.id) {
        stopTrack();
      }

      // 从播放队列中移除
      const queueIndex = playQueue.value.findIndex((t) => t.id === track.id);
      if (queueIndex > -1) {
        removeFromQueue(queueIndex);
      }

      console.log(`[MusicStore] Successfully deleted track: ${track.title}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete track';
      console.error('[MusicStore] Error deleting track:', error);
      return { success: false, error: errorMessage };
    }
  };

  // 根据 beatmapsetId 查找实际的音频文件
  const findTrackByBeatmapsetId = (beatmapsetId: number): MusicTrack | null => {
    console.log(`[findTrackByBeatmapsetId] Searching for beatmapsetId: ${beatmapsetId}`);
    console.log(`[findTrackByBeatmapsetId] Available tracks count: ${tracks.value.length}`);

    // 打印前几个 track 的信息用于调试
    if (tracks.value.length > 0) {
      console.log(
        '[findTrackByBeatmapsetId] Sample tracks:',
        tracks.value.slice(0, 3).map((t) => ({
          id: t.id,
          fileName: t.fileName,
          filePath: t.filePath,
        })),
      );
    }

    // 首先尝试精确匹配 beatmapsetId
    const exactMatch = tracks.value.find((track) => track.id === beatmapsetId.toString());
    if (exactMatch) {
      console.log(`[findTrackByBeatmapsetId] Found exact match:`, exactMatch.fileName);
      return exactMatch;
    }

    // 然后尝试匹配以 "beatmap-{beatmapsetId}-" 开头的 ID（下载的音频文件格式）
    const prefixMatch = tracks.value.find(
      (track) =>
        track.id.startsWith(`beatmap-${beatmapsetId}-`) || track.id.startsWith(`${beatmapsetId}-`),
    );
    if (prefixMatch) {
      console.log(`[findTrackByBeatmapsetId] Found prefix match:`, prefixMatch.fileName);
      return prefixMatch;
    }

    // 尝试在文件名中查找包含 beatmapsetId 的文件
    const fileNameMatch = tracks.value.find(
      (track) =>
        track.fileName.includes(`${beatmapsetId}-`) ||
        track.fileName.includes(`${beatmapsetId}.`) ||
        track.filePath.includes(`${beatmapsetId}-`) ||
        track.filePath.includes(`${beatmapsetId}.`),
    );
    if (fileNameMatch) {
      console.log(`[findTrackByBeatmapsetId] Found filename match:`, fileNameMatch.fileName);
      return fileNameMatch;
    }

    // 最后尝试模糊匹配（去掉扩展名后匹配）
    const fuzzyMatch = tracks.value.find((track) => {
      const nameWithoutExt = track.fileName.replace(/\.(mp3|wav|ogg|m4a|flac)$/i, '');
      return nameWithoutExt.includes(beatmapsetId.toString());
    });
    if (fuzzyMatch) {
      console.log(`[findTrackByBeatmapsetId] Found fuzzy match:`, fuzzyMatch.fileName);
      return fuzzyMatch;
    }

    console.log(`[findTrackByBeatmapsetId] No match found for beatmapsetId: ${beatmapsetId}`);
    return null;
  };

  // 清理音乐库（移除不存在的文件记录） - 使用统一的 musicService 接口
  const cleanupMusicLibrary = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[MusicStore] Starting library cleanup using musicService...');

      // 使用 musicService 进行库清理（内部处理平台差异）
      await musicService.cleanupMusicLibrary();

      // 重新获取清理后的音乐库
      const musicTracks = await musicService.getMusicLibrary();
      console.log(`[MusicStore] Found ${musicTracks.length} valid tracks after cleanup`);

      // 转换为 MusicStore 的 MusicTrack 格式
      const cleanedTracks: MusicTrack[] = musicTracks.map((track) => ({
        id: track.id,
        title: track.title,
        fileName: track.filePath.split('/').pop() || track.title,
        filePath: track.filePath,
        duration: track.duration,
        artist: track.artist || 'Unknown Artist',
        album: 'Unknown Album',
        coverUrl: track.coverUrl || generateOsuCoverUrl(track.id),
        addedDate: new Date().toISOString(),
      }));

      tracks.value = cleanedTracks;
      console.log(
        `[MusicStore] Library cleanup completed. ${cleanedTracks.length} valid tracks remaining.`,
      );
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to cleanup library';
      console.error('[MusicStore] Cleanup failed:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // 同步音乐库（扫描文件夹并更新库） - 使用统一的 musicService 接口
  const syncMusicLibrary = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[MusicStore] Starting library sync using musicService...');

      // 使用 musicService 进行库同步（内部处理清理、扫描、更新等逻辑）
      await musicService.syncMusicLibrary();

      // 重新获取同步后的音乐库
      const musicTracks = await musicService.getMusicLibrary();
      console.log(`[MusicStore] Found ${musicTracks.length} tracks after sync`);

      // 转换为 MusicStore 的 MusicTrack 格式
      const syncedTracks: MusicTrack[] = musicTracks.map((track) => ({
        id: track.id,
        title: track.title,
        fileName: track.filePath.split('/').pop() || track.title,
        filePath: track.filePath,
        duration: track.duration,
        artist: track.artist || 'Unknown Artist',
        album: 'Unknown Album',
        coverUrl: track.coverUrl || generateOsuCoverUrl(track.id),
        addedDate: new Date().toISOString(),
      }));

      tracks.value = syncedTracks;
      console.log('[MusicStore] Library sync completed.');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to sync library';
      console.error('[MusicStore] Sync failed:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // 重置音乐库 - 使用统一的 musicService 接口
  const resetMusicLibrary = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[MusicStore] Resetting music library using musicService...');

      // 停止当前播放
      await stopTrack();

      // 使用 musicService 重置音乐库（内部处理平台差异）
      await musicService.resetMusicLibrary();

      // 清空所有本地状态
      tracks.value = [];
      currentTrack.value = null;
      currentPlaylist.value = null;
      playQueue.value = [];
      originalQueue.value = [];
      currentQueueIndex.value = 0;
      currentTime.value = 0;
      duration.value = 0;

      console.log('[MusicStore] Music library reset completed.');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to reset library';
      console.error('[MusicStore] Reset failed:', err);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // 状态
    tracks,
    isLoading,
    error,
    currentTrack,
    isPlaying,
    shuffleMode,
    repeatMode,
    currentPlaylist,
    volume,
    seek,
    currentTime,
    duration,
    playQueue,
    currentQueueIndex,

    // 计算属性
    totalTracks,
    totalDurationMinutes,
    tracksSorted,
    recentTracks,

    // 方法
    scanMusicFiles,
    playTrack,
    pauseTrack,
    stopTrack,
    play,
    pause,
    previousTrack,
    nextTrack,
    toggleShuffle,
    toggleRepeat,
    seekTo,
    setVolume,
    setCurrentPlaylist,
    setPlayQueue,
    clearPlayQueue,
    addToQueue,
    addToQueueNext,
    removeFromQueue,
    shuffleQueue,
    restoreOriginalQueue,
    playFromQueue,
    findTrackByBeatmapsetId,
    searchTracks,
    addTracks,
    removeTrack,
    deleteTrackFile,
    cleanupMusicLibrary,
    syncMusicLibrary,
    resetMusicLibrary,
  };
});

// 生成 osu! 封面 URL 的辅助函数
function generateOsuCoverUrl(beatmapsetId: string): string {
  // 尝试不同的封面尺寸，优先使用较小的用于卡片显示
  const coverSizes = ['card', 'list', 'cover'];
  const randomSize = coverSizes[Math.floor(Math.random() * coverSizes.length)];
  return `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/${randomSize}.jpg`;
}
