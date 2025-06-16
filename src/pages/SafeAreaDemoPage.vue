<template>
  <q-page class="safe-area-demo-page">
    <div class="demo-container">
      <h1 class="demo-title">Safe Area Information</h1>

      <!-- 显示加载状态 -->
      <div v-if="!safeAreaLoaded" class="loading-section">
        <q-spinner-dots size="40px" color="primary" />
        <p>Loading safe area information...</p>
      </div>

      <!-- 显示安全区域信息 -->
      <div v-else class="safe-area-info">
        <div class="info-grid">
          <div class="info-card">
            <q-icon name="vertical_align_top" size="24px" />
            <div class="info-content">
              <div class="info-label">Top</div>
              <div class="info-value">{{ safeAreaTop }}px</div>
            </div>
          </div>

          <div class="info-card">
            <q-icon name="vertical_align_bottom" size="24px" />
            <div class="info-content">
              <div class="info-label">Bottom</div>
              <div class="info-value">{{ safeAreaBottom }}px</div>
            </div>
          </div>

          <div class="info-card">
            <q-icon name="keyboard_arrow_left" size="24px" />
            <div class="info-content">
              <div class="info-label">Left</div>
              <div class="info-value">{{ safeAreaLeft }}px</div>
            </div>
          </div>

          <div class="info-card">
            <q-icon name="keyboard_arrow_right" size="24px" />
            <div class="info-content">
              <div class="info-label">Right</div>
              <div class="info-value">{{ safeAreaRight }}px</div>
            </div>
          </div>
        </div>

        <!-- 动态样式演示 -->
        <div class="demo-section">
          <h2>Dynamic Safe Area Styles</h2>

          <div class="style-demo safe-area-demo" :style="safeAreaStyle">
            <div class="demo-content">
              <p>This container uses dynamic safe area padding from the composable.</p>
              <p>
                Padding: {{ safeAreaTop }}px {{ safeAreaRight }}px {{ safeAreaBottom }}px
                {{ safeAreaLeft }}px
              </p>
            </div>
          </div>

          <div class="style-demo top-only-demo" :style="safeAreaTopStyle">
            <div class="demo-content">
              <p>This container only uses top safe area padding.</p>
              <p>Padding-top: {{ safeAreaTop }}px</p>
            </div>
          </div>

          <div class="style-demo bottom-only-demo" :style="safeAreaBottomStyle">
            <div class="demo-content">
              <p>This container only uses bottom safe area padding.</p>
              <p>Padding-bottom: {{ safeAreaBottom }}px</p>
            </div>
          </div>
        </div>

        <!-- CSS 变量演示 -->
        <div class="demo-section">
          <h2>CSS Variables</h2>
          <div class="css-vars-demo">
            <div class="var-item">
              <code>--safe-area-inset-top: {{ safeAreaTop }}px</code>
            </div>
            <div class="var-item">
              <code>--safe-area-inset-bottom: {{ safeAreaBottom }}px</code>
            </div>
            <div class="var-item">
              <code>--safe-area-inset-left: {{ safeAreaLeft }}px</code>
            </div>
            <div class="var-item">
              <code>--safe-area-inset-right: {{ safeAreaRight }}px</code>
            </div>
          </div>
        </div>

        <!-- 刷新按钮 -->
        <div class="demo-actions">
          <q-btn
            color="primary"
            icon="refresh"
            label="Refresh Safe Area"
            @click="updateSafeAreaInsets"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useSafeArea } from 'src/composables/useSafeArea';

// 使用 Safe Area composable
const {
  top: safeAreaTop,
  bottom: safeAreaBottom,
  left: safeAreaLeft,
  right: safeAreaRight,
  isLoaded: safeAreaLoaded,
  safeAreaStyle,
  safeAreaTopStyle,
  safeAreaBottomStyle,
  updateSafeAreaInsets,
} = useSafeArea();
</script>

<style lang="scss" scoped>
.safe-area-demo-page {
  background: linear-gradient(135deg, #1e1e2e 0%, #2d2d3f 100%);
  min-height: 100vh;
  padding: 20px;
}

.demo-container {
  max-width: 800px;
  margin: 0 auto;
}

.demo-title {
  color: white;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 30px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.loading-section {
  text-align: center;
  padding: 40px;
  color: white;

  p {
    margin-top: 20px;
    font-size: 1.2rem;
    opacity: 0.8;
  }
}

.safe-area-info {
  color: white;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.info-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }

  .q-icon {
    color: $primary;
  }

  .info-content {
    flex: 1;
  }

  .info-label {
    font-size: 0.9rem;
    opacity: 0.8;
    margin-bottom: 5px;
  }

  .info-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: $primary;
  }
}

.demo-section {
  margin-bottom: 40px;

  h2 {
    color: white;
    font-size: 1.8rem;
    font-weight: 300;
    margin-bottom: 20px;
  }
}

.style-demo {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 20px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;

  .demo-content {
    text-align: center;

    p {
      margin: 5px 0;
      font-size: 0.9rem;
      opacity: 0.9;
    }
  }

  &.safe-area-demo {
    border-color: $primary;
  }

  &.top-only-demo {
    border-color: $positive;
  }

  &.bottom-only-demo {
    border-color: $warning;
  }
}

.css-vars-demo {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 20px;
  font-family: 'Courier New', monospace;
}

.var-item {
  margin-bottom: 10px;

  code {
    color: $primary;
    font-size: 0.9rem;
  }
}

.demo-actions {
  text-align: center;
  margin-top: 40px;
}

// 移动端适配
@media (max-width: 768px) {
  .safe-area-demo-page {
    padding: 10px;
  }

  .demo-title {
    font-size: 2rem;
    margin-bottom: 20px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .info-card {
    padding: 15px;
  }
}
</style>
