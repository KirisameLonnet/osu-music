<template>
  <q-page class="split-screen-test-page">
    <div class="test-container">
      <div class="header-section">
        <h1 class="text-h4 text-center q-mb-md">iPad 分屏 + Edge-to-Edge 测试</h1>
        <p class="text-body2 text-center q-mb-lg">测试 iPad 分屏模式和 Edge-to-Edge 的兼容性</p>
      </div>

      <div class="info-cards">
        <!-- 环境检测 -->
        <q-card class="info-card q-mb-md">
          <q-card-section>
            <div class="text-h6">环境检测</div>
            <div class="q-mt-sm">
              <div>平台: {{ platformInfo.type }}</div>
              <div>用户代理: {{ userAgent }}</div>
              <div>是否 iPad: {{ isIPad ? '是' : '否' }}</div>
              <div>分屏模式: {{ isSplitScreen ? '是' : '否' }}</div>
              <div>移动端模式: {{ isMobileMode ? '是' : '否' }}</div>
            </div>
          </q-card-section>
        </q-card>

        <!-- 屏幕信息 -->
        <q-card class="info-card q-mb-md">
          <q-card-section>
            <div class="text-h6">屏幕信息</div>
            <div class="q-mt-sm">
              <div>屏幕尺寸: {{ screenInfo.screenWidth }}x{{ screenInfo.screenHeight }}</div>
              <div>窗口尺寸: {{ screenInfo.windowWidth }}x{{ screenInfo.windowHeight }}</div>
              <div>窗口/屏幕比例: {{ screenRatio }}%</div>
              <div>设备像素比: {{ screenInfo.devicePixelRatio }}</div>
              <div>方向: {{ screenInfo.orientation }}</div>
            </div>
          </q-card-section>
        </q-card>

        <!-- 安全区域信息 -->
        <q-card class="info-card q-mb-md">
          <q-card-section>
            <div class="text-h6">安全区域信息</div>
            <div class="q-mt-sm">
              <div>顶部: {{ safeAreaInsets.top }}px</div>
              <div>底部: {{ safeAreaInsets.bottom }}px</div>
              <div>左侧: {{ safeAreaInsets.left }}px</div>
              <div>右侧: {{ safeAreaInsets.right }}px</div>
              <div>Edge-to-Edge: {{ shouldUseEdgeToEdge() ? '启用' : '禁用' }}</div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Stage Manager 信息 -->
        <q-card class="info-card q-mb-md" v-if="stageManagerInfo.supported">
          <q-card-section>
            <div class="text-h6">Stage Manager 信息</div>
            <div class="q-mt-sm">
              <div>支持: {{ stageManagerInfo.supported ? '是' : '否' }}</div>
              <div>可能启用: {{ stageManagerInfo.likelyActive ? '是' : '否' }}</div>
              <div>多窗口模式: {{ stageManagerInfo.multiWindow ? '是' : '否' }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 测试区域 -->
      <div class="test-areas q-mt-lg">
        <q-card class="test-card">
          <q-card-section>
            <div class="text-h6 q-mb-md">视觉测试区域</div>

            <!-- 边缘指示器 -->
            <div class="edge-indicators">
              <div class="edge-indicator top" :style="{ height: safeAreaInsets.top + 'px' }">
                <span>顶部安全区域: {{ safeAreaInsets.top }}px</span>
              </div>
              <div class="edge-indicator bottom" :style="{ height: safeAreaInsets.bottom + 'px' }">
                <span>底部安全区域: {{ safeAreaInsets.bottom }}px</span>
              </div>
              <div class="edge-indicator left" :style="{ width: safeAreaInsets.left + 'px' }">
                <span class="vertical-text">左侧: {{ safeAreaInsets.left }}px</span>
              </div>
              <div class="edge-indicator right" :style="{ width: safeAreaInsets.right + 'px' }">
                <span class="vertical-text">右侧: {{ safeAreaInsets.right }}px</span>
              </div>
            </div>

            <!-- 中心内容区域 -->
            <div class="center-content">
              <p class="text-center">
                这个区域应该完全避开安全区域，<br />
                在分屏模式下也应该正确显示。
              </p>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 测试按钮 -->
      <div class="test-actions q-mt-lg">
        <q-btn
          color="primary"
          label="刷新检测"
          @click="refreshDetection"
          class="q-mb-sm full-width"
        />
        <q-btn
          color="secondary"
          label="强制触发分屏检测"
          @click="triggerSplitScreenDetection"
          class="q-mb-sm full-width"
        />
        <q-btn color="accent" label="导出调试信息" @click="exportDebugInfo" class="full-width" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import { useSafeArea } from 'src/composables/useSafeArea';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// 响应式数据
const userAgent = ref(navigator.userAgent);
const screenInfo = reactive({
  screenWidth: 0,
  screenHeight: 0,
  windowWidth: 0,
  windowHeight: 0,
  devicePixelRatio: 1,
  orientation: '',
});

// 使用 SafeArea composable
const {
  top,
  bottom,
  left,
  right,
  updateSafeAreaInsets,
  shouldUseEdgeToEdge,
  isMobile,
  isSplitScreenMode,
} = useSafeArea();

// 计算属性
const platformInfo = computed(() => ({
  type: Capacitor.getPlatform(),
  isNative: Capacitor.isNativePlatform(),
}));

const isIPad = computed(() => {
  return /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
});

const isSplitScreen = computed(() => isSplitScreenMode());
const isMobileMode = computed(() => isMobile());

const screenRatio = computed(() => {
  if (screenInfo.screenWidth === 0) return 0;
  return Math.round((screenInfo.windowWidth / screenInfo.screenWidth) * 100);
});

const safeAreaInsets = computed(() => ({
  top: top.value,
  bottom: bottom.value,
  left: left.value,
  right: right.value,
}));

const stageManagerInfo = computed(() => {
  const isLargeScreen = screenInfo.windowWidth >= 1024;

  return {
    supported: isIPad.value && isLargeScreen,
    likelyActive: isIPad.value && isSplitScreen.value && isLargeScreen,
    multiWindow: isIPad.value && screenInfo.windowWidth < screenInfo.screenWidth * 0.8,
  };
});

// 方法
const updateScreenInfo = () => {
  screenInfo.screenWidth = window.screen?.width || window.innerWidth;
  screenInfo.screenHeight = window.screen?.height || window.innerHeight;
  screenInfo.windowWidth = window.innerWidth;
  screenInfo.windowHeight = window.innerHeight;
  screenInfo.devicePixelRatio = window.devicePixelRatio || 1;
  screenInfo.orientation =
    window.screen?.orientation?.type ||
    (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
};

const refreshDetection = () => {
  updateScreenInfo();
  updateSafeAreaInsets();
};

const triggerSplitScreenDetection = () => {
  // 强制触发分屏检测逻辑
  const event = new Event('resize');
  window.dispatchEvent(event);

  setTimeout(() => {
    refreshDetection();

    if (isSplitScreen.value) {
      $q.notify({
        type: 'positive',
        message: '检测到分屏模式！',
        caption: `窗口宽度: ${screenInfo.windowWidth}px, 屏幕宽度: ${screenInfo.screenWidth}px`,
      });
    } else {
      $q.notify({
        type: 'info',
        message: '未检测到分屏模式',
        caption: '窗口可能处于全屏状态',
      });
    }
  }, 100);
};

const exportDebugInfo = () => {
  const debugInfo = {
    platform: platformInfo.value,
    userAgent: userAgent.value,
    screen: screenInfo,
    safeArea: safeAreaInsets.value,
    detection: {
      isIPad: isIPad.value,
      isSplitScreen: isSplitScreen.value,
      isMobileMode: isMobileMode.value,
      shouldUseEdgeToEdge: shouldUseEdgeToEdge(),
    },
    stageManager: stageManagerInfo.value,
    timestamp: new Date().toISOString(),
  };

  console.log('调试信息:', debugInfo);

  // 复制到剪贴板
  navigator.clipboard
    ?.writeText(JSON.stringify(debugInfo, null, 2))
    .then(() => {
      $q.notify({
        type: 'positive',
        message: '调试信息已复制到剪贴板',
        actions: [{ icon: 'close', color: 'white' }],
      });
    })
    .catch(() => {
      $q.notify({
        type: 'warning',
        message: '复制失败，请查看控制台',
        actions: [{ icon: 'close', color: 'white' }],
      });
    });
};

// 生命周期
let resizeHandler: () => void;

onMounted(() => {
  updateScreenInfo();

  resizeHandler = () => {
    setTimeout(updateScreenInfo, 100);
  };

  window.addEventListener('resize', resizeHandler);
  window.addEventListener('orientationchange', resizeHandler);
});

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    window.removeEventListener('orientationchange', resizeHandler);
  }
});
</script>

<style lang="scss" scoped>
.split-screen-test-page {
  background: linear-gradient(135deg, #2e1a47 0%, #3d2963 50%, #4a1e5c 100%);
  min-height: 100vh;
  min-height: 100dvh;
  padding: 16px;

  // 使用安全区域
  padding-top: calc(var(--safe-area-inset-top, 0px) + 16px);
  padding-bottom: calc(var(--safe-area-inset-bottom, 0px) + 16px);
  padding-left: calc(var(--safe-area-inset-left, 0px) + 16px);
  padding-right: calc(var(--safe-area-inset-right, 0px) + 16px);
}

.test-container {
  max-width: 800px;
  margin: 0 auto;
}

.header-section {
  text-align: center;
  margin-bottom: 24px;

  h1 {
    color: #ffffff;
    font-weight: 600;
  }

  p {
    color: rgba(255, 255, 255, 0.8);
  }
}

.info-card,
.test-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  .q-card-section {
    color: #ffffff;

    .text-h6 {
      color: #bb86fc;
      font-weight: 600;
      margin-bottom: 8px;
    }

    div:not(.text-h6) {
      margin-bottom: 4px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
    }
  }
}

.edge-indicators {
  position: relative;
  min-height: 200px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  margin: 16px 0;
}

.edge-indicator {
  position: absolute;
  background: rgba(187, 134, 252, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;

  &.top {
    top: 0;
    left: 0;
    right: 0;
    min-height: 20px;
  }

  &.bottom {
    bottom: 0;
    left: 0;
    right: 0;
    min-height: 20px;
  }

  &.left {
    top: 0;
    bottom: 0;
    left: 0;
    min-width: 20px;
  }

  &.right {
    top: 0;
    bottom: 0;
    right: 0;
    min-width: 20px;
  }
}

.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.center-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.5);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  color: white;
}
</style>
