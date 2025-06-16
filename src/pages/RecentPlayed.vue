// src/pages/RecentPlaysPage.vue
<template>
  <q-page padding class="recent-plays-page text-page-text">
    <div class="page-content-container q-mx-auto">
      <!-- 页面头部 -->
      <div class="row items-center justify-between q-mb-lg">
        <h4 class="q-my-none text-h4 page-title">Recent Plays - 24 Hours</h4>
        <q-btn flat dense round icon="refresh" @click="refreshScores"
          :loading="playHistoryStore.isLoadingInitial && playHistoryStore.scores.length === 0" color="primary"
          aria-label="Refresh scores">
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
      </div>

      <!-- 模式选择器 -->
      <div class="mode-selector q-mb-lg">
        <q-btn-toggle v-model="selectedMode" toggle-color="primary" :options="modeOptions"
          @update:model-value="onModeChange" unelevated rounded />
      </div>

      <!-- 加载状态 -->
      <div v-if="playHistoryStore.isLoadingInitial && playHistoryStore.scores.length === 0" class="loading-state">
        <q-spinner-gears color="primary" size="3.5rem" />
        <p class="q-mt-md text-body1 text-grey-5">Loading your recent plays...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="playHistoryStore.error && playHistoryStore.scores.length === 0" class="error-state">
        <q-icon name="error_outline" color="negative" size="3rem" />
        <p class="q-mt-sm text-h6 text-negative">Oops! Something went wrong.</p>
        <p class="text-body2 text-grey-5">{{ playHistoryStore.error }}</p>
        <q-btn label="Try Again" @click="refreshScores" color="negative" unelevated class="q-mt-md" />
      </div>

      <!-- 无数据状态 -->
      <div v-else-if="!playHistoryStore.isLoadingInitial && playHistoryStore.scores.length === 0" class="empty-state">
        <q-icon name="sentiment_very_dissatisfied" color="grey-7" size="3.5rem" />
        <p class="q-mt-sm text-h6 text-grey-6">No Recent Plays Found</p>
        <p class="text-body2 text-grey-5">
          It seems you haven't played recently in this mode, or we couldn't fetch your scores.
        </p>
      </div>

      <!-- 得分列表 -->
      <q-list v-if="scoresWithin24h.length > 0" bordered separator class="score-list bg-dark-elevated rounded-borders">
        <ScoreListItem v-for="score in scoresWithin24h" :key="score.id" :score="score" />
      </q-list>

      <!-- 加载更多按钮 -->
      <div v-if="showLoadMore" class="row justify-center q-my-md">
        <q-btn label="获取更多" color="primary" :loading="playHistoryStore.isLoadingMore" @click="onLoadMoreBtn" unelevated
          rounded icon="expand_more" />
      </div>

      <!-- 加载更多失败提示 -->
      <div v-if="playHistoryStore.isLoadingMore && playHistoryStore.error" class="text-center text-negative q-my-md">
        Failed to load more: {{ playHistoryStore.error }}
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, watch, computed, ref } from 'vue';
import { usePlayHistoryStore } from 'src/stores/playHistory';
import { useAuthStore } from 'src/stores/authStore';
import ScoreListItem from 'src/components/ScoreListItem.vue';

const playHistoryStore = usePlayHistoryStore();
const authStore = useAuthStore();

// 模式选择
const selectedMode = ref('all');
const modeOptions = [
  { label: 'All Modes', value: 'all' },
  { label: 'osu!', value: 'osu' },
  { label: 'osu!taiko', value: 'taiko' },
  { label: 'osu!catch', value: 'fruits' },
  { label: 'osu!mania', value: 'mania' },
];

const refreshScores = () => {
  if (authStore.user?.id) {
    // 使用选中的模式
    void playHistoryStore.fetchScores(authStore.user.id, selectedMode.value);
  } else {
    playHistoryStore.clearScores();
    playHistoryStore.error = 'Please login to view your recent plays.';
  }
};

// 模式变化时重新获取数据
const onModeChange = () => {
  if (authStore.isAuthenticated && authStore.user) {
    refreshScores();
  }
};

// 只展示24小时内的成绩
const scoresWithin24h = computed(() => {
  const now = Date.now();
  return playHistoryStore.scores.filter((score) => {
    const created = new Date(score.created_at).getTime();
    return now - created <= 24 * 60 * 60 * 1000;
  });
});

// “获取更多”按钮逻辑：只要有更多且最后一条在24小时内就显示
const showLoadMore = computed(() => {
  if (!playHistoryStore.hasMore || scoresWithin24h.value.length === 0) return false;
  const last = playHistoryStore.scores[playHistoryStore.scores.length - 1];
  if (!last) return false;
  const lastTime = new Date(last.created_at).getTime();
  return Date.now() - lastTime <= 24 * 60 * 60 * 1000;
});

const onLoadMoreBtn = () => {
  if (!authStore.user?.id || !playHistoryStore.hasMore) return;
  playHistoryStore.loadMoreRecentScores();
};

onMounted(() => {
  if (authStore.isAuthenticated && authStore.user) {
    if (
      playHistoryStore.scores.length === 0 &&
      !playHistoryStore.isLoadingInitial &&
      !playHistoryStore.error
    ) {
      refreshScores();
    }
  } else {
    playHistoryStore.clearScores();
    playHistoryStore.error = 'Login required to see your recent plays.';
  }
});

watch(
  () => authStore.isAuthenticated,
  (isAuth, wasAuth) => {
    if (isAuth && authStore.user) {
      if (
        (!wasAuth || playHistoryStore.scores.length === 0) &&
        !playHistoryStore.isLoadingInitial &&
        !playHistoryStore.error
      ) {
        refreshScores();
      }
    } else if (!isAuth) {
      playHistoryStore.clearScores();
      playHistoryStore.error = 'Login required to see your recent plays.';
    }
  },
  { immediate: false },
);
</script>

<style lang="scss" scoped>
@use 'sass:color'; // 确保在 scss 文件顶部导入，如果变量依赖它

// 从 quasar.variables.scss 导入变量 (如果它们没有被全局注入)
// 或者直接使用你在 quasar.variables.scss 中定义的 CSS 变量 (如果 Quasar 配置了)
// 为简化，我们假设 $primary, $dark-page, $page-text 等变量在此作用域可用
// 如果不可用，你可能需要 @import '../css/quasar.variables.scss'; (调整路径)
// 或者直接使用硬编码的颜色值，但不推荐。


.page-content-container {
  max-width: 900px; // 限制内容最大宽度，使其在大屏幕上更易读
}

.page-title {
  // 可以添加与你的 AppLogo 标题相似的样式
  font-weight: 600;
  letter-spacing: 0.02em;
}



.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 300px; // 给一些最小高度，使其在内容少时也能居中
  padding: var(--q-gutter-xl, 32px); // 使用 Quasar 的 gutter 变量
  // background-color: color.adjust($dark-page, $lightness: 3%); // 轻微不同的背景
  // border-radius: $border-radius-root;
  // margin-top: var(--q-gutter-md, 16px);
}

// 如果你想让 q-select 的下拉菜单也应用深色主题中定义的颜色
// 你可以在 q-select 上使用 popup-content-class 属性
// 例如: popup-content-class="bg-dark-elevated text-page-text"
// 然后定义 .bg-dark-elevated:
// .bg-dark-elevated { background-color: color.adjust($dark-page, $lightness: 8%); }
// (已经在 <q-select> 的 popup-content-class 中添加了)</style>
