// src/stores/playHistoryStore.ts
import { defineStore } from 'pinia';
import { osuHttpService } from 'src/services/api/httpService';
import { useAuthStore } from 'src/stores/authStore'; // 用于获取当前用户ID和token

export interface CoverImages {
  cover: string;
  'cover@2x': string;
  card: string;
  'card@2x': string;
  list: string;
  'list@2x': string;
  slimcover: string;
  'slimcover@2x': string;
}

export interface Beatmapset {
  id: number;
  artist: string;
  artist_unicode?: string;
  title: string;
  title_unicode?: string;
  creator: string; // mapper username
  user_id: number; // mapper user_id
  source?: string;
  tags?: string;
  status: string; // ranked, approved, qualified, loved, pending, wip, graveyard
  covers: CoverImages; // 谱面封面图
  // ... 其他谱面集信息 (如 ranked_date, last_updated, bpm, play_count, favourite_count)
}

export interface Beatmap {
  id: number;
  beatmapset_id: number;
  difficulty_rating: number; // 星级 (Star Rating)
  mode: string; // osu, taiko, fruits, mania
  status: string; // ranked, approved, etc. (同 Beatmapset)
  total_length: number; // 秒
  cs: number;
  drain: number; // HP
  accuracy: number; // OD
  ar: number;
  bpm: number;
  count_circles: number;
  count_sliders: number;
  count_spinners: number;
  url: string; // 谱面链接，例如 https://osu.ppy.sh/beatmaps/xxxxxxxx
  version: string; // 难度名 (Diffname)
  // 通常 Osu! API v2 在 Score 对象中嵌套的 beatmap 对象不直接包含 beatmapset，
  // 而是 beatmapset 对象与 beatmap 平级或者在 score.beatmapset。
  // 这里为了 Score 接口的完整性，我假设 beatmapset 在 Score 对象中是独立的。
  // 如果API直接在Beatmap内返回Beatmapset，则取消下面一行的注释。
  // beatmapset?: Beatmapset; // 如果API这样返回
  // ... 其他谱面难度信息 (如 max_combo)
}

export interface ScoreStatistics {
  count_300: number;
  count_100: number;
  count_50: number;
  count_miss: number;
  count_geki?: number; // For mania mode (equivalent to 300g)
  count_katu?: number; // For mania mode (equivalent to 100k)
  // ... 其他统计
}

export interface Score {
  id: number; // Score ID (通常是 score ID on a specific beatmap, not a global unique ID across all scores)
  best_id?: number; // ID of this score if it's the user's best score on the map, otherwise null
  user_id: number;
  accuracy: number; // 0.0 to 1.0
  mods: string[]; // 例如 ["HD", "DT"]
  score: number;
  max_combo: number;
  perfect: boolean; // True if Cperfect combo (no misses, no slider breaks)
  statistics: ScoreStatistics;
  passed: boolean; // True if the score is a pass
  pp: number | null;
  rank: string; // XH, X, SH, S, A, B, C, D
  created_at: string; // ISO 8601 timestamp
  mode: string; // osu, taiko, fruits, mania
  mode_int: number; // 0 for osu, 1 for taiko, 2 for catch, 3 for mania
  replay: boolean; // If a replay is available for the score
  // API v2 通常会将 beatmap 和 beatmapset 对象作为 score 的顶级属性返回
  beatmap: Beatmap;
  beatmapset: Beatmapset;
  // user?: OsuUserProfile; // 有时 API 也会嵌套用户信息
  // weight?: { percentage: number; pp: number }; // 如果是获取 top scores，可能会有权重信息
}
// --- 接口定义结束 ---

interface PlayHistoryState {
  scores: Score[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  nextCursorParams: Record<string, unknown> | null;
  hasMore: boolean;
}

const ALL_MODES = ['osu', 'taiko', 'fruits', 'mania'];

export const usePlayHistoryStore = defineStore('playHistory', {
  state: (): PlayHistoryState => ({
    scores: [],
    isLoadingInitial: false,
    isLoadingMore: false,
    error: null,
    nextCursorParams: null,
    hasMore: true,
  }),
  actions: {
    /**
     * 获取指定用户最近的游玩记录。
     * 如果不提供 userId，则尝试获取当前已登录用户的记录。
     */
    async fetchScores(
      userId?: number,
      mode: string = 'osu',
      _limit?: number, // 不再使用
      includeFails: boolean = true,
    ) {
      this.isLoadingInitial = true;
      this.scores = [];
      this.nextCursorParams = null;
      this.hasMore = false;
      this.error = null;
      const authStore = useAuthStore();
      let targetUserId = userId;
      if (!targetUserId) {
        if (authStore.isAuthenticated && authStore.user) targetUserId = authStore.user.id;
        else {
          this.error = 'User not authenticated.';
          this.isLoadingInitial = false;
          return;
        }
      }
      if (!authStore.accessToken) {
        this.error = 'Access token missing.';
        this.isLoadingInitial = false;
        return;
      }
      try {
        let allScores: Score[] = [];
        if (mode === 'all') {
          // 并发请求所有模式
          const requests = ALL_MODES.map((m) => {
            const params: Record<string, unknown> = {
              mode: m,
              limit: 1000,
              include_fails: includeFails ? 1 : 0,
            };
            console.log(`[PlayHistoryStore] Fetching mode "${m}" with params:`, params);
            return osuHttpService
              .get<Score[]>(`/users/${targetUserId}/scores/recent`, {
                params,
                headers: { Authorization: `Bearer ${authStore.accessToken}` },
              })
              .then((res) => {
                console.log(`[PlayHistoryStore] Mode "${m}" returned ${res.data.length} scores`);
                return res.data;
              })
              .catch((error) => {
                console.error(`[PlayHistoryStore] Mode "${m}" failed:`, error);
                return [];
              });
          });
          const results = await Promise.all(requests);
          allScores = results.flat();
          // 按时间降序排序
          allScores.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          this.scores = allScores;
          this.hasMore = false;
          this.nextCursorParams = null;
          console.log(`[PlayHistoryStore] Fetched (all modes) ${allScores.length} scores.`);
        } else {
          // 递归拉取所有recent成绩，直到API返回空
          let offset = 0;
          let keepFetching = true;
          const all: Score[] = [];
          console.log(`[PlayHistoryStore] Fetching single mode "${mode}"`);
          while (keepFetching) {
            const params: Record<string, unknown> = {
              mode: mode,
              limit: 100,
              include_fails: includeFails ? 1 : 0,
              offset,
            };
            console.log(`[PlayHistoryStore] Single mode "${mode}" request with params:`, params);
            const response = await osuHttpService.get<Score[]>(
              `/users/${targetUserId}/scores/recent`,
              {
                params,
                headers: { Authorization: `Bearer ${authStore.accessToken}` },
              },
            );

            console.log('[PlayHistoryStore] Raw response:', response);
            console.log('[PlayHistoryStore] Response data:', response.data);
            console.log('[PlayHistoryStore] Response data type:', typeof response.data);

            if (!response.data) {
              throw new Error('No scores data received from API');
            }

            const newScores = Array.isArray(response.data) ? response.data : [];
            console.log(
              `[PlayHistoryStore] Single mode "${mode}" returned ${newScores.length} scores`,
            );
            if (newScores.length === 0) {
              keepFetching = false;
            } else {
              all.push(...newScores);
              offset += newScores.length;
              if (newScores.length < 100) keepFetching = false;
            }
          }
          this.scores = all;
          this.hasMore = false;
          this.nextCursorParams = null;
          console.log(`[PlayHistoryStore] Fetched ${all.length} scores (no pagination).`);
        }
      } catch (error) {
        console.error('[PlayHistoryStore] Fetch error:', error);
        this.error = error instanceof Error ? error.message : 'Failed to fetch scores.';
        this.scores = [];
      } finally {
        this.isLoadingInitial = false;
      }
    },

    // 加载更多功能无效化
    loadMoreRecentScores() {
      // no-op
      return;
    },

    /**
     * 清除当前存储的游玩记录和错误状态。
     * 通常在用户登出或切换筛选条件（如游戏模式）时调用。
     */
    clearScores() {
      this.scores = [];
      this.error = null;
      this.isLoadingInitial = false;
      this.isLoadingMore = false;
      this.nextCursorParams = null;
      this.hasMore = true;
    },
  },
});
