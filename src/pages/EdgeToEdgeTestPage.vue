<template>
  <q-page class="edge-to-edge-test-page">
    <!-- 边缘测试背景 - 应该完全覆盖屏幕，包括刘海和底部手势条区域 -->
    <div class="edge-test-background">
      <!-- 顶部边缘指示器 -->
      <div class="edge-indicator top-edge">TOP - 应触及状态栏</div>
      <!-- 底部边缘指示器 -->
      <div class="edge-indicator bottom-edge">BOTTOM - 应触及手势条</div>
      <!-- 左侧边缘指示器 -->
      <div class="edge-indicator left-edge">LEFT</div>
      <!-- 右侧边缘指示器 -->
      <div class="edge-indicator right-edge">RIGHT</div>
    </div>

    <div class="test-container content-safe-area">
      <div class="header-section">
        <h1 class="text-h4 text-center q-mb-md">Edge-to-Edge 测试页面</h1>
        <p class="text-body2 text-center q-mb-lg">测试移动端 Edge-to-Edge 模式是否正常工作</p>
      </div>

      <div class="info-cards">
        <!-- 平台信息 -->
        <q-card class="info-card q-mb-md">
          <q-card-section>
            <div class="text-h6">平台信息</div>
            <div class="q-mt-sm">
              <div>平台类型: {{ platformInfo.type }}</div>
              <div>是否原生: {{ platformInfo.isNative ? '是' : '否' }}</div>
              <div>是否移动端: {{ isMobile() ? '是' : '否' }}</div>
              <div>屏幕尺寸: {{ screenSize.width }}x{{ screenSize.height }}</div>
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

        <!-- CSS 环境变量 -->
        <q-card class="info-card q-mb-md">
          <q-card-section>
            <div class="text-h6">CSS 环境变量</div>
            <div class="q-mt-sm">
              <div>safe-area-inset-top: {{ cssVars.top }}</div>
              <div>safe-area-inset-bottom: {{ cssVars.bottom }}</div>
              <div>safe-area-inset-left: {{ cssVars.left }}</div>
              <div>safe-area-inset-right: {{ cssVars.right }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 测试按钮 -->
      <div class="test-actions q-mt-lg">
        <q-btn
          color="primary"
          label="刷新安全区域"
          @click="refreshSafeArea"
          class="q-mb-sm full-width"
        />
        <q-btn
          color="secondary"
          label="切换全屏测试"
          @click="toggleFullscreenTest"
          class="full-width"
        />
      </div>

      <!-- 全屏测试覆盖层 -->
      <div v-if="showFullscreenTest" class="fullscreen-test-overlay" @click="toggleFullscreenTest">
        <div class="fullscreen-content">
          <h2 class="text-h5 text-center q-mb-md">全屏测试</h2>
          <p class="text-center q-mb-md">
            这个覆盖层应该延伸到屏幕的每一个角落，包括状态栏和导航栏区域。
          </p>
          <p class="text-center">点击任意位置退出全屏测试</p>

          <!-- 边角指示器 -->
          <div class="corner-indicator top-left"></div>
          <div class="corner-indicator top-right"></div>
          <div class="corner-indicator bottom-left"></div>
          <div class="corner-indicator bottom-right"></div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { Capacitor } from '@capacitor/core';
import { useSafeArea } from 'src/composables/useSafeArea';

// 响应式数据
const showFullscreenTest = ref(false);
const screenSize = reactive({ width: 0, height: 0 });

// 使用 SafeArea composable
const { top, bottom, left, right, updateSafeAreaInsets, shouldUseEdgeToEdge, isMobile } =
  useSafeArea();

// 计算属性
const platformInfo = computed(() => ({
  type: Capacitor.getPlatform(),
  isNative: Capacitor.isNativePlatform(),
}));

const safeAreaInsets = computed(() => ({
  top: top.value,
  bottom: bottom.value,
  left: left.value,
  right: right.value,
}));

const cssVars = computed(() => {
  if (typeof document === 'undefined')
    return { top: '0px', bottom: '0px', left: '0px', right: '0px' };

  const computedStyle = getComputedStyle(document.documentElement);
  return {
    top: computedStyle.getPropertyValue('--safe-area-inset-top') || 'env(safe-area-inset-top)',
    bottom:
      computedStyle.getPropertyValue('--safe-area-inset-bottom') || 'env(safe-area-inset-bottom)',
    left: computedStyle.getPropertyValue('--safe-area-inset-left') || 'env(safe-area-inset-left)',
    right:
      computedStyle.getPropertyValue('--safe-area-inset-right') || 'env(safe-area-inset-right)',
  };
});

// 方法
const refreshSafeArea = () => {
  updateSafeAreaInsets();
  updateScreenSize();
};

const toggleFullscreenTest = () => {
  showFullscreenTest.value = !showFullscreenTest.value;
};

const updateScreenSize = () => {
  screenSize.width = window.innerWidth;
  screenSize.height = window.innerHeight;
};

// 生命周期
onMounted(() => {
  updateScreenSize();
  window.addEventListener('resize', updateScreenSize);
  window.addEventListener('orientationchange', () => {
    setTimeout(updateScreenSize, 100);
  });
});
</script>

<style lang="scss" scoped>
.edge-to-edge-test-page {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  min-height: 100vh;
  min-height: 100dvh;
  padding: 16px;
  position: relative;
  overflow: hidden;

  // 移动端 Edge-to-Edge 支持
  @media (max-width: 768px) {
    padding: calc(var(--safe-area-inset-top, 0px) + 16px)
      calc(var(--safe-area-inset-right, 0px) + 16px) calc(var(--safe-area-inset-bottom, 0px) + 16px)
      calc(var(--safe-area-inset-left, 0px) + 16px);
  }
}

// 边缘测试背景 - 完全覆盖屏幕
.edge-test-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  z-index: -1;

  // 渐变背景，便于观察边缘
  background: linear-gradient(
    135deg,
    #ff4081 0%,
    #e91e63 25%,
    #9c27b0 50%,
    #673ab7 75%,
    #3f51b5 100%
  );
}

// 边缘指示器
.edge-indicator {
  position: absolute;
  background: rgba(255, 255, 255, 0.95);
  color: #000;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: bold;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 10;

  &.top-edge {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background: #ff5722;
    color: white;
  }

  &.bottom-edge {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    background: #4caf50;
    color: white;
  }

  &.left-edge {
    left: 0;
    top: 20%;
    transform: translateY(-50%) rotate(-90deg);
    background: #2196f3;
    color: white;
  }

  &.right-edge {
    right: 0;
    top: 20%;
    transform: translateY(-50%) rotate(90deg);
    background: #ff9800;
    color: white;
  }
}

.test-container {
  max-width: 600px;
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

.info-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  .q-card-section {
    color: #ffffff;

    .text-h6 {
      color: #64b5f6;
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

.fullscreen-test-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 64, 129, 0.9);
  backdrop-filter: blur(20px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  // 确保延伸到屏幕边缘
  width: 100vw;
  height: 100vh;
  height: 100dvh;
}

.fullscreen-content {
  text-align: center;
  color: white;
  padding: 32px;
  position: relative;
  z-index: 10000;
}

.corner-indicator {
  position: absolute;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid #ffffff;

  &.top-left {
    top: 8px;
    left: 8px;
  }

  &.top-right {
    top: 8px;
    right: 8px;
  }

  &.bottom-left {
    bottom: 8px;
    left: 8px;
  }

  &.bottom-right {
    bottom: 8px;
    right: 8px;
  }
}
</style>
