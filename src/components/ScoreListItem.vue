// src/components/ScoreListItem.vue
<template>
  <q-item
    clickable
    v-ripple
    class="score-list-item rounded-borders q-my-xs"
    :class="{ 'score-passed': score.passed, 'score-failed': !score.passed && shouldHighlightFails }"
    @click="onItemContentClick"
  >
    <!-- 左侧：谱面封面图 -->
    <q-item-section avatar class="score-item-avatar">
      <q-avatar rounded size="64px">
        <img
          :src="beatmapCoverUrl"
          :alt="`${score.beatmapset.title} cover`"
          @error="onImageError"
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            background: #222;
          "
          draggable="false"
        />
      </q-avatar>
    </q-item-section>

    <!-- 中间：主要信息 -->
    <q-item-section class="score-item-content">
      <q-item-label lines="1" class="text-subtitle1 text-weight-bold title-line">
        <span class="text-primary" v-if="score.perfect && score.passed">FC </span>
        {{ score.beatmapset.artist_unicode || score.beatmapset.artist }} -
        {{ score.beatmapset.title_unicode || score.beatmapset.title }}
      </q-item-label>

      <q-item-label caption lines="1" class="diff-line">
        <!-- 移除问题图标，避免重叠 -->
        [{{ score.beatmap.version }}] mapped by {{ score.beatmapset.creator }}
        <q-chip
          dense
          square
          :label="`${score.beatmap.difficulty_rating.toFixed(2)} ★`"
          :style="starChipStyle(score.beatmap.difficulty_rating)"
          size="sm"
          class="q-ml-sm star-chip"
        />
      </q-item-label>

      <q-item-label caption lines="1" class="stats-line">
        <q-badge
          :label="score.rank"
          :color="rankColor(score.rank)"
          class="q-mr-sm rank-badge flex flex-center items-center justify-center"
          style="
            min-width: 28px;
            height: 28px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1rem;
            border-radius: 6px;
          "
        />
        Score: <span class="text-weight-medium">{{ score.score.toLocaleString() }}</span>
        <span class="q-mx-xs">|</span>
        Acc: <span class="text-weight-medium">{{ (score.accuracy * 100).toFixed(2) }}%</span>
        <span v-if="score.pp !== null" class="q-ml-xs">
          <span class="q-mx-xs">|</span>
          PP: <span class="text-weight-medium text-accent">{{ Math.round(score.pp) }}</span>
        </span>
        <span class="q-mx-xs">|</span>
        Combo: <span class="text-weight-medium">{{ score.max_combo }}x</span>
      </q-item-label>

      <q-item-label caption lines="1" class="mods-line q-mt-xs">
        <q-chip
          v-for="mod in score.mods.filter((m) => m !== 'AP' && m !== 'NM')"
          :key="mod"
          dense
          square
          :color="modColor(mod)"
          text-color="white"
          size="xs"
          class="q-mr-xs mod-chip"
        >
          {{ mod }}
        </q-chip>
      </q-item-label>
    </q-item-section>

    <!-- 右侧：时间和下载按钮 -->
    <q-item-section side top class="score-item-side">
      <q-item-label caption class="played-at-time">{{
        formatPlayedAt(score.created_at)
      }}</q-item-label>

      <!-- 下载按钮和进度 -->
      <div class="download-section q-mt-sm">
        <!-- 下载进度 -->
        <div v-if="downloadProgress" class="download-progress q-mb-xs">
          <q-linear-progress
            :value="downloadProgress.progress / 100"
            color="primary"
            size="3px"
            class="q-mb-xs"
          />
          <q-item-label caption class="text-center text-caption">
            {{
              downloadProgress.status === 'downloading'
                ? 'Downloading...'
                : downloadProgress.status === 'extracting'
                  ? 'Extracting...'
                  : downloadProgress.status === 'completed'
                    ? 'Completed!'
                    : 'Error'
            }}
          </q-item-label>
        </div>

        <!-- 下载按钮 -->
        <q-btn
          flat
          dense
          round
          :icon="downloadProgress?.status === 'completed' ? 'check_circle' : 'download'"
          :color="
            downloadProgress?.status === 'completed'
              ? 'positive'
              : downloadProgress?.status === 'error'
                ? 'negative'
                : 'grey-7'
          "
          :loading="
            downloadProgress?.status === 'downloading' || downloadProgress?.status === 'extracting'
          "
          @click.stop="handleDownloadClick"
          :disable="downloadProgress?.status === 'completed'"
          aria-label="Download beatmap"
        >
          <q-tooltip anchor="top middle" self="bottom middle" class="bg-dark text-caption">
            {{
              downloadProgress?.status === 'completed'
                ? 'Downloaded'
                : downloadProgress?.status === 'downloading'
                  ? 'Downloading...'
                  : downloadProgress?.status === 'extracting'
                    ? 'Extracting...'
                    : downloadProgress?.status === 'error'
                      ? 'Download failed'
                      : 'Download MP3 music files (sound effects excluded)'
            }}
          </q-tooltip>
        </q-btn>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { type Score } from 'src/stores/playHistory'; // 确认路径
import { formatDistanceToNowStrict, parseISO } from 'date-fns'; // npm install date-fns
import { useQuasar } from 'quasar';
import type { CSSProperties } from 'vue';
import { useBeatmapDownloadService } from 'src/services/business/beatmapDownloadService';

const props = defineProps({
  score: {
    type: Object as PropType<Score>,
    required: true,
  },
  // 可选 prop，用于决定是否特别高亮失败的成绩
  shouldHighlightFails: {
    type: Boolean,
    default: false, // 默认不高亮失败
  },
});

const $q = useQuasar();
const downloadService = useBeatmapDownloadService();

// 计算下载进度
const downloadProgress = computed(() => {
  const beatmapsetId = props.score.beatmapset?.id;
  return beatmapsetId ? downloadService.getDownloadProgress(beatmapsetId) : undefined;
});

const defaultCover = 'https://assets.ppy.sh/beatmaps/covers/default.jpg'; // 备用封面图

const beatmapCoverUrl = computed(() => {
  // 优先使用 API 提供的 covers 对象中的 list 或 card 尺寸
  // Osu! API v2 的 Beatmapset 对象通常有 covers.list 或 covers.card
  return (
    props.score.beatmapset?.covers?.list || // 优先用 list 尺寸
    props.score.beatmapset?.covers?.card || // 其次用 card 尺寸
    props.score.beatmapset?.covers?.cover || // 再次用 cover (可能是大图)
    `https://assets.ppy.sh/beatmaps/${props.score.beatmap.beatmapset_id}/covers/list.jpg` || // 尝试构建一个常见的封面URL
    defaultCover
  );
});

const onImageError = (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  imgElement.src = defaultCover;
};

const rankColor = (rank: string) => {
  const colors: Record<string, string> = {
    XH: 'purple-5',
    X: 'deep-purple-5', // SS+ / SS
    SH: 'amber-7',
    S: 'amber-6', // S+ / S
    A: 'light-green-6',
    B: 'light-blue-6',
    C: 'orange-6',
    D: 'red-6',
    F: 'blue-grey-5',
  };
  return colors[rank.toUpperCase()] || 'grey-7';
};

const modColor = (mod: string) => {
  // 示例：可以为特定 mod 定义颜色
  const modColors: Record<string, string> = {
    HD: 'blue-7',
    HR: 'red-7',
    DT: 'purple-7',
    NC: 'pink-7',
    FL: 'indigo-7',
    EZ: 'green-7',
    NF: 'grey-8',
    HT: 'teal-7',
    // ...
  };
  return modColors[mod.toUpperCase()] || 'blue-grey-8';
};

const formatPlayedAt = (dateTimeString: string) => {
  try {
    return formatDistanceToNowStrict(parseISO(dateTimeString), { addSuffix: true });
  } catch (e) {
    console.warn(`[ScoreListItem] Failed to parse date: ${dateTimeString}`, e);
    return 'Unknown time';
  }
};

const onItemContentClick = () => {
  const beatmapsetId = props.score.beatmapset?.id;
  const beatmapUrl = props.score.beatmap?.url; // API v2 的 Beatmap 对象通常有 url 字段

  console.log('Clicked score content:', props.score.id, props.score.beatmapset?.title);
  if (beatmapUrl && window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('open-external-url', beatmapUrl);
  } else if (beatmapUrl) {
    window.open(beatmapUrl, '_blank');
  } else if (beatmapsetId && window.electron?.ipcRenderer) {
    // 备用：如果只有 beatmapset_id
    window.electron.ipcRenderer.send(
      'open-external-url',
      `https://osu.ppy.sh/beatmapsets/${beatmapsetId}`,
    );
  } else if (beatmapsetId) {
    window.open(`https://osu.ppy.sh/beatmapsets/${beatmapsetId}`, '_blank');
  }
};

const handleDownloadClick = async () => {
  const beatmapsetId = props.score.beatmapset?.id;
  const beatmapTitle = props.score.beatmapset?.title_unicode || props.score.beatmapset?.title;

  if (!beatmapsetId || !beatmapTitle) {
    $q.notify({
      message: 'Missing beatmap information for download',
      icon: 'error',
      color: 'negative',
      position: 'top',
    });
    return;
  }

  // 检查是否已在下载中
  if (downloadService.isDownloading(beatmapsetId)) {
    $q.notify({
      message: `"${beatmapTitle}" is already downloading`,
      icon: 'info',
      color: 'info',
      position: 'top',
    });
    return;
  }

  console.log(
    `[ScoreListItem] Starting download for beatmapset ID: ${beatmapsetId} - ${beatmapTitle}`,
  );

  // 显示开始下载通知
  $q.notify({
    message: `Starting download: ${beatmapTitle}`,
    icon: 'download',
    color: 'info',
    timeout: 2000,
    position: 'top',
  });

  try {
    await downloadService.downloadBeatmap(beatmapsetId, beatmapTitle);

    // 成功通知
    $q.notify({
      message: `Successfully downloaded: ${beatmapTitle}`,
      icon: 'check_circle',
      color: 'positive',
      timeout: 3000,
      position: 'top',
    });
  } catch (error) {
    console.error('[ScoreListItem] Download failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Download failed';

    // 错误通知
    $q.notify({
      message: `Download failed: ${errorMessage}`,
      icon: 'error',
      color: 'negative',
      timeout: 5000,
      position: 'top',
    });
  }
};

// --- 修改：计算星级芯片的样式 (基于 2021 年网站更新后的细化颜色分级) ---
const starChipStyle = (difficultyRating: number): CSSProperties => {
  let backgroundColor: string;
  let textColor: string;
  if (difficultyRating >= 0 && difficultyRating < 2.0) {
    // 0.0★ – 1.99★
    backgroundColor = '#66CC00'; // 深绿色 (Dark Green)
    textColor = '#000000';
  } else if (difficultyRating < 2.7) {
    // 2.0★ – 2.69★
    backgroundColor = '#00CCCC'; // 青色 (Teal)
    textColor = '#000000';
  } else if (difficultyRating < 4.0) {
    // 2.7★ – 3.99★
    backgroundColor = '#FFCC00'; // 黄色 (Yellow)
    textColor = '#000000';
  } else if (difficultyRating < 5.0) {
    // 4.0★ – 4.99★
    backgroundColor = '#FF6600'; // 橙色 (Orange)
    textColor = '#000000';
  } else if (difficultyRating < 5.3) {
    // 5.0★ – 5.29★
    backgroundColor = '#FF66CC'; // 粉红色 (Pink-ish)
    textColor = '#000000';
  } else if (difficultyRating < 6.0) {
    // 5.3★ – 5.99★
    backgroundColor = '#9933FF'; // 紫色 (Purple)
    textColor = '#FFFFFF';
  } else if (difficultyRating < 6.5) {
    // 6.0★ – 6.49★
    backgroundColor = '#6600CC'; // 深紫色 (Deep Purple)
    textColor = '#FFFFFF';
  } else if (difficultyRating < 8.0) {
    // 6.5★ – 7.99★
    backgroundColor = '#4B0082'; // 深紫渐黑 (Indigo / Dark Violet)
    textColor = '#FFFFFF';
  } else {
    // ≥8.0★
    backgroundColor = '#333333'; // 黑色 (Black)
    textColor = '#FFFFFF';
  }
  return {
    backgroundColor,
    color: textColor,
  };
};
// --- 修改结束 ---
</script>

<style lang="scss" scoped>
@use 'sass:color';

// 假设 $primary, $accent, $dark-page 等变量已通过 quasar.variables.scss 或 app.scss 全局可用
// 如果没有，你可能需要 @import 相关的 SCSS 文件或直接使用 CSS 变量

.score-list-item {
  background-color: color.adjust($dark-page, $lightness: 3%); // 比页面背景稍亮一点
  transition: background-color 0.2s ease-in-out;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important; // 细微的分隔线

  &:hover {
    background-color: color.adjust($dark-page, $lightness: 8%);
  }

  &.score-failed {
    border-left: 3px solid $negative; // 左侧用颜色标记失败
    opacity: 0.75; // 失败的成绩稍微降低透明度
    &:hover {
      opacity: 1;
    }
  }
}

.score-item-avatar {
  padding-right: 16px; // 头像和内容间的间距
  .q-avatar img {
    object-fit: cover; // 确保图片填满
    border-radius: calc($border-radius-root / 2); // 与 item 圆角协调
  }
}

.score-item-content {
  .title-line {
    color: $page-text; // 确保主要文本颜色
    .text-primary {
      // FC 标记
      font-weight: bold;
    }
  }
  .diff-line,
  .stats-line,
  .mods-line {
    color: color.adjust($page-text, $alpha: -0.3); // caption 文本颜色稍暗
    font-size: 0.8rem;
  }
  .star-chip {
    font-size: 0.75rem;
    padding: 2px 6px;
    height: auto;
    line-height: 1.2;
    border-radius: 4px;
    font-weight: 600;
  }
  .rank-badge {
    font-weight: bold;
    min-width: 28px;
    text-align: center;
  }
  .mod-chip {
    padding: 1px 5px;
    height: auto;
    line-height: 1.3;
    font-weight: 500;
  }
  .text-accent {
    // PP 值颜色
    color: $accent !important; // 使用你在 quasar.variables.scss 定义的 $accent
    font-weight: bold;
  }
}

.score-item-side {
  align-items: flex-end; // 右侧内容靠上对齐
  .played-at-time {
    font-size: 0.75rem;
    color: color.adjust($page-text, $alpha: -0.4);
  }
  .download-button {
    &:hover {
      color: $primary !important; // 下载按钮悬停时使用主色
    }
  }
}

// 确保圆角生效
.rounded-borders {
  border-radius: $border-radius-root;
}
</style>
