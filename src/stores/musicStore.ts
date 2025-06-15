import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { audioService } from 'src/services/audioService';

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

  // 扫描音乐文件
  const scanMusicFiles = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      // 在 Electron 环境中，通过 IPC 扫描音乐文件夹
      if (window.electron?.ipcRenderer) {
        const result: {
          success: boolean;
          files?: Array<{
            fileName: string;
            filePath: string;
            size: number;
            lastModified: string;
          }>;
          error?: string;
        } = await window.electron.ipcRenderer.invoke('scan-music-folder');

        if (!result.success) {
          throw new Error(result.error || 'Failed to scan music folder');
        }

        const musicFiles = result.files || [];
        console.log(`[MusicStore] Found ${musicFiles.length} music files in folder`);

        // 并发读取所有音频文件的真实时长
        const scannedTracks: MusicTrack[] = await Promise.all(
          musicFiles.map(async (fileInfo) => {
            // 文件名格式：id-title-artist.mp3
            const fileName = fileInfo.fileName;
            const nameWithoutExt = fileName.replace(/\.(mp3|wav|ogg|m4a|flac)$/i, '');
            const parts = nameWithoutExt.split('-');
            const id = parts[0]
              ? parts[0]
              : `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            let title = '';
            let artist = '';
            if (parts.length >= 3) {
              // id-title-artist
              artist = String(parts[parts.length - 1] ?? '')
                .replace(/_/g, ' ')
                .trim();
              title = parts
                .slice(1, parts.length - 1)
                .join('-')
                .replace(/_/g, ' ')
                .trim();
            } else if (parts.length === 2) {
              title = parts[1] ? parts[1].replace(/_/g, ' ').trim() : '';
              artist = '';
            } else {
              title = nameWithoutExt;
              artist = '';
            }

            // 通过 Electron IPC 获取真实 duration
            let duration: number | undefined = undefined;
            try {
              duration = await window.electron?.ipcRenderer?.invoke(
                'get-audio-metadata',
                fileInfo.filePath,
              );
            } catch (e) {
              console.warn('Failed to get audio duration for', fileInfo.filePath, e);
            }

            return {
              id,
              title: title || fileName,
              fileName,
              filePath: fileInfo.filePath,
              duration: duration, // 真实时长，单位：秒
              artist: artist || 'Unknown Artist',
              album: 'Unknown Album',
              coverUrl: generateOsuCoverUrl(id || 'unknown'),
              addedDate: fileInfo.lastModified,
            };
          }),
        );

        tracks.value = scannedTracks;
      } else {
        // 浏览器环境中的降级处理（使用模拟数据）
        console.warn('[MusicStore] Not in Electron environment, using mock data');

        // 在浏览器环境中，我们无法访问用户的文件系统，使用示例数据
        const mockFiles = [
          '1234567-Senbonzakura.mp3',
          '2345678-Through_the_Fire_and_Flames.mp3',
          '3456789-Blue_Zenith.mp3',
          '4567890-Necrofantasia.mp3',
          '5678901-FREEDOM_DiVE.mp3',
        ];

        const scannedTracks: MusicTrack[] = mockFiles.map((fileName) => {
          const nameWithoutExt = fileName.replace('.mp3', '');
          const parts = nameWithoutExt.split('-');
          const id = parts[0] ? parts[0] : 'unknown';
          let artist = '';
          let title = '';
          if (parts.length >= 3) {
            artist = String(parts[parts.length - 1] ?? '')
              .replace(/_/g, ' ')
              .trim();
            title = parts
              .slice(1, parts.length - 1)
              .join('-')
              .replace(/_/g, ' ')
              .trim();
          } else if (parts.length === 2) {
            title = parts[1] ? parts[1].replace(/_/g, ' ').trim() : '';
            artist = '';
          } else {
            title = nameWithoutExt;
            artist = '';
          }

          return {
            id,
            title,
            fileName,
            filePath: `/music/${fileName}`,
            duration: Math.floor(Math.random() * 300) + 60,
            artist: artist || 'Unknown Artist',
            album: getRandomAlbum(),
            coverUrl: generateOsuCoverUrl(id || 'unknown'),
            addedDate: getRandomDate(),
          };
        });

        tracks.value = scannedTracks;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to scan music files';
      console.error('Music scan error:', err);
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

  // 删除音乐文件（包括从文件系统删除和从库中移除）
  const deleteTrackFile = async (
    track: MusicTrack,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // 在 Electron 环境中，通过 IPC 删除文件
      if (window.electron?.ipcRenderer) {
        const result: { success: boolean; error?: string } =
          await window.electron.ipcRenderer.invoke('delete-music-file', track.filePath);

        if (result.success) {
          // 从库中移除
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

          console.log(`Deleted track file and removed from library: ${track.title}`);
          return { success: true };
        } else {
          return { success: false, error: result.error || 'Failed to delete file' };
        }
      } else {
        // 浏览器环境中只从库中移除
        removeTrack(track.id);
        console.log(`Removed track from library (browser mode): ${track.title}`);
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete track';
      console.error('Error deleting track:', error);
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

  // 新增: 清理音乐库（移除不存在的文件记录）
  const cleanupMusicLibrary = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[MusicStore] Starting library cleanup...');
      const validTracks: MusicTrack[] = [];

      for (const track of tracks.value) {
        // 在实际应用中，这里应该检查文件是否存在
        // 目前先假设检查逻辑，稍后可以集成platform服务
        try {
          // TODO: 集成平台服务的文件存在检查
          // const exists = await platform.exists(track.filePath);

          // 临时逻辑：检查文件路径是否合理
          if (track.filePath && track.fileName && track.title) {
            validTracks.push(track);
          } else {
            console.log('[MusicStore] Removing invalid track:', track.title || track.fileName);
          }
        } catch (error) {
          console.warn('[MusicStore] Error checking track:', track.title, error);
        }
      }

      tracks.value = validTracks;
      console.log(`[MusicStore] Cleanup complete. ${validTracks.length} valid tracks remaining.`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to cleanup library';
      console.error('[MusicStore] Cleanup failed:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // 新增: 同步音乐库（扫描文件夹并更新库）
  const syncMusicLibrary = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[MusicStore] Starting library sync...');

      // 先清理现有库
      await cleanupMusicLibrary();

      // 然后重新扫描
      await scanMusicFiles();

      console.log('[MusicStore] Library sync completed.');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to sync library';
      console.error('[MusicStore] Sync failed:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // 新增: 重置音乐库
  const resetMusicLibrary = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[MusicStore] Resetting music library...');

      // 停止当前播放
      await stopTrack();

      // 清空所有数据
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

// 辅助函数
function getRandomAlbum(): string {
  const albums = [
    'Vocaloid Collection',
    'Inhuman Rampage',
    'Parousia',
    'Touhou Project',
    'Electronic Beats',
    'Melodic Dubstep',
    'Hardcore Heaven',
    'Rhythm Game Classics',
  ];
  return albums[Math.floor(Math.random() * albums.length)] || 'Unknown Album';
}

function getRandomDate(): string {
  const start = new Date('2023-01-01');
  const end = new Date();
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString();
}

// 生成 osu! 封面 URL 的辅助函数
function generateOsuCoverUrl(beatmapsetId: string): string {
  // 尝试不同的封面尺寸，优先使用较小的用于卡片显示
  const coverSizes = ['card', 'list', 'cover'];
  const randomSize = coverSizes[Math.floor(Math.random() * coverSizes.length)];
  return `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/${randomSize}.jpg`;
}
