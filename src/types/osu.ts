// src/types/osu.ts
/**
 * OSU! 相关类型定义
 */

export interface OsuUserProfile {
  id: number;
  username: string;
  avatar_url: string;
  cover_url?: string;
  country_code: string;
  is_supporter: boolean;
  is_restricted: boolean;
  is_active: boolean;
  has_supported: boolean;
  join_date: string;
  last_visit?: string;
  playmode: string;
  playstyle: string[];
  profile_colour?: string;
  statistics?: OsuUserStatistics;
}

export interface OsuUserStatistics {
  level: {
    current: number;
    progress: number;
  };
  pp: number;
  global_rank?: number;
  country_rank?: number;
  play_count: number;
  play_time: number;
  total_score: number;
  ranked_score: number;
  hit_accuracy: number;
  max_combo: number;
  replays_watched_by_others: number;
  grade_counts: {
    ss: number;
    ssh: number;
    s: number;
    sh: number;
    a: number;
  };
}

export interface OsuBeatmapset {
  id: number;
  title: string;
  artist: string;
  creator: string;
  user_id: number;
  covers: {
    cover: string;
    'cover@2x': string;
    card: string;
    'card@2x': string;
    list: string;
    'list@2x': string;
    slimcover: string;
    'slimcover@2x': string;
  };
  preview_url: string;
  tags: string;
  video: boolean;
  source: string;
  favourite_count: number;
  play_count: number;
  status: string;
  track_id?: number;
  user?: OsuUserProfile;
  beatmaps?: OsuBeatmap[];
}

export interface OsuBeatmap {
  id: number;
  beatmapset_id: number;
  mode: string;
  mode_int: number;
  convert: boolean;
  difficulty_rating: number;
  version: string;
  total_length: number;
  hit_length: number;
  bpm: number;
  cs: number;
  ar: number;
  od: number;
  hp: number;
  count_circles: number;
  count_sliders: number;
  count_spinners: number;
  count_total: number;
  passcount: number;
  playcount: number;
  ranked: number;
  url: string;
  checksum?: string;
  beatmapset?: OsuBeatmapset;
}

export interface OsuAuthToken {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
}

export interface OsuAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface ParsedBeatmapFileName {
  beatmapId: number;
  title: string;
  artist: string;
  extension: string;
  originalFileName: string;
}

export interface BeatmapSearchQuery {
  query?: string;
  mode?: 'osu' | 'taiko' | 'fruits' | 'mania';
  status?: 'ranked' | 'qualified' | 'loved' | 'pending' | 'wip' | 'graveyard';
  genre?: string;
  language?: string;
  sort?: 'title' | 'artist' | 'difficulty' | 'ranked' | 'rating' | 'plays' | 'favourites';
  order?: 'asc' | 'desc';
  cursor?: string;
}

export interface BeatmapDownloadProgress {
  beatmapId: number;
  title: string;
  artist: string;
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';
  error?: string;
}
