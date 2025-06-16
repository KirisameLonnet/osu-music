import { ref } from 'vue';
import { osuHttpService } from '../api/httpService';
import { useAuthStore } from 'src/stores/authStore';

interface PreviewAudio {
  url: string;
  beatmapsetId: number;
  title: string;
}

class AudioService {
  private audio: HTMLAudioElement | null = null;
  private currentPreview = ref<PreviewAudio | null>(null);
  private isPlaying = ref(false);
  private isLoading = ref(false);
  private error = ref<string | null>(null);

  constructor() {
    this.setupAudioElement();
  }

  private setupAudioElement() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'none';
    this.audio.volume = 0.5; // 调整默认音量为50%

    this.audio.addEventListener('loadstart', () => {
      this.isLoading.value = true;
      this.error.value = null;
    });

    this.audio.addEventListener('canplay', () => {
      this.isLoading.value = false;
    });

    this.audio.addEventListener('playing', () => {
      this.isPlaying.value = true;
      this.isLoading.value = false;
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying.value = false;
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying.value = false;
    });

    this.audio.addEventListener('error', () => {
      this.isLoading.value = false;
      this.isPlaying.value = false;
      this.error.value = 'Failed to load audio';
    });
  }

  private async getPreviewUrl(beatmapsetId: number): Promise<string | null> {
    try {
      const authStore = useAuthStore();

      if (!authStore.accessToken) {
        throw new Error('No access token available');
      }

      const response = await osuHttpService.get<{
        preview_url?: string;
      }>(`/beatmapsets/${beatmapsetId}`, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      });

      return response.data.preview_url || null;
    } catch (error) {
      console.error('[AudioService] Failed to get preview URL:', error);
      return null;
    }
  }

  private async getPlayableAudioUrl(externalAudioUrl: string): Promise<string | null> {
    if (window.electron?.ipcRenderer) {
      try {
        const dataUrl = await window.electron.ipcRenderer.invoke(
          'fetch-audio-data',
          externalAudioUrl,
        );
        if (typeof dataUrl === 'string' && dataUrl.startsWith('data:audio')) {
          return dataUrl;
        } else {
          throw new Error('Invalid data URL returned from main process');
        }
      } catch (error) {
        console.error('[AudioService] Failed to fetch audio data from main process:', error);
        throw error;
      }
    } else {
      console.warn('[AudioService] Direct fetch may cause CORS issues:', externalAudioUrl);
      return externalAudioUrl;
    }
  }

  async playPreview(beatmapsetId: number, title: string): Promise<void> {
    try {
      this.error.value = null;

      if (this.currentPreview.value?.beatmapsetId === beatmapsetId && this.isPlaying.value) {
        this.pause();
        return;
      }

      if (this.isPlaying.value) {
        this.stop();
      }

      this.isLoading.value = true;

      const previewUrl = await this.getPreviewUrl(beatmapsetId);

      if (!previewUrl) {
        throw new Error('No preview audio available for this beatmap');
      }

      const playableAudioUrl = await this.getPlayableAudioUrl(previewUrl);

      if (!playableAudioUrl) {
        throw new Error('Failed to obtain playable audio URL');
      }

      this.currentPreview.value = {
        url: playableAudioUrl,
        beatmapsetId,
        title,
      };

      if (this.audio) {
        this.audio.src = playableAudioUrl;
        await this.audio.play();
      }
    } catch (error) {
      this.isLoading.value = false;
      this.isPlaying.value = false;

      const errorMessage = error instanceof Error ? error.message : 'Failed to play preview';
      this.error.value = errorMessage;
      throw error;
    }
  }

  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;

      // 如果当前使用的是blob URL，释放它
      if (this.currentPreview.value?.url && this.currentPreview.value.url.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentPreview.value.url);
      }

      this.audio.src = '';
    }
    this.currentPreview.value = null;
    this.isPlaying.value = false;
  }

  cleanup(): void {
    this.stop();
    if (this.audio) {
      this.audio.removeEventListener('loadstart', () => {});
      this.audio.removeEventListener('canplay', () => {});
      this.audio.removeEventListener('playing', () => {});
      this.audio.removeEventListener('pause', () => {});
      this.audio.removeEventListener('ended', () => {});
      this.audio.removeEventListener('error', () => {});
      this.audio = null;
    }
  }

  isPlayingBeatmap(beatmapsetId: number): boolean {
    return this.currentPreview.value?.beatmapsetId === beatmapsetId && this.isPlaying.value;
  }

  isLoadingBeatmap(beatmapsetId: number): boolean {
    return this.currentPreview.value?.beatmapsetId === beatmapsetId && this.isLoading.value;
  }
}

const audioService = new AudioService();

export function useAudioService() {
  return {
    playPreview: audioService.playPreview.bind(audioService),
    pause: audioService.pause.bind(audioService),
    stop: audioService.stop.bind(audioService),
    cleanup: audioService.cleanup.bind(audioService),
    isPlayingBeatmap: audioService.isPlayingBeatmap.bind(audioService),
    isLoadingBeatmap: audioService.isLoadingBeatmap.bind(audioService),
  };
}
