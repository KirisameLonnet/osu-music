// src/services/business/index.ts
/**
 * 业务服务导出
 */

export { getMusicService } from './musicService';
export { audioService } from './audioService';
export { coverImageService } from './coverImageService';
export { useBeatmapDownloadService } from './beatmapDownloadService';
export { useAudioService } from './audioPlayPreviewService';

// 默认导出
export { default as beatmapDownloadService } from './beatmapDownloadService';
