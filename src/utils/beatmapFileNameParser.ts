// src/utils/beatmapFileNameParser.ts
/**
 * Beatmap 文件名解析工具
 *
 * 处理从 osu! beatmap 下载的音频文件名解析
 * 文件名格式：{beatmapId}-{title}-{artist}.{ext}
 */

export interface ParsedBeatmapFileName {
  beatmapId: number;
  title: string;
  artist: string;
  extension: string;
  originalFileName: string;
}

export class BeatmapFileNameParser {
  /**
   * 解析 beatmap 音频文件名
   * @param fileName 文件名，格式：{beatmapId}-{title}-{artist}.{ext}
   * @returns 解析结果，如果不是 beatmap 文件则返回 null
   */
  static parseBeatmapFileName(fileName: string): ParsedBeatmapFileName | null {
    console.log('[BeatmapFileNameParser] Parsing filename:', fileName);

    // 移除文件扩展名
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const extension = fileName.substring(nameWithoutExt.length);

    console.log('[BeatmapFileNameParser] Name without extension:', nameWithoutExt);
    console.log('[BeatmapFileNameParser] Extension:', extension);

    // 检查是否是 beatmap 文件名格式（以数字开头）
    const beatmapPattern = /^(\d+)-(.+)-(.+)$/;
    const match = nameWithoutExt.match(beatmapPattern);

    console.log('[BeatmapFileNameParser] Regex match result:', match);

    if (!match || match.length < 4) {
      console.log('[BeatmapFileNameParser] No match found - not a beatmap filename format');
      return null; // 不是 beatmap 文件名格式
    }

    const beatmapIdStr = match[1];
    const title = match[2];
    const artist = match[3];

    console.log('[BeatmapFileNameParser] Extracted parts:', {
      beatmapIdStr,
      title,
      artist,
    });

    if (!beatmapIdStr || !title || !artist) {
      console.log('[BeatmapFileNameParser] Missing required parts');
      return null;
    }

    const beatmapId = parseInt(beatmapIdStr, 10);

    if (isNaN(beatmapId)) {
      console.log('[BeatmapFileNameParser] Invalid beatmap ID:', beatmapIdStr);
      return null;
    }

    const result = {
      beatmapId,
      title: this.unescapeFileName(title),
      artist: this.unescapeFileName(artist),
      extension,
      originalFileName: fileName,
    };

    console.log('[BeatmapFileNameParser] Successfully parsed:', result);
    return result;
  }

  /**
   * 检查文件名是否是 beatmap 音频文件
   */
  static isBeatmapAudioFile(fileName: string): boolean {
    return this.parseBeatmapFileName(fileName) !== null;
  }

  /**
   * 还原文件名中的特殊字符
   * （与 beatmapDownloadService 中的 sanitizeFileName 对应）
   */
  private static unescapeFileName(name: string): string {
    console.log('[BeatmapFileNameParser] Unescaping filename:', name);

    const result = name
      .replace(/_/g, ' ') // 下划线还原为空格
      .replace(/\+/g, '+') // 加号保持不变
      .replace(/-/g, '-') // 连字符保持不变
      .replace(/&lt;/g, '<') // HTML 实体
      .replace(/&gt;/g, '>') // HTML 实体
      .replace(/&amp;/g, '&') // HTML 实体
      .replace(/&quot;/g, '"') // HTML 实体
      .replace(/&#39;/g, "'") // HTML 实体（单引号）
      .trim();

    console.log('[BeatmapFileNameParser] Unescaped result:', result);
    return result;
  }

  /**
   * 生成 beatmap 封面 URL
   * @param beatmapId beatmap ID
   * @param size 封面尺寸 ('cover', 'card', 'list', 'slimcover')
   * @returns 封面 URL
   */
  static generateCoverUrl(
    beatmapId: number,
    size: 'cover' | 'card' | 'list' | 'slimcover' = 'card',
  ): string {
    return `https://assets.ppy.sh/beatmaps/${beatmapId}/covers/${size}.jpg`;
  }

  /**
   * 从解析的文件名信息创建显示标题
   */
  static createDisplayTitle(parsed: ParsedBeatmapFileName): string {
    return `${parsed.title} - ${parsed.artist}`;
  }

  /**
   * 创建 beatmap 链接
   */
  static createBeatmapUrl(beatmapId: number): string {
    return `https://osu.ppy.sh/beatmapsets/${beatmapId}`;
  }
}

export default BeatmapFileNameParser;
