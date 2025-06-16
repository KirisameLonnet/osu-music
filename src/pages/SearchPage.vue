<template>
  <q-page padding class="search-page">
    <!-- 搜索标题 -->
    <div class="search-header q-mb-lg">
      <h4 class="q-mt-none q-mb-md text-h4 text-white">🔍 Search OSU! Music</h4>
      <q-separator dark spaced class="q-mb-lg" />
    </div>

    <!-- 搜索框和过滤器 -->
    <div class="search-controls q-mb-xl">
      <!-- 主搜索框 -->
      <div class="search-input-container q-mb-md">
        <q-input
          v-model="searchQuery"
          placeholder="Search for songs, artists, or beatmaps..."
          filled
          dark
          class="search-input"
          @keyup.enter="() => performSearch()"
          clearable
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
          <template #append>
            <q-btn
              flat
              round
              icon="search"
              color="primary"
              @click="() => performSearch()"
              :loading="isSearching"
              :disable="!searchQuery.trim()"
            />
          </template>
        </q-input>
      </div>

      <!-- 过滤器行 -->
      <div class="search-filters row q-gutter-md">
        <!-- 游戏模式 -->
        <q-select
          v-model="selectedMode"
          :options="modeOptions"
          option-value="value"
          option-label="label"
          filled
          dark
          label="Game Mode"
          class="col-auto"
          style="min-width: calc(150px)"
          @update:model-value="onFilterChange"
        />

        <!-- 排序方式 -->
        <q-select
          v-model="sortBy"
          :options="sortOptions"
          option-value="value"
          option-label="label"
          filled
          dark
          label="Sort By"
          class="col-auto"
          style="min-width: calc(150px)"
          @update:model-value="onFilterChange"
        />

        <!-- 状态过滤 -->
        <q-select
          v-model="statusFilter"
          :options="statusOptions"
          option-value="value"
          option-label="label"
          filled
          dark
          label="Status"
          class="col-auto"
          style="min-width: calc(130px)"
          @update:model-value="onFilterChange"
        />

        <!-- 重置按钮 -->
        <q-btn
          flat
          color="secondary"
          icon="refresh"
          label="Reset"
          @click="resetFilters"
          class="col-auto"
        />
      </div>
    </div>

    <!-- 搜索结果区域 -->
    <div class="search-results">
      <!-- 加载状态 -->
      <div v-if="isSearching" class="loading-container text-center q-py-xl">
        <q-spinner-hourglass size="40px" color="primary" />
        <p class="text-grey-6 q-mt-md">Searching OSU! beatmaps...</p>
      </div>

      <!-- 无搜索结果 -->
      <div
        v-else-if="searchPerformed && (!searchResults || searchResults.length === 0)"
        class="no-results text-center q-py-xl"
      >
        <q-icon name="search_off" size="60px" color="grey-6" />
        <h5 class="text-grey-6 q-mt-md">No Results Found</h5>
        <p class="text-grey-7">Try adjusting your search terms or filters.</p>
      </div>

      <!-- 搜索结果列表 -->
      <div v-else-if="searchResults && searchResults.length > 0" class="results-container">
        <!-- 结果统计 -->
        <div class="results-info q-mb-md">
          <p class="text-grey-6">
            Found {{ totalResults }} beatmaps
            <span v-if="searchQuery.trim()">for "{{ searchQuery.trim() }}"</span>
          </p>
        </div>

        <!-- Beatmap 列表 -->
        <div class="beatmap-grid">
          <BeatmapCard
            v-for="beatmapset in searchResults"
            :key="beatmapset.id"
            :beatmapset="beatmapset"
            @click="openBeatmapDetails(beatmapset)"
          />
        </div>
      </div>

      <!-- 默认状态 -->
      <div v-else class="default-state text-center q-py-xl">
        <q-icon name="music_note" size="80px" color="grey-5" />
        <h5 class="text-grey-5 q-mt-md">Discover OSU! Music</h5>
        <p class="text-grey-6">
          Search for your favorite songs, artists, or beatmaps.<br />
          Use the filters to narrow down your results.
        </p>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { osuHttpService } from 'src/services/api/httpService';
import { useAuthStore } from 'src/stores/authStore';
import BeatmapCard from 'src/components/BeatmapCard.vue';

interface BeatmapSet {
  id: number;
  title: string;
  title_unicode?: string;
  artist: string;
  artist_unicode?: string;
  creator: string;
  source: string;
  status: string;
  bpm: number;
  play_count: number;
  favourite_count: number;
  submitted_date: string;
  last_updated: string;
  tags: string;
  covers: {
    cover: string;
    cover2x: string;
    card: string;
    card2x: string;
    list: string;
    list2x: string;
    slimcover: string;
    slimcover2x: string;
  };
  beatmaps: Array<{
    id: number;
    mode: string;
    difficulty_rating: number;
    version: string;
    accuracy: number;
    ar: number;
    bpm: number;
    cs: number;
    drain: number;
    total_length: number;
    hit_length: number;
    count_circles: number;
    count_sliders: number;
    count_spinners: number;
  }>;
}

interface SearchParams extends Record<string, unknown> {
  q?: string;
  m?: number;
  s?: string;
  sort?: string;
}

const $q = useQuasar();
const authStore = useAuthStore();

// 搜索状态
const searchQuery = ref('');
const searchResults = ref<BeatmapSet[]>([]);
const isSearching = ref(false);
const searchPerformed = ref(false);
const totalResults = ref(0);

// 过滤器选项
const selectedMode = ref({ value: null, label: 'All Modes' });
const sortBy = ref({ value: 'relevance', label: 'Relevance' });
const statusFilter = ref({ value: 'ranked', label: 'Ranked & Approved' });

const modeOptions = [
  { value: null, label: 'All Modes' },
  { value: 0, label: 'Standard' },
  { value: 1, label: 'Taiko' },
  { value: 2, label: 'Catch' },
  { value: 3, label: 'Mania' },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'updated', label: 'Last Updated' },
  { value: 'ranked', label: 'Ranked Date' },
  { value: 'rating', label: 'Rating' },
  { value: 'plays', label: 'Play Count' },
  { value: 'favourites', label: 'Favourites' },
];

const statusOptions = [
  { value: 'any', label: 'Any Status' },
  { value: 'ranked', label: 'Ranked & Approved' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'loved', label: 'Loved' },
  { value: 'pending', label: 'Pending' },
  { value: 'graveyard', label: 'Graveyard' },
];

// 构建搜索参数
const buildSearchParams = (): SearchParams => {
  const params: SearchParams = {};

  if (searchQuery.value.trim()) {
    params.q = searchQuery.value.trim();
  }

  if (selectedMode.value.value !== null) {
    params.m = selectedMode.value.value;
  }

  if (statusFilter.value.value !== 'any') {
    params.s = statusFilter.value.value;
  }

  if (sortBy.value.value !== 'relevance') {
    params.sort = sortBy.value.value;
  }

  return params;
};

// 执行搜索
const performSearch = async () => {
  if (!authStore.isAuthenticated) {
    $q.notify({
      type: 'warning',
      message: 'Please login to search beatmaps',
      icon: 'warning',
    });
    return;
  }

  isSearching.value = true;
  searchResults.value = [];

  try {
    const params = buildSearchParams();

    const response = await osuHttpService.get<{
      beatmapsets: BeatmapSet[];
      cursor?: { approved_date?: string; _id?: string };
      total?: number;
    }>('/beatmapsets/search', {
      params,
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    });

    console.log('[SearchPage] Raw response:', response);
    console.log('[SearchPage] Response data:', response.data);
    console.log('[SearchPage] Response data type:', typeof response.data);

    // 检查数据结构
    if (!response.data) {
      throw new Error('No data received from API');
    }

    const responseData = response.data;
    const beatmapsets = responseData.beatmapsets || [];
    const total = responseData.total || 0;

    if (!Array.isArray(beatmapsets)) {
      console.error('[SearchPage] beatmapsets is not an array:', beatmapsets);
      throw new Error('Invalid response format: beatmapsets is not an array');
    }

    searchResults.value = beatmapsets;
    searchPerformed.value = true;

    // 更新结果信息
    totalResults.value = total || beatmapsets.length;

    console.log(`[SearchPage] Found ${beatmapsets.length} beatmaps`);
  } catch (error: unknown) {
    console.error('[SearchPage] Search error:', error);

    // 确保 searchResults 始终是一个数组
    searchResults.value = [];
    searchPerformed.value = true;
    totalResults.value = 0;

    // 简化的错误处理
    let errorMessage = 'Failed to search beatmaps';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    $q.notify({
      type: 'negative',
      message: `Search failed: ${errorMessage}`,
      icon: 'error',
    });
  } finally {
    isSearching.value = false;
  }
};

// 过滤器变化时重新搜索
const onFilterChange = () => {
  if (searchPerformed.value) {
    void performSearch();
  }
};

// 重置过滤器
const resetFilters = () => {
  searchQuery.value = '';
  selectedMode.value = { value: null, label: 'All Modes' };
  sortBy.value = { value: 'relevance', label: 'Relevance' };
  statusFilter.value = { value: 'ranked', label: 'Ranked & Approved' };
  searchResults.value = [];
  searchPerformed.value = false;
};

// 打开谱面详情
const openBeatmapDetails = (beatmapset: BeatmapSet) => {
  const url = `https://osu.ppy.sh/beatmapsets/${beatmapset.id}`;

  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('open-external-url', url);
  } else {
    window.open(url, '_blank');
  }
};

// 组件挂载时检查认证状态
onMounted(() => {
  if (!authStore.isAuthenticated) {
    $q.notify({
      type: 'info',
      message: 'Please login to access search functionality',
      icon: 'info',
      timeout: 3000,
    });
  }
});
</script>

<style lang="scss" scoped>
.search-page {
  max-width: 1200px;
  margin: 0 auto;
}

.search-header {
  .text-h4 {
    font-weight: 600;
    background: linear-gradient(135deg, #ff6b9d, #ffa500);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.search-input-container {
  .search-input {
    max-width: calc(600px);
    margin: calc(0 auto);

    :deep(.q-field__control) {
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }

    :deep(.q-field__native) {
      font-size: 16px;
    }
  }
}

.search-filters {
  justify-content: center;
  flex-wrap: wrap;

  .q-select {
    :deep(.q-field__control) {
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
    }
  }
}

.beatmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(320px), 1fr));
  gap: calc(20px);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: calc(16px);
  }
}

.loading-container,
.no-results,
.default-state {
  min-height: calc(300px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.results-info {
  text-align: center;
  font-size: 14px;
}

// 响应式设计
@media (max-width: 600px) {
  .search-filters {
    .row {
      flex-direction: column;
      align-items: stretch;
    }

    .q-select,
    .q-btn {
      width: calc(100%);
      margin-bottom: calc(8px);
    }
  }
}
</style>
