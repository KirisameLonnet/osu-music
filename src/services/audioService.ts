import { getPlatformService } from './platform';
import type { PlatformService } from './platform/types';
import type { MusicTrack } from 'src/stores/musicStore';

// IPC 响应类型定义
interface AudioBlobResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

export interface AudioServiceEvents {
  play: () => void;
  pause: () => void;
  ended: () => void;
  timeupdate: (currentTime: number) => void;
  durationchange: (duration: number) => void;
  loadstart: () => void;
  canplay: () => void;
  error: (error: Error) => void;
  volumechange: (volume: number) => void;
}

export class AudioService {
  private audio: HTMLAudioElement | null = null;
  private eventListeners: Partial<AudioServiceEvents> = {};
  private currentTrack: MusicTrack | null = null;
  private platform: PlatformService;

  constructor() {
    this.platform = getPlatformService();
  }

  // 注册事件监听器
  on<K extends keyof AudioServiceEvents>(event: K, callback: AudioServiceEvents[K]) {
    this.eventListeners[event] = callback;
  }

  // 移除事件监听器
  off<K extends keyof AudioServiceEvents>(event: K) {
    delete this.eventListeners[event];
  }

  // 触发事件
  private emit<K extends keyof AudioServiceEvents>(
    event: K,
    ...args: Parameters<AudioServiceEvents[K]>
  ) {
    const callback = this.eventListeners[event];
    if (callback) {
      (callback as (...args: Parameters<AudioServiceEvents[K]>) => void)(...args);
    }
  }

  // 加载音频文件
  async loadTrack(track: MusicTrack): Promise<void> {
    try {
      this.currentTrack = track;

      if (this.audio) {
        this.cleanup();
      }

      this.audio = new Audio();
      this.setupAudioEventListeners();

      const platformInfo = this.platform.getPlatformInfo();

      // 在 Electron 环境中，通过 IPC 获取音频 blob URL
      if (platformInfo.type === 'electron' && track.filePath) {
        console.log(`[AudioService] Requesting audio blob URL for: ${track.filePath}`);

        try {
          const result = await window.electron?.ipcRenderer?.invoke<AudioBlobResult>(
            'get-audio-blob-url',
            track.filePath,
          );

          if (result?.success && result.dataUrl) {
            console.log(`[AudioService] Successfully got audio blob URL`);
            this.audio.src = result.dataUrl;
          } else {
            throw new Error(result?.error || 'Failed to get audio blob URL');
          }
        } catch (error) {
          console.error('[AudioService] Error getting audio blob URL:', error);
          this.emit('error', error as Error);
          return;
        }
      } else if (platformInfo.isMobile && track.filePath) {
        // 移动端：尝试从文件系统读取
        try {
          const fileData = await this.platform.readFile({
            path: track.filePath,
            encoding: 'base64',
          });

          // 创建blob URL
          const binaryString = atob(fileData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          const blobUrl = URL.createObjectURL(blob);
          this.audio.src = blobUrl;
        } catch (error) {
          console.error('[AudioService] Error reading audio file:', error);
          this.emit('error', error as Error);
          return;
        }
      } else {
        // 在浏览器环境中，可能需要通过服务器提供音频文件
        console.warn('Browser environment: Audio files need to be served through a web server');
        this.audio.src = `/music/${track.fileName}`;
      }

      this.emit('loadstart');

      // 预加载音频
      this.audio.load();
    } catch (error) {
      console.error('Failed to load track:', error);
      this.emit('error', error as Error);
    }
  }

  // 设置音频事件监听器
  private setupAudioEventListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('play', () => {
      this.emit('play');
    });

    this.audio.addEventListener('pause', () => {
      this.emit('pause');
    });

    this.audio.addEventListener('ended', () => {
      this.emit('ended');
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        this.emit('timeupdate', this.audio.currentTime);
      }
    });

    this.audio.addEventListener('durationchange', () => {
      if (this.audio && !isNaN(this.audio.duration)) {
        this.emit('durationchange', this.audio.duration);
      }
    });

    this.audio.addEventListener('canplay', () => {
      this.emit('canplay');
    });

    this.audio.addEventListener('error', (e) => {
      const error = new Error(`Audio loading error: ${e.message || 'Unknown error'}`);
      console.error('Audio error:', error);
      this.emit('error', error);
    });

    this.audio.addEventListener('volumechange', () => {
      if (this.audio) {
        this.emit('volumechange', this.audio.volume);
      }
    });
  }

  // 播放
  async play(): Promise<void> {
    if (!this.audio) {
      throw new Error('No audio loaded');
    }

    try {
      await this.audio.play();
    } catch (error) {
      console.error('Play failed:', error);
      this.emit('error', error as Error);
    }
  }

  // 暂停
  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  // 停止
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  // 跳转到指定时间
  seekTo(time: number): void {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0));
    }
  }

  // 设置音量 (0-1)
  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // 获取当前播放时间
  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  // 获取音频总时长
  getDuration(): number {
    return this.audio?.duration || 0;
  }

  // 获取音量
  getVolume(): number {
    return this.audio?.volume || 0;
  }

  // 获取是否正在播放
  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }

  // 获取当前加载的音轨
  getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  // 清理资源
  private cleanup(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeEventListener('play', () => {});
      this.audio.removeEventListener('pause', () => {});
      this.audio.removeEventListener('ended', () => {});
      this.audio.removeEventListener('timeupdate', () => {});
      this.audio.removeEventListener('durationchange', () => {});
      this.audio.removeEventListener('canplay', () => {});
      this.audio.removeEventListener('error', () => {});
      this.audio.removeEventListener('volumechange', () => {});
      this.audio.src = '';
      this.audio = null;
    }
  }

  // 销毁服务
  destroy(): void {
    this.cleanup();
    this.eventListeners = {};
    this.currentTrack = null;
  }
}

// 单例实例
export const audioService = new AudioService();
