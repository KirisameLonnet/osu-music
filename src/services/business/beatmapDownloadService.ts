// src/services/business/beatmapDownloadService.ts
/**
 * Beatmap Download Service
 *
 * 功能说明：
 * - 从多个镜像源下载 osu! beatmap 文件 (.osz)
 * - 解压缩并提取音频文件
 * - 支持 MP3、OGG、FLAC 格式的音乐文件，跳过 WAV 音效文件
 * - 保存到统一的音乐存储路径
 * - 提供下载进度跟踪
 */
import { ref } from 'vue';
import { osuHttpService } from '../api/httpService';
import { binaryDownloader } from '../core/platform/binaryDownloader';
import { useAuthStore } from 'src/stores/authStore';
import { useMusicStore, type MusicTrack } from 'src/stores/musicStore';

export interface DownloadProgress {
  beatmapsetId: number;
  title: string;
  progress: number; // 0-100
  status: 'downloading' | 'extracting' | 'completed' | 'error';
  error?: string;
}

interface BeatmapsetData {
  id: number;
  title: string;
  title_unicode?: string;
  artist: string;
  artist_unicode?: string;
  creator: string;
  covers?: {
    card?: string;
    cover?: string;
  };
}

class BeatmapDownloadService {
  private downloads = ref<Map<number, DownloadProgress>>(new Map());

  // 获取下载进度
  getDownloadProgress(beatmapsetId: number): DownloadProgress | undefined {
    return this.downloads.value.get(beatmapsetId);
  }

  // 检查是否正在下载
  isDownloading(beatmapsetId: number): boolean {
    const progress = this.downloads.value.get(beatmapsetId);
    return progress?.status === 'downloading' || progress?.status === 'extracting';
  }

  // 下载并提取 beatmap
  async downloadBeatmap(beatmapsetId: number, title: string): Promise<void> {
    const authStore = useAuthStore();
    const musicStore = useMusicStore();

    // 检查是否已在下载中
    if (this.isDownloading(beatmapsetId)) {
      throw new Error('Beatmap is already being downloaded');
    }

    // 检查认证状态
    if (!authStore.accessToken) {
      throw new Error('Authentication required for downloading beatmaps');
    }

    // 初始化下载进度
    const progress: DownloadProgress = {
      beatmapsetId,
      title,
      progress: 0,
      status: 'downloading',
    };
    this.downloads.value.set(beatmapsetId, progress);

    try {
      // 第一步：获取 beatmapset 详细信息
      console.log(`[BeatmapDownload] Starting download: ${title}`);

      const beatmapsetResponse = await osuHttpService.get<BeatmapsetData>(
        `/beatmapsets/${beatmapsetId}`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        },
      );

      console.log('[BeatmapDownload] Raw response:', beatmapsetResponse);
      console.log('[BeatmapDownload] Response data:', beatmapsetResponse.data);

      if (!beatmapsetResponse.data) {
        throw new Error('No beatmap data received from API');
      }

      const beatmapset: BeatmapsetData = beatmapsetResponse.data;
      progress.progress = 10;

      // 第二步：下载 .osz 文件 - 使用多个镜像站点
      progress.status = 'downloading';

      let arrayBuffer: ArrayBuffer | null = null;

      // 尝试多个下载源
      const downloadSources = [
        {
          name: 'Catboy.best Mirror',
          url: `https://catboy.best/d/${beatmapsetId}`,
          requiresAuth: false,
        },
        {
          name: 'Chimu.moe Mirror',
          url: `https://api.chimu.moe/v1/download/${beatmapsetId}?n=1`,
          requiresAuth: false,
        },
        {
          name: 'Beatconnect Mirror',
          url: `https://beatconnect.io/b/${beatmapsetId}`,
          requiresAuth: false,
        },
        // 官方API作为最后的尝试（虽然知道会失败）
        {
          name: 'Official osu! API',
          url: `https://osu.ppy.sh/beatmapsets/${beatmapsetId}/download`,
          requiresAuth: true,
        },
      ];

      for (const source of downloadSources) {
        try {
          console.log(`[BeatmapDownload] Trying ${source.name}: ${source.url}`);

          if (source.requiresAuth) {
            // 使用官方API (需要认证)
            if (window.electron?.ipcRenderer) {
              const result: { success: boolean; data?: number[]; error?: string } =
                await window.electron.ipcRenderer.invoke('download-beatmap-osz', {
                  beatmapsetId,
                  accessToken: authStore.accessToken,
                });

              if (!result.success) {
                console.log(`[BeatmapDownload] ${source.name} failed: ${result.error}`);
                continue;
              }

              if (!result.data) {
                console.log(`[BeatmapDownload] ${source.name} failed: No data received`);
                continue;
              }

              arrayBuffer = new Uint8Array(result.data).buffer;
              console.log(`[BeatmapDownload] Successfully downloaded from ${source.name}`);
              break;
            } else {
              // 使用专门的二进制下载器来避免 CORS 问题
              try {
                const downloadResult = await binaryDownloader.download({
                  url: source.url,
                  headers: {
                    Authorization: `Bearer ${authStore.accessToken}`,
                  },
                  maxRetries: 2,
                  timeout: 30000,
                });

                if (downloadResult.status < 200 || downloadResult.status >= 300) {
                  console.log(
                    `[BeatmapDownload] ${source.name} failed: HTTP ${downloadResult.status}`,
                  );
                  continue;
                }

                arrayBuffer = downloadResult.data;
                console.log(
                  `[BeatmapDownload] Successfully downloaded from ${source.name}, size: ${arrayBuffer.byteLength} bytes`,
                );
                break;
              } catch (error) {
                console.log(`[BeatmapDownload] ${source.name} failed: ${String(error)}`);
                continue;
              }
            }
          } else {
            // 使用公开镜像 (无需认证)
            if (window.electron?.ipcRenderer) {
              const result: { success: boolean; data?: ArrayBuffer; error?: string } =
                await window.electron.ipcRenderer.invoke('download-beatmap-osz-public', {
                  url: source.url,
                  beatmapsetId,
                });

              if (!result.success) {
                console.log(`[BeatmapDownload] ${source.name} failed: ${result.error}`);
                continue;
              }

              if (!result.data) {
                console.log(`[BeatmapDownload] ${source.name} failed: No data received`);
                continue;
              }

              arrayBuffer = result.data;
              console.log(`[BeatmapDownload] Successfully downloaded from ${source.name}`);
              break;
            } else {
              // 使用专门的二进制下载器来处理 .osz 文件下载
              try {
                const downloadResult = await binaryDownloader.download({
                  url: source.url,
                  maxRetries: 2,
                  timeout: 30000,
                });

                if (downloadResult.status < 200 || downloadResult.status >= 300) {
                  console.log(
                    `[BeatmapDownload] ${source.name} failed: HTTP ${downloadResult.status}`,
                  );
                  continue;
                }

                arrayBuffer = downloadResult.data;
                console.log(
                  `[BeatmapDownload] Successfully downloaded from ${source.name}, size: ${arrayBuffer.byteLength} bytes`,
                );
                break;
              } catch (error) {
                console.log(`[BeatmapDownload] ${source.name} failed: ${String(error)}`);
                continue;
              }
            }
          }
        } catch (error) {
          console.error(`[BeatmapDownload] Error with ${source.name}:`, error);
          continue;
        }
      }

      if (!arrayBuffer) {
        throw new Error(
          'All download sources failed. The beatmap may not be available for download, or there may be network issues.',
        );
      }

      console.log(`[BeatmapDownload] Download completed, size: ${arrayBuffer.byteLength} bytes`);

      progress.progress = 50;

      // 第三步：解压并提取音频文件
      progress.status = 'extracting';
      const audioFiles = await this.extractAudioFromOsz(arrayBuffer);
      progress.progress = 80;

      // 第四步：保存音频文件并更新音乐库
      const savedTracks: MusicTrack[] = [];

      for (const audioFile of audioFiles) {
        try {
          console.log(`[BeatmapDownload] Saving audio file: ${audioFile.name}`);
          const track = await this.saveAudioFile(audioFile, beatmapset, beatmapsetId);
          savedTracks.push(track);
          console.log(`[BeatmapDownload] Audio file saved successfully: ${track.fileName}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(
            `[BeatmapDownload] Failed to save audio file ${audioFile.name}:`,
            errorMessage,
          );
          console.error(`[BeatmapDownload] Full error details:`, error);

          // 继续尝试其他文件，但记录错误
          progress.error = `Failed to save ${audioFile.name}: ${errorMessage}`;
        }
      }

      if (savedTracks.length === 0) {
        throw new Error(
          'No audio files found in beatmap (MP3/OGG/FLAC formats supported, WAV sound effects are excluded)',
        );
      }

      // 更新音乐库
      musicStore.addTracks(savedTracks);
      progress.progress = 100;
      progress.status = 'completed';

      console.log(
        `[BeatmapDownload] Successfully downloaded: ${title} (${savedTracks.length} tracks)`,
      );

      // 5秒后清除下载记录
      setTimeout(() => {
        this.downloads.value.delete(beatmapsetId);
      }, 5000);
    } catch (error) {
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Unknown error occurred';

      console.error(`[BeatmapDownload] Download failed: ${progress.error}`);

      // 10秒后清除错误记录
      setTimeout(() => {
        this.downloads.value.delete(beatmapsetId);
      }, 10000);

      throw error;
    }
  }

  // 从 .osz 文件中提取音频文件
  private async extractAudioFromOsz(arrayBuffer: ArrayBuffer): Promise<AudioFileData[]> {
    // 注意：这里需要使用 JSZip 库来解压缩文件
    // 先安装: npm install jszip @types/jszip

    try {
      console.log(
        `[BeatmapDownload] Starting ZIP extraction, buffer size: ${arrayBuffer.byteLength} bytes`,
      );

      const JSZip = (await import('jszip')).default;

      // 验证ArrayBuffer不为空
      if (arrayBuffer.byteLength === 0) {
        throw new Error('ArrayBuffer is empty');
      }

      const zip = await JSZip.loadAsync(arrayBuffer);
      console.log(
        `[BeatmapDownload] ZIP loaded successfully, contains ${Object.keys(zip.files).length} files`,
      );

      const audioFiles: AudioFileData[] = [];

      // 支持常见的音频格式：MP3, OGG, FLAC，跳过 WAV 音效文件
      const audioExtensions = ['.mp3', '.ogg', '.flac'];

      console.log(
        `[BeatmapDownload] Scanning ZIP files for audio files (MP3/OGG/FLAC, excluding WAV sound effects)...`,
      );
      for (const [fileName, file] of Object.entries(zip.files)) {
        if (!file || file.dir) {
          console.log(`[BeatmapDownload] Skipping directory: ${fileName}`);
          continue;
        }

        const lowerFileName = fileName.toLowerCase();
        const isAudioFile = audioExtensions.some((ext) => lowerFileName.endsWith(ext));

        console.log(`[BeatmapDownload] Checking file: ${fileName} (is audio: ${isAudioFile})`);

        if (isAudioFile) {
          console.log(`[BeatmapDownload] Extracting audio file: ${fileName}`);
          const arrayBuffer = await file.async('arraybuffer');
          console.log(
            `[BeatmapDownload] Extracted ${fileName}, size: ${arrayBuffer.byteLength} bytes`,
          );

          audioFiles.push({
            name: fileName,
            data: arrayBuffer,
            extension: this.getFileExtension(fileName),
          });
        }
      }

      console.log(`[BeatmapDownload] Found ${audioFiles.length} audio files (MP3/OGG/FLAC)`);

      if (audioFiles.length === 0) {
        // 列出所有文件以便调试
        const allFiles = Object.keys(zip.files).filter((name) => {
          const file = zip.files[name];
          return file && !file.dir;
        });
        console.warn(
          `[BeatmapDownload] No audio files found (MP3/OGG/FLAC). WAV sound effects are excluded. All files in ZIP: ${allFiles.join(', ')}`,
        );
      }

      return audioFiles;
    } catch (error) {
      console.error(`[BeatmapDownload] ZIP extraction error:`, error);

      // 提供更详细的错误信息
      let errorMessage = 'Unknown ZIP extraction error';
      if (error instanceof Error) {
        errorMessage = error.message;

        // 如果是JSZip相关的错误，提供更具体的信息
        if (errorMessage.includes('end of central directory')) {
          errorMessage = `Invalid ZIP file format: ${errorMessage}. The downloaded file may be corrupted or is not a valid .osz file.`;
        }
      }

      throw new Error(`Failed to extract audio files: ${errorMessage}`);
    }
  }

  // 保存音频文件并创建 MusicTrack
  private async saveAudioFile(
    audioFile: AudioFileData,
    beatmapset: BeatmapsetData,
    beatmapsetId: number,
  ): Promise<MusicTrack> {
    const { Capacitor } = await import('@capacitor/core');
    const { getPlatformService } = await import('src/services/core/platform');

    // 生成文件名：id-歌曲名-歌手或曲师.扩展名
    const title = this.sanitizeFileName(beatmapset.title_unicode || beatmapset.title);
    const artist = this.sanitizeFileName(
      beatmapset.artist_unicode || beatmapset.artist || beatmapset.creator,
    );
    const extension = this.getFileExtension(audioFile.name);

    const fileName = `${beatmapsetId}-${title}-${artist}${extension}`;

    console.log(`[BeatmapDownload] Saving audio file as: ${fileName}`);
    console.log(`[BeatmapDownload] Platform info:`, {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      hasElectron: !!window.electron?.ipcRenderer,
    });

    let actualFilePath: string;

    if (window.electron?.ipcRenderer) {
      // Electron 环境
      try {
        const result: { success: boolean; filePath?: string; error?: string } =
          await window.electron.ipcRenderer.invoke('save-audio-file', {
            fileName,
            data: Array.from(new Uint8Array(audioFile.data)),
          });

        if (!result.success) {
          throw new Error(result.error || 'Failed to save file');
        }

        actualFilePath = result.filePath || `osu-music/${fileName}`;
        console.log(`[BeatmapDownload] File saved via Electron: ${actualFilePath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to save file via Electron: ${errorMessage}`);
      }
    } else if (Capacitor.isNativePlatform()) {
      // Capacitor 原生环境 (iOS/Android)
      try {
        const platformService = getPlatformService();

        // 在 iOS 上，音频文件直接保存到 Documents 根目录
        await platformService.writeFile({
          path: fileName,
          data: audioFile.data,
        });

        // 获取文件的实际 URI
        const documentsDir = await platformService.getDocumentsDirectory();
        actualFilePath = `${documentsDir}/${fileName}`;

        console.log(`[BeatmapDownload] File saved via Capacitor: ${actualFilePath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[BeatmapDownload] Failed to save file via Capacitor:`, error);
        throw new Error(`Failed to save file via Capacitor: ${errorMessage}`);
      }
    } else {
      // Web 浏览器环境
      console.warn('File saving not supported in browser environment');

      // 创建下载链接让用户手动下载
      const blob = new Blob([audioFile.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // 在浏览器环境中使用相对路径
      actualFilePath = `downloads/${fileName}`;
    }

    // 创建 MusicTrack 对象
    const track: MusicTrack = {
      id: `beatmap-${beatmapsetId}-${title}-${artist}`,
      title: beatmapset.title_unicode || beatmapset.title,
      fileName,
      filePath: actualFilePath,
      artist: beatmapset.artist_unicode || beatmapset.artist,
      album: `osu! - ${beatmapset.creator}`,
      duration: this.estimateAudioDuration(audioFile.data), // 估算时长
      addedDate: new Date().toISOString(),
    };

    // 只有在有封面URL时才设置
    const coverUrl = beatmapset.covers?.card || beatmapset.covers?.cover;
    if (coverUrl) {
      track.coverUrl = coverUrl;
    }

    return track;
  }

  // 清理文件名（移除非法字符，保持可读性）
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_') // 替换文件系统非法字符
      .replace(/\s+/g, ' ') // 合并多个空格为单个空格
      .trim() // 移除首尾空格
      .replace(/\s/g, '_') // 将空格替换为下划线
      .substring(0, 50); // 限制长度以避免文件名过长
  }

  // 获取文件扩展名
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot) : '';
  }

  // 估算音频时长（简单实现，实际可能需要更复杂的音频分析）
  private estimateAudioDuration(audioData: ArrayBuffer): number {
    // 简单估算：根据文件大小估算（非常粗略）
    // 1MB mp3 大约 1分钟 (128kbps)
    const fileSizeMB = audioData.byteLength / (1024 * 1024);
    return Math.round(fileSizeMB * 60);
  }

  // 清除所有下载记录
  clearDownloads(): void {
    this.downloads.value.clear();
  }

  // 获取所有下载记录
  getAllDownloads(): DownloadProgress[] {
    return Array.from(this.downloads.value.values());
  }
}

interface AudioFileData {
  name: string;
  data: ArrayBuffer;
  extension: string;
}

// 创建单例实例
const beatmapDownloadService = new BeatmapDownloadService();

// 导出 composable
export function useBeatmapDownloadService() {
  return beatmapDownloadService;
}

export default beatmapDownloadService;
