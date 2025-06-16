import { ref, onMounted, computed } from 'vue';
import { initialize } from '@capacitor-community/safe-area';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// 视觉平衡配置接口
export interface VisualBalanceConfig {
  minHorizontalPadding: number; // 最小水平内边距（px）
  minVerticalPadding: number; // 最小垂直内边距（px）
  enableVisualBalance: boolean; // 是否启用视觉平衡
}

// 默认视觉平衡配置
const defaultVisualBalanceConfig: VisualBalanceConfig = {
  minHorizontalPadding: 16, // 左右各16px的基础边距
  minVerticalPadding: 0, // 上下不设置最小边距，保持 edge-to-edge
  enableVisualBalance: true, // 默认启用视觉平衡
};

export function useSafeArea(visualBalanceConfig: Partial<VisualBalanceConfig> = {}) {
  // 合并配置
  const config = { ...defaultVisualBalanceConfig, ...visualBalanceConfig };

  const top = ref(0);
  const bottom = ref(0);
  const left = ref(0);
  const right = ref(0);
  const isLoaded = ref(false);

  // 1. 背景类组件样式 - 延伸至屏幕物理边缘
  const backgroundStyle = computed(() => ({
    // 背景完全延伸到屏幕边缘，包括刘海区域
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: '100vw',
    height: '100vh',
    margin: '0',
    padding: '0',
    // 不使用任何安全区域内边距，让背景覆盖整个屏幕
  }));

  // 计算视觉平衡后的安全区域值
  const getVisualBalancedValue = (safeAreaValue: number, minValue: number) => {
    return config.enableVisualBalance ? Math.max(safeAreaValue, minValue) : safeAreaValue;
  };

  // 计算有视觉平衡的安全区域值
  const balancedTop = computed(() => getVisualBalancedValue(top.value, config.minVerticalPadding));
  const balancedBottom = computed(() =>
    getVisualBalancedValue(bottom.value, config.minVerticalPadding),
  );
  const balancedLeft = computed(() =>
    getVisualBalancedValue(left.value, config.minHorizontalPadding),
  );
  const balancedRight = computed(() =>
    getVisualBalancedValue(right.value, config.minHorizontalPadding),
  );

  // 2. UI 元素安全区域样式 - 自动避让安全区域（包含视觉平衡）
  const safeAreaStyle = computed(() => ({
    // 当 minVerticalPadding 为 0 时，上下保持 edge-to-edge，避免白边
    paddingTop:
      config.minVerticalPadding > 0
        ? `max(${balancedTop.value}px, var(--safe-area-inset-top, 0px))`
        : `max(${top.value}px, var(--safe-area-inset-top, 0px))`,
    paddingBottom:
      config.minVerticalPadding > 0
        ? `max(${balancedBottom.value}px, var(--safe-area-inset-bottom, 0px))`
        : `max(${bottom.value}px, var(--safe-area-inset-bottom, 0px))`,
    paddingLeft: `max(${balancedLeft.value}px, var(--safe-area-inset-left, 0px))`,
    paddingRight: `max(${balancedRight.value}px, var(--safe-area-inset-right, 0px))`,
  }));

  // 3. 顶部内容安全区域样式 - 避让状态栏/刘海
  const safeAreaTopStyle = computed(() => ({
    paddingTop: `max(${balancedTop.value}px, var(--safe-area-inset-top, 0px))`,
  }));

  // 4. 底部内容安全区域样式 - 避让手势条/导航栏
  const safeAreaBottomStyle = computed(() => ({
    paddingBottom: `max(${balancedBottom.value}px, var(--safe-area-inset-bottom, 0px))`,
  }));

  // 5. 水平内容安全区域样式 - 避让圆角/缺口（包含视觉平衡）
  const safeAreaHorizontalStyle = computed(() => ({
    paddingLeft: `max(${balancedLeft.value}px, var(--safe-area-inset-left, 0px))`,
    paddingRight: `max(${balancedRight.value}px, var(--safe-area-inset-right, 0px))`,
  }));

  // 6. 混合样式 - 垂直edge-to-edge，水平避让安全区域（包含视觉平衡）
  const verticalEdgeToEdgeStyle = computed(() => ({
    paddingTop: '0px', // 顶部延伸到边缘
    paddingBottom: '0px', // 底部延伸到边缘
    paddingLeft: `max(${balancedLeft.value}px, var(--safe-area-inset-left, 0px))`,
    paddingRight: `max(${balancedRight.value}px, var(--safe-area-inset-right, 0px))`,
  }));

  // 7. CSS 变量风格的计算属性
  const safeAreaCSSVars = computed(() => ({
    '--safe-area-inset-top': `${top.value}px`,
    '--safe-area-inset-bottom': `${bottom.value}px`,
    '--safe-area-inset-left': `${left.value}px`,
    '--safe-area-inset-right': `${right.value}px`,
  }));

  // 从 CSS 变量中读取安全区域信息
  const getSafeAreaFromCSS = (): SafeAreaInsets => {
    const computedStyle = getComputedStyle(document.documentElement);

    const parsePixelValue = (value: string): number => {
      const match = value.match(/(\d*\.?\d+)px/);
      return match && match[1] ? parseFloat(match[1]) : 0;
    };

    return {
      top: parsePixelValue(computedStyle.getPropertyValue('--safe-area-inset-top')),
      bottom: parsePixelValue(computedStyle.getPropertyValue('--safe-area-inset-bottom')),
      left: parsePixelValue(computedStyle.getPropertyValue('--safe-area-inset-left')),
      right: parsePixelValue(computedStyle.getPropertyValue('--safe-area-inset-right')),
    };
  };

  // 通过创建测试元素来检测安全区域
  const getSafeAreaFromEnv = (): SafeAreaInsets => {
    const testEl = document.createElement('div');
    testEl.style.cssText = `
      position: fixed;
      top: var(--safe-area-inset-top, 0px);
      bottom: var(--safe-area-inset-bottom, 0px);
      left: var(--safe-area-inset-left, 0px);
      right: var(--safe-area-inset-right, 0px);
      visibility: hidden;
      pointer-events: none;
      z-index: -9999;
    `;
    document.body.appendChild(testEl);

    const rect = testEl.getBoundingClientRect();
    const insets = {
      top: rect.top,
      bottom: window.innerHeight - rect.bottom,
      left: rect.left,
      right: window.innerWidth - rect.right,
    };

    document.body.removeChild(testEl);
    return insets;
  };

  // 获取安全区域信息的主要方法
  const getSafeAreaInsets = (): SafeAreaInsets => {
    try {
      // 1. 首先尝试从插件注入的 CSS 变量中读取
      const cssInsets = getSafeAreaFromCSS();
      console.log('[useSafeArea] CSS variables insets:', cssInsets);

      // 2. 通过测试元素获取原生 env() 变量
      const envInsets = getSafeAreaFromEnv();
      console.log('[useSafeArea] Env variables insets:', envInsets);

      // 3. 使用真实的安全区域值，遵循 capacitor-community/safe-area 最佳实践
      // 取最大值以确保安全区域的准确性
      const realInsets = {
        top: Math.max(cssInsets.top, envInsets.top),
        bottom: Math.max(cssInsets.bottom, envInsets.bottom),
        left: Math.max(cssInsets.left, envInsets.left),
        right: Math.max(cssInsets.right, envInsets.right),
      };

      console.log(
        '[useSafeArea] Using real safe area insets for proper UI element positioning:',
        realInsets,
      );
      return realInsets;
    } catch (error) {
      console.warn('[useSafeArea] Failed to get safe area insets:', error);
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }
  };

  // 更新安全区域信息
  const updateSafeAreaInsets = () => {
    const insets = getSafeAreaInsets();
    top.value = insets.top;
    bottom.value = insets.bottom;
    left.value = insets.left;
    right.value = insets.right;
    isLoaded.value = true;
  };

  // 监听屏幕方向变化等事件
  const handleOrientationChange = () => {
    // 延迟更新，等待屏幕旋转完成
    setTimeout(updateSafeAreaInsets, 100);
  };

  onMounted(() => {
    // 初始化 SafeArea 插件的 CSS 变量
    initialize();

    // 等待 DOM 和 CSS 变量准备就绪
    setTimeout(() => {
      updateSafeAreaInsets();
    }, 50);

    // 监听屏幕方向变化
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
  });

  // Edge-to-Edge 模式相关的计算属性 - 保留向后兼容性
  const edgeToEdgeStyle = computed(() => verticalEdgeToEdgeStyle.value);

  // 用于移动端全屏内容的样式 - 保留向后兼容性
  const mobileFullscreenStyle = computed(() => ({
    ...backgroundStyle.value,
    // 对于全屏内容，可以选择性地保留水平安全区域
    paddingLeft: `max(${left.value}px, var(--safe-area-inset-left, 0px))`,
    paddingRight: `max(${right.value}px, var(--safe-area-inset-right, 0px))`,
    boxSizing: 'border-box' as const,
  }));

  // 检测是否在分屏模式
  const isSplitScreenMode = () => {
    if (typeof window === 'undefined') return false;

    const screenWidth = window.screen?.width || window.innerWidth;
    const windowWidth = window.innerWidth;

    // 如果窗口宽度明显小于屏幕宽度，可能是分屏模式
    const isSplitScreen = windowWidth < screenWidth * 0.85;

    // iPad 特殊检测
    const isIPad = /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;

    return isIPad && isSplitScreen;
  };

  // 检测是否为移动端的方法（改进版）
  const isMobile = () => {
    if (typeof window === 'undefined') return false;

    // 检测分屏模式
    if (isSplitScreenMode()) {
      return false; // 分屏模式下不按移动端处理
    }

    return (
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  };

  // 检查是否应该使用 Edge-to-Edge 模式
  const shouldUseEdgeToEdge = () => {
    if (typeof window === 'undefined') return false;

    // 根据 capacitor-community/safe-area 最佳实践
    // 当有安全区域需要处理时，启用 edge-to-edge 模式
    const hasInsets = top.value > 0 || bottom.value > 0 || left.value > 0 || right.value > 0;
    console.log('[useSafeArea] Should use edge-to-edge:', hasInsets, {
      top: top.value,
      bottom: bottom.value,
      left: left.value,
      right: right.value,
    });
    return hasInsets;
  };

  // 获取适合分屏模式的样式
  const splitScreenSafeStyle = computed(() => {
    if (isSplitScreenMode()) {
      return {
        paddingTop: `${top.value}px`,
        paddingBottom: `${bottom.value}px`,
        paddingLeft: '0px', // 分屏模式下左右不需要安全区域
        paddingRight: '0px',
      };
    }
    return safeAreaStyle.value;
  });

  return {
    // 原始数值
    top,
    bottom,
    left,
    right,
    isLoaded,

    // 视觉平衡后的数值
    balancedTop,
    balancedBottom,
    balancedLeft,
    balancedRight,

    // 1. 背景类组件样式 - 完全延伸到屏幕边缘
    backgroundStyle,

    // 2. UI 元素安全区域样式 - 自动避让所有安全区域
    safeAreaStyle,
    safeAreaTopStyle,
    safeAreaBottomStyle,
    safeAreaHorizontalStyle,

    // 3. 混合样式 - 垂直edge-to-edge，水平避让
    verticalEdgeToEdgeStyle,

    // 4. CSS 变量
    safeAreaCSSVars,

    // 5. 向后兼容的样式
    edgeToEdgeStyle,
    mobileFullscreenStyle,
    splitScreenSafeStyle,

    // 方法
    getSafeAreaInsets,
    updateSafeAreaInsets,

    // 辅助功能
    isMobile,
    shouldUseEdgeToEdge,
    isSplitScreenMode,
  };
}
