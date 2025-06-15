<template>
  <q-page class="platform-test-page">
    <div class="q-pa-md">
      <q-card>
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">跨平台功能测试</div>
          <div class="text-subtitle2">测试统一的平台抽象层</div>
        </q-card-section>

        <q-card-section>
          <!-- 平台信息 -->
          <div class="platform-info q-mb-md">
            <h6>平台信息</h6>
            <q-list bordered>
              <q-item>
                <q-item-section>
                  <q-item-label>平台类型</q-item-label>
                  <q-item-label caption>{{ platformInfo.type }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>是否原生</q-item-label>
                  <q-item-label caption>{{ platformInfo.isNative ? '是' : '否' }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>是否移动端</q-item-label>
                  <q-item-label caption>{{ platformInfo.isMobile ? '是' : '否' }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <!-- 功能测试按钮 -->
          <div class="function-tests">
            <h6>功能测试</h6>
            <div class="q-gutter-sm">
              <q-btn color="primary" @click="testStorage" :loading="isLoading" label="测试存储" />
              <q-btn
                color="secondary"
                @click="testFileSystem"
                :loading="isLoading"
                label="测试文件系统"
              />
              <q-btn
                color="positive"
                @click="testNotification"
                :loading="isLoading"
                label="测试通知"
              />
              <q-btn
                v-if="isMobile"
                color="warning"
                @click="testStatusBar"
                :loading="isLoading"
                label="测试状态栏"
              />
            </div>
          </div>

          <!-- 测试结果 -->
          <div v-if="testResults.length > 0" class="test-results q-mt-md">
            <h6>测试结果</h6>
            <q-list bordered>
              <q-item
                v-for="(result, index) in testResults"
                :key="index"
                :class="result.success ? 'text-positive' : 'text-negative'"
              >
                <q-item-section avatar>
                  <q-icon
                    :name="result.success ? 'check_circle' : 'error'"
                    :color="result.success ? 'positive' : 'negative'"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ result.test }}</q-item-label>
                  <q-item-label caption>{{ result.message }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <!-- 错误信息 -->
          <q-banner v-if="error" class="text-white bg-negative q-mt-md">
            <template v-slot:avatar>
              <q-icon name="error" />
            </template>
            {{ error }}
          </q-banner>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePlatform } from '../composables/usePlatform';

// 使用平台服务
const {
  platformInfo,
  isLoading,
  error,
  isMobile,
  getStorage,
  setStorage,
  showNotification,
  setStatusBarStyle,
  getAppDataDirectory,
  platform,
} = usePlatform();

// 测试结果
const testResults = ref<
  Array<{
    test: string;
    success: boolean;
    message: string;
  }>
>([]);

// 添加测试结果
const addTestResult = (test: string, success: boolean, message: string) => {
  testResults.value.push({ test, success, message });
};

// 测试存储功能
const testStorage = async () => {
  try {
    const testKey = 'platform-test-key';
    const testValue = `测试数据-${Date.now()}`;

    // 写入数据
    await setStorage(testKey, testValue);
    addTestResult('存储写入', true, `成功写入: ${testValue}`);

    // 读取数据
    const retrievedValue = await getStorage(testKey);
    if (retrievedValue === testValue) {
      addTestResult('存储读取', true, `成功读取: ${retrievedValue}`);
    } else {
      addTestResult('存储读取', false, `数据不匹配: ${retrievedValue}`);
    }
  } catch (err) {
    addTestResult('存储测试', false, `错误: ${err}`);
  }
};

// 测试文件系统
const testFileSystem = async () => {
  try {
    // 获取应用数据目录
    const appDataDir = await getAppDataDirectory();
    addTestResult('获取应用目录', true, `目录: ${appDataDir}`);

    // 测试文件写入/读取
    const testContent = `测试文件内容 - ${new Date().toISOString()}`;
    await platform.writeFile({
      path: 'test-file.txt',
      data: testContent,
    });
    addTestResult('文件写入', true, '成功写入测试文件');

    const readContent = await platform.readFile({
      path: 'test-file.txt',
      encoding: 'utf8',
    });

    if (readContent === testContent) {
      addTestResult('文件读取', true, '文件内容匹配');
    } else {
      addTestResult('文件读取', false, '文件内容不匹配');
    }
  } catch (err) {
    addTestResult('文件系统测试', false, `错误: ${err}`);
  }
};

// 测试通知
const testNotification = async () => {
  try {
    await showNotification('跨平台测试', '通知功能正常工作！');
    addTestResult('通知测试', true, '通知已发送');
  } catch (err) {
    addTestResult('通知测试', false, `错误: ${err}`);
  }
};

// 测试状态栏（仅移动端）
const testStatusBar = async () => {
  try {
    await setStatusBarStyle('dark');
    addTestResult('状态栏测试', true, '状态栏样式已设置为深色');

    // 2秒后恢复浅色
    setTimeout(async () => {
      try {
        await setStatusBarStyle('light');
      } catch (err) {
        console.warn('恢复状态栏样式失败:', err);
      }
    }, 2000);
  } catch (err) {
    addTestResult('状态栏测试', false, `错误: ${err}`);
  }
};

// 初始化
onMounted(() => {
  addTestResult('平台初始化', true, `平台: ${platformInfo.value.type}`);
});
</script>

<style lang="scss" scoped>
.platform-test-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.platform-info,
.function-tests,
.test-results {
  h6 {
    margin: 0 0 8px 0;
    color: $primary;
    font-weight: 600;
  }
}

.test-results {
  .q-item {
    border-radius: 8px;
    margin-bottom: 4px;

    &.text-positive {
      background-color: rgba(76, 175, 80, 0.1);
    }

    &.text-negative {
      background-color: rgba(244, 67, 54, 0.1);
    }
  }
}
</style>
