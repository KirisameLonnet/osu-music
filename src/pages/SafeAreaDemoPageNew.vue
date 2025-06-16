<template>
  <div class="safe-area-demo-page">
    <!-- 边缘测试背景 - 应该完全覆盖屏幕，包括刘海和底部手势条区域 -->
    <div class="edge-test-background">
      <!-- 顶部边缘指示器 -->
      <div class="edge-indicator top-edge">TOP EDGE</div>
      <!-- 底部边缘指示器 -->
      <div class="edge-indicator bottom-edge">BOTTOM EDGE</div>
      <!-- 左侧边缘指示器 -->
      <div class="edge-indicator left-edge">LEFT</div>
      <!-- 右侧边缘指示器 -->
      <div class="edge-indicator right-edge">RIGHT</div>
    </div>

    <!-- 主要内容容器 - UI 元素自动避让安全区域 -->
    <div class="content-safe-area main-content">
      <h1 class="demo-title">Safe Area Edge-to-Edge 测试</h1>
      
      <div class="test-description">
        <p><strong>边缘测试说明：</strong></p>
        <ul>
          <li>如果看到彩色边缘指示器触及屏幕物理边缘（包括刘海、圆角区域），说明 Edge-to-Edge 生效</li>
          <li>如果看到白边或间隙，说明还有样式问题需要修复</li>
          <li>内容区域应该自动避让安全区域，不被遮挡</li>
        </ul>
      </div>

      <!-- 安全区域信息对比显示 -->
      <section class="safe-area-info-section">
        <h2>安全区域信息对比</h2>
        <div class="comparison-grid">
          <div class="comparison-column">
            <h3>原始安全区域</h3>
            <div class="insets-grid">
              <div class="inset-card">
                <div class="inset-label">顶部</div>
                <div class="inset-value">{{ top }}px</div>
                <div class="inset-desc">原始值</div>
              </div>
              <div class="inset-card">
                <div class="inset-label">底部</div>
                <div class="inset-value">{{ bottom }}px</div>
                <div class="inset-desc">原始值</div>
              </div>
              <div class="inset-card">
                <div class="inset-label">左侧</div>
                <div class="inset-value">{{ left }}px</div>
                <div class="inset-desc">原始值</div>
              </div>
              <div class="inset-card">
                <div class="inset-label">右侧</div>
                <div class="inset-value">{{ right }}px</div>
                <div class="inset-desc">原始值</div>
              </div>
            </div>
          </div>

          <div class="comparison-column">
            <h3>视觉平衡后</h3>
            <div class="insets-grid">
              <div class="inset-card balanced">
                <div class="inset-label">顶部</div>
                <div class="inset-value">{{ balancedTop }}px</div>
                <div class="inset-desc">平衡后（应为0）</div>
              </div>
              <div class="inset-card balanced">
                <div class="inset-label">底部</div>
                <div class="inset-value">{{ balancedBottom }}px</div>
                <div class="inset-desc">平衡后（应为0）</div>
              </div>
              <div class="inset-card balanced">
                <div class="inset-label">左侧</div>
                <div class="inset-value">{{ balancedLeft }}px</div>
                <div class="inset-desc">平衡后（最小16px）</div>
              </div>
              <div class="inset-card balanced">
                <div class="inset-label">右侧</div>
                <div class="inset-value">{{ balancedRight }}px</div>
                <div class="inset-desc">平衡后（最小16px）</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 视觉效果演示 -->
      <section class="visual-demo-section">
        <h2>视觉效果对比</h2>

        <!-- 无视觉平衡的容器 -->
        <div class="demo-container no-balance">
          <h3>❌ 无视觉平衡（内容贴边）</h3>
          <div class="demo-content" style="padding: 0">
            <p>
              这个容器没有使用视觉平衡，内容会贴着屏幕边缘，在桌面端或者没有安全区域的设备上看起来不够美观。
            </p>
            <button class="demo-button">按钮示例</button>
          </div>
        </div>

        <!-- 有视觉平衡的容器 -->
        <div class="demo-container with-balance content-safe-horizontal">
          <h3>✅ 有视觉平衡（舒适边距）</h3>
          <div class="demo-content">
            <p>
              这个容器使用了视觉平衡，即使在没有物理安全区域的设备上，也会保持 16px
              的左右边距，看起来更加舒适和平衡。
            </p>
            <button class="demo-button primary">按钮示例</button>
          </div>
        </div>
      </section>

      <!-- 实用工具类演示 -->
      <section class="utility-demo-section">
        <h2>实用工具类</h2>
        <div class="utility-grid">
          <div class="utility-card visual-balance-horizontal">
            <h4>.visual-balance-horizontal</h4>
            <p>仅左右边距平衡</p>
          </div>
          <div class="utility-card visual-balance-vertical">
            <h4>.visual-balance-vertical</h4>
            <p>仅上下边距平衡</p>
          </div>
          <div class="utility-card visual-balance">
            <h4>.visual-balance</h4>
            <p>全方向边距平衡</p>
          </div>
        </div>
      </section>

      <!-- 设备信息 -->
      <section class="device-info-section">
        <h2>设备信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">视觉平衡:</span>
            <span class="info-value">已启用</span>
          </div>
          <div class="info-item">
            <span class="info-label">水平最小边距:</span>
            <span class="info-value">16px</span>
          </div>
          <div class="info-item">
            <span class="info-label">垂直最小边距:</span>
            <span class="info-value">0px</span>
          </div>
          <div class="info-item">
            <span class="info-label">是否移动端:</span>
            <span class="info-value">{{ isMobile() ? '是' : '否' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">视口宽度:</span>
            <span class="info-value">{{ windowWidth }}px</span>
          </div>
          <div class="info-item">
            <span class="info-label">视口高度:</span>
            <span class="info-value">{{ windowHeight }}px</span>
          </div>
        </div>
      </section>
    </div>

    <!-- 3. 固定 Header - 背景延伸，内容避让 -->
    <header class="header-edge-to-edge demo-header">
      <div class="header-content">
        <div class="header-left">
          <button class="back-button" @click="$router.go(-1)">←</button>
          <span class="header-title">视觉平衡演示</span>
        </div>
        <div class="header-right">
          <button class="refresh-button" @click="updateSafeAreaInsets">🔄</button>
        </div>
      </div>
    </header>
  </div>
</template>

<script setup lang="ts">
import { useSafeArea } from 'src/composables/useSafeArea';
import { onMounted, onUnmounted, nextTick, ref } from 'vue';

// 使用安全区域 composable（启用视觉平衡）
const {
  top,
  bottom,
  left,
  right,
  balancedTop,
  balancedBottom,
  balancedLeft,
  balancedRight,
  shouldUseEdgeToEdge,
  isMobile,
  updateSafeAreaInsets,
} = useSafeArea();

// 响应式的窗口尺寸
const windowWidth = ref(0);
const windowHeight = ref(0);

// 更新窗口尺寸
const updateWindowSize = () => {
  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
  }
};

// 页面加载时确保安全区域信息更新
onMounted(async () => {
  await nextTick();
  updateSafeAreaInsets();
  updateWindowSize();

  // 监听窗口尺寸变化
  window.addEventListener('resize', updateWindowSize);
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateSafeAreaInsets();
      updateWindowSize();
    }, 100);
  });

  console.log('[SafeAreaDemo] Visual balance demo loaded:', {
    original: { top: top.value, bottom: bottom.value, left: left.value, right: right.value },
    balanced: {
      top: balancedTop.value,
      bottom: balancedBottom.value,
      left: balancedLeft.value,
      right: balancedRight.value,
    },
    shouldUseEdgeToEdge: shouldUseEdgeToEdge(),
    isMobile: isMobile(),
    windowSize: `${windowWidth.value}x${windowHeight.value}`,
  });
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateWindowSize);
  }
});
</script>

<style lang="scss" scoped>
.safe-area-demo-page {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
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
  background: linear-gradient(135deg, #ff4081 0%, #ff6b35 25%, #f7931e 50%, #64b5f6 75%, #7b1fa2 100%);
  z-index: -1;
}

// 边缘指示器
.edge-indicator {
  position: absolute;
  background: rgba(255, 255, 255, 0.9);
  color: #000;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  font-family: monospace;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  
  &.top-edge {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
  }
  
  &.bottom-edge {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
  }
  
  &.left-edge {
    left: 0;
    top: 50%;
    transform: translateY(-50%) rotate(90deg);
  }
  
  &.right-edge {
    right: 0;
    top: 50%;
    transform: translateY(-50%) rotate(-90deg);
  }
}

// 测试说明
.test-description {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  
  p {
    margin: 0 0 8px 0;
    color: #ff4081;
  }
  
  ul {
    margin: 0;
    padding-left: 20px;
    
    li {
      margin: 4px 0;
      color: #fff;
    }
  }
}

// 主要内容样式
.main-content {
  position: relative;
  z-index: 1;
  padding-top: 80px; // 为 header 留出空间
  background: rgba(18, 18, 24, 0.95);
  backdrop-filter: blur(20px);
  min-height: 100vh;
}

.demo-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

// 对比网格
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.comparison-column {
  h3 {
    color: #ffffff;
    margin-bottom: 1rem;
    text-align: center;
    font-size: 1.3rem;
  }
}

// 安全区域信息卡片
.safe-area-info-section {
  margin-bottom: 3rem;

  h2 {
    color: #ffffff;
    margin-bottom: 1.5rem;
    font-size: 1.8rem;
    text-align: center;
  }
}

.insets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.inset-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s ease;

  &.balanced {
    background: rgba(78, 205, 196, 0.15);
    border-color: rgba(78, 205, 196, 0.3);
  }

  .inset-label {
    display: block;
    font-size: 0.9rem;
    color: #ffffff;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .inset-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #4ecdc4;
    margin-bottom: 0.25rem;
  }

  .inset-desc {
    font-size: 0.75rem;
    color: #b0b0b0;
  }
}

// 视觉效果演示
.visual-demo-section {
  margin-bottom: 3rem;

  h2 {
    color: #ffffff;
    margin-bottom: 1.5rem;
    font-size: 1.8rem;
    text-align: center;
  }
}

.demo-container {
  margin-bottom: 1.5rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;

  &.no-balance {
    border: 2px solid rgba(255, 107, 107, 0.3);
  }

  &.with-balance {
    border: 2px solid rgba(78, 205, 196, 0.3);
  }

  h3 {
    color: #ffffff;
    padding: 1rem;
    margin: 0;
    background: rgba(0, 0, 0, 0.2);
    font-size: 1.1rem;
  }
}

.demo-content {
  padding: 1.5rem;

  p {
    color: #e0e0e0;
    line-height: 1.6;
    margin-bottom: 1rem;
  }
}

.demo-button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);

  &.primary {
    background: #4ecdc4;
    color: #ffffff;
    border-color: #4ecdc4;
  }

  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.2);
  }
}

// 工具类演示
.utility-demo-section {
  margin-bottom: 3rem;

  h2 {
    color: #ffffff;
    margin-bottom: 1.5rem;
    font-size: 1.8rem;
    text-align: center;
  }
}

.utility-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.utility-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  transition: all 0.3s ease;

  h4 {
    color: #4ecdc4;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    font-family: 'Courier New', monospace;
  }

  p {
    color: #d0d0d0;
    font-size: 0.9rem;
    margin: 0;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
  }
}

// 设备信息
.device-info-section {
  margin-bottom: 3rem;

  h2 {
    color: #ffffff;
    margin-bottom: 1.5rem;
    font-size: 1.8rem;
    text-align: center;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  .info-label {
    color: #b0b0b0;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .info-value {
    color: #4ecdc4;
    font-weight: 600;
  }
}

// 固定 Header 样式
.demo-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(18, 18, 24, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;

      .back-button {
        background: none;
        border: none;
        color: #4ecdc4;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: all 0.3s ease;

        &:hover {
          background: rgba(78, 205, 196, 0.1);
        }
      }

      .header-title {
        color: #ffffff;
        font-size: 1.2rem;
        font-weight: 600;
      }
    }

    .header-right {
      .refresh-button {
        background: none;
        border: none;
        color: #4ecdc4;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: all 0.3s ease;

        &:hover {
          background: rgba(78, 205, 196, 0.1);
          transform: rotate(180deg);
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .demo-title {
    font-size: 2rem;
  }

  .comparison-grid {
    grid-template-columns: 1fr;
  }

  .utility-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .demo-title {
    font-size: 1.6rem;
  }

  .insets-grid {
    grid-template-columns: 1fr;
  }
}
</style>
