// src/services/musicService.ts
// 音乐服务 - 使用统一的平台抽象层

import { getPlatformService } from './platform';
import type { PlatformService } from './platform/types';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  filePath: string;
  coverUrl?: string;
}

interface Playlist {
  id: string;
  name: string;
  tracks: MusicTrack[];
  coverUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MusicService {
  private platform: PlatformService;
  private musicDirectory = '';
  private playlistsDirectory = '';

  constructor() {
    this.platform = getPlatformService();
    this.initializeDirectories();
  }

  private async initializeDirectories(): Promise<void> {
    try {
      // 获取文档目录（对于iOS，这将是OSU Music专用目录）
      const documentsDir = await this.platform.getDocumentsDirectory();

      this.musicDirectory = `${documentsDir}/Music`;
      this.playlistsDirectory = `${documentsDir}/Playlists`;

      // 确保目录存在
      await this.platform.createDirectory(this.musicDirectory);
      await this.platform.createDirectory(this.playlistsDirectory);

      console.log('[MusicService] Initialized directories:', {
        music: this.musicDirectory,
        playlists: this.playlistsDirectory,
      });
    } catch (error) {
      console.error('[MusicService] Failed to initialize directories:', error);
    }
  }

  // 导入音乐文件
  async importMusicFiles(): Promise<MusicTrack[]> {
    try {
      const selectedFiles = await this.platform.pickFiles({
        accept: ['.mp3', '.wav', '.flac', '.ogg', '.m4a'],
        multiple: true,
      });

      const importedTracks: MusicTrack[] = [];

      for (const file of selectedFiles) {
        try {
          // 将文件保存到音乐目录
          const fileName = this.sanitizeFileName(file.name);
          const filePath = `Music/${fileName}`;

          if (file.data) {
            await this.platform.writeFile({
              path: filePath,
              data: file.data,
            });

            // 创建音乐轨道对象
            const track: MusicTrack = {
              id: this.generateId(),
              title: this.extractTitle(fileName),
              artist: 'Unknown Artist',
              duration: 0, // 需要音频元数据解析
              filePath,
            };

            importedTracks.push(track);
            console.log('[MusicService] Imported track:', track.title);
          }
        } catch (error) {
          console.error(`[MusicService] Failed to import file ${file.name}:`, error);
        }
      }

      // 保存到本地存储
      await this.saveMusicLibrary(importedTracks);

      return importedTracks;
    } catch (error) {
      console.error('[MusicService] Failed to import music files:', error);
      throw error;
    }
  }

  // 获取音乐库
  async getMusicLibrary(): Promise<MusicTrack[]> {
    try {
      const libraryData = await this.platform.getStorage('music-library');
      if (libraryData) {
        return JSON.parse(libraryData);
      }
      return [];
    } catch (error) {
      console.error('[MusicService] Failed to get music library:', error);
      return [];
    }
  }

  // 保存音乐库
  private async saveMusicLibrary(tracks: MusicTrack[]): Promise<void> {
    try {
      const existingTracks = await this.getMusicLibrary();
      const allTracks = [...existingTracks, ...tracks];

      await this.platform.setStorage('music-library', JSON.stringify(allTracks));
    } catch (error) {
      console.error('[MusicService] Failed to save music library:', error);
      throw error;
    }
  }

  // 创建播放列表
  async createPlaylist(name: string, tracks: MusicTrack[] = []): Promise<Playlist> {
    try {
      const playlist: Playlist = {
        id: this.generateId(),
        name,
        tracks,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 保存播放列表文件
      const playlistPath = `Playlists/${this.sanitizeFileName(name)}.json`;
      await this.platform.writeFile({
        path: playlistPath,
        data: JSON.stringify(playlist, null, 2),
      });

      // 更新播放列表索引
      await this.updatePlaylistIndex(playlist);

      console.log('[MusicService] Created playlist:', playlist.name);
      return playlist;
    } catch (error) {
      console.error('[MusicService] Failed to create playlist:', error);
      throw error;
    }
  }

  // 获取所有播放列表
  async getPlaylists(): Promise<Playlist[]> {
    try {
      const indexData = await this.platform.getStorage('playlists-index');
      if (indexData) {
        return JSON.parse(indexData);
      }
      return [];
    } catch (error) {
      console.error('[MusicService] Failed to get playlists:', error);
      return [];
    }
  }

  // 下载音乐文件（从URL）
  async downloadMusicFromUrl(url: string, filename: string): Promise<MusicTrack> {
    try {
      const response = await this.platform.httpRequest({
        url,
        method: 'GET',
      });

      const sanitizedFilename = this.sanitizeFileName(filename);
      const filePath = `Music/${sanitizedFilename}`;

      // 保存文件
      await this.platform.writeFile({
        path: filePath,
        data: response.data as ArrayBuffer,
      });

      const track: MusicTrack = {
        id: this.generateId(),
        title: this.extractTitle(sanitizedFilename),
        artist: 'Downloaded',
        duration: 0,
        filePath,
      };

      // 添加到音乐库
      await this.saveMusicLibrary([track]);

      console.log('[MusicService] Downloaded track:', track.title);
      return track;
    } catch (error) {
      console.error('[MusicService] Failed to download music:', error);
      throw error;
    }
  }

  // 获取音乐文件数据（用于播放）
  async getMusicFileData(track: MusicTrack): Promise<ArrayBuffer> {
    try {
      const fileData = await this.platform.readFile({
        path: track.filePath,
        encoding: 'base64',
      });

      // 将base64转换为ArrayBuffer
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('[MusicService] Failed to get music file data:', error);
      throw error;
    }
  }

  // 清理音乐库
  async clearMusicLibrary(): Promise<void> {
    try {
      await this.platform.removeStorage('music-library');
      await this.platform.removeStorage('playlists-index');

      // 删除所有音乐文件
      const musicFiles = await this.platform.listDirectory('Music');
      for (const file of musicFiles) {
        if (file.type === 'file') {
          await this.platform.deleteFile(file.path);
        }
      }

      console.log('[MusicService] Cleared music library');
    } catch (error) {
      console.error('[MusicService] Failed to clear music library:', error);
      throw error;
    }
  }

  // 清理音乐库，移除不存在的文件
  async cleanupMusicLibrary(): Promise<void> {
    try {
      console.log('[MusicService] Starting music library cleanup...');
      const tracks = await this.getMusicLibrary();
      const validTracks: MusicTrack[] = [];

      for (const track of tracks) {
        try {
          // 检查文件是否存在
          const exists = await this.platform.exists(track.filePath);
          if (exists) {
            validTracks.push(track);
            console.log('[MusicService] Valid track found:', track.title);
          } else {
            console.log('[MusicService] Removing invalid track:', track.title, track.filePath);
          }
        } catch (error) {
          console.warn('[MusicService] Error checking file existence for:', track.title, error);
        }
      }

      // 更新音乐库，只保留有效的曲目
      await this.platform.setStorage('music-library', JSON.stringify(validTracks));
      console.log(
        `[MusicService] Cleanup complete. ${validTracks.length}/${tracks.length} tracks remaining.`,
      );
    } catch (error) {
      console.error('[MusicService] Failed to cleanup music library:', error);
    }
  }

  // 扫描文件夹并同步音乐库
  async syncMusicLibrary(): Promise<void> {
    try {
      console.log('[MusicService] Starting music library sync...');

      // 首先清理无效的记录
      await this.cleanupMusicLibrary();

      // 获取当前音乐库
      const existingTracks = await this.getMusicLibrary();
      const existingPaths = new Set(existingTracks.map((track) => track.filePath));

      // 扫描Music文件夹
      try {
        const files = await this.platform.listDirectory('Music');
        const newTracks: MusicTrack[] = [];

        for (const file of files) {
          const filePath = `Music/${file.name}`;

          // 检查是否是音频文件且不在现有库中
          if (this.isAudioFile(file.name) && !existingPaths.has(filePath)) {
            const track: MusicTrack = {
              id: this.generateId(),
              title: this.extractTitle(file.name),
              artist: 'Unknown Artist',
              duration: 0,
              filePath,
            };

            newTracks.push(track);
            console.log('[MusicService] Found new track:', track.title);
          }
        }

        if (newTracks.length > 0) {
          await this.saveMusicLibrary(newTracks);
          console.log(`[MusicService] Added ${newTracks.length} new tracks to library.`);
        }
      } catch (error) {
        console.warn('[MusicService] Could not scan Music directory:', error);
      }

      console.log('[MusicService] Music library sync completed.');
    } catch (error) {
      console.error('[MusicService] Failed to sync music library:', error);
    }
  }

  // 检查是否是音频文件
  private isAudioFile(filename: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return audioExtensions.includes(extension);
  }

  // 完全重置音乐库
  async resetMusicLibrary(): Promise<void> {
    try {
      console.log('[MusicService] Resetting music library...');
      await this.platform.setStorage('music-library', JSON.stringify([]));
      console.log('[MusicService] Music library reset completed.');
    } catch (error) {
      console.error('[MusicService] Failed to reset music library:', error);
    }
  }

  // 工具方法
  private generateId(): string {
    return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  private extractTitle(fileName: string): string {
    return fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  }

  private async updatePlaylistIndex(playlist: Playlist): Promise<void> {
    try {
      const existingPlaylists = await this.getPlaylists();
      const updatedPlaylists = [...existingPlaylists, playlist];
      await this.platform.setStorage('playlists-index', JSON.stringify(updatedPlaylists));
    } catch (error) {
      console.error('[MusicService] Failed to update playlist index:', error);
    }
  }

  // 获取平台信息
  getPlatformInfo() {
    return this.platform.getPlatformInfo();
  }

  // iOS特定：获取OSU Music目录路径（如果在Capacitor环境中）
  async getOsuMusicDirectory(): Promise<string> {
    const platformInfo = this.platform.getPlatformInfo();
    if (platformInfo.type === 'ios') {
      // 尝试调用Capacitor特定的方法
      const capacitorPlatform = this.platform as unknown as {
        getOsuMusicDirectory?: () => Promise<string>;
      };
      if (typeof capacitorPlatform.getOsuMusicDirectory === 'function') {
        return await capacitorPlatform.getOsuMusicDirectory();
      }
    }
    return this.musicDirectory;
  }
}

// 创建单例实例
let musicServiceInstance: MusicService | null = null;

export function getMusicService(): MusicService {
  if (!musicServiceInstance) {
    musicServiceInstance = new MusicService();
  }
  return musicServiceInstance;
}
