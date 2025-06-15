<!-- src/components/PlatformDemo.vue -->
<!-- 演示跨平台抽象层使用的示例组件 -->

<template>
  <div class="platform-demo">
    <q-card class="q-ma-md">
      <q-card-section>
        <div class="text-h6">平台信息</div>
        <div class="text-subtitle2">{{ platformInfo.type.toUpperCase() }}</div>
      </q-card-section>

      <q-card-section>
        <q-list>
          <q-item>
            <q-item-section>
              <q-item-label>平台类型</q-item-label>
              <q-item-label caption>{{ platformInfo.type }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label>版本</q-item-label>
              <q-item-label caption>{{ platformInfo.version }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label>原生应用</q-item-label>
              <q-item-label caption
                ><q-badge :color="isNative ? 'positive' : 'negative'">{{
                  isNative ? '是' : '否'
                }}</q-badge></q-item-label
              >
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label>移动端</q-item-label>
              <q-item-label caption
                ><q-badge :color="isMobile ? 'positive' : 'negative'">{{
                  isMobile ? '是' : '否'
                }}</q-badge></q-item-label
              >
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label>桌面端</q-item-label>
              <q-item-label caption
                ><q-badge :color="platformInfo.isDesktop ? 'positive' : 'negative'">{{
                  platformInfo.isDesktop ? '是' : '否'
                }}</q-badge></q-item-label
              >
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card class="q-ma-md">
      <q-card-section>
        <div class="text-h6">文件操作</div>
      </q-card-section>

      <q-card-section>
        <div class="q-gutter-md">
          <q-btn color="primary" label="选择文件" @click="selectFiles" :loading="isLoading" />

          <q-btn color="secondary" label="导入音乐" @click="importMusic" :loading="isLoading" />

          <q-btn color="accent" label="查看目录" @click="showDirectories" :loading="isLoading" />
        </div>
      </q-card-section>

      <q-card-section v-if="selectedFiles.length > 0">
        <div class="text-subtitle1">已选择的文件：</div>
        <q-list dense>
          <q-item v-for="file in selectedFiles" :key="file.name">
            <q-item-section>
              <q-item-label>{{ file.name }}</q-item-label>
              <q-item-label caption>{{ formatFileSize(file.size) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card class="q-ma-md">
      <q-card-section>
        <div class="text-h6">存储操作</div>
      </q-card-section>

      <q-card-section>
        <div class="q-gutter-md">
          <q-input v-model="storageKey" label="存储键" outlined dense />

          <q-input v-model="storageValue" label="存储值" outlined dense />

          <div class="q-gutter-sm">
            <q-btn
              color="positive"
              label="保存"
              @click="saveToStorage"
              :disable="!storageKey || !storageValue"
            />

            <q-btn color="info" label="读取" @click="loadFromStorage" :disable="!storageKey" />

            <q-btn
              color="negative"
              label="删除"
              @click="removeFromStorage"
              :disable="!storageKey"
            />
          </div>
        </div>

        <div v-if="storageResult" class="q-mt-md">
          <q-banner class="bg-grey-2">
            <template v-slot:avatar>
              <q-icon name="storage" color="primary" />
            </template>
            存储结果: {{ storageResult }}
          </q-banner>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-ma-md">
      <q-card-section>
        <div class="text-h6">网络请求</div>
      </q-card-section>

      <q-card-section>
        <div class="q-gutter-md">
          <q-input
            v-model="apiUrl"
            label="API URL"
            outlined
            dense
            placeholder="https://api.example.com/data"
          />

          <q-btn
            color="primary"
            label="发送请求"
            @click="makeHttpRequest"
            :loading="isLoading"
            :disable="!apiUrl"
          />
        </div>

        <div v-if="httpResponse" class="q-mt-md">
          <q-banner class="bg-grey-2">
            <template v-slot:avatar>
              <q-icon name="http" color="primary" />
            </template>
            <div class="text-body2">
              <div>状态: {{ httpResponse.status }}</div>
              <div>响应: {{ JSON.stringify(httpResponse.data).substring(0, 200) }}...</div>
            </div>
          </q-banner>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-ma-md" v-if="isMobile">
      <q-card-section>
        <div class="text-h6">移动端特性</div>
      </q-card-section>

      <q-card-section>
        <div class="q-gutter-md">
          <q-btn color="primary" label="设置亮色状态栏" @click="setStatusBarStyle('light')" />

          <q-btn color="primary" label="设置暗色状态栏" @click="setStatusBarStyle('dark')" />

          <q-btn color="secondary" label="显示通知" @click="showTestNotification" />
        </div>
      </q-card-section>
    </q-card>

    <!-- 错误显示 -->
    <q-banner v-if="error" class="bg-negative text-white q-ma-md">
      <template v-slot:avatar>
        <q-icon name="error" color="white" />
      </template>
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePlatform } from '../composables/usePlatform';

const {
  platformInfo,
  isLoading,
  error,
  isMobile,
  isNative,
  pickFiles,
  getStorage,
  setStorage,
  httpRequest,
  showNotification,
  setStatusBarStyle,
  getAppDataDirectory,
  getDocumentsDirectory,
} = usePlatform();

// 文件操作相关
const selectedFiles = ref<Array<{ name: string; size: number; type: string }>>([]);

// 存储操作相关
const storageKey = ref('demo-key');
const storageValue = ref('demo-value');
const storageResult = ref('');

// 网络请求相关
const apiUrl = ref('https://jsonplaceholder.typicode.com/posts/1');
const httpResponse = ref<{
  status: number;
  data: unknown;
  statusText: string;
  headers: Record<string, string>;
} | null>(null);

// 方法
const selectFiles = async () => {
  try {
    const files = await pickFiles({ multiple: true });
    selectedFiles.value = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));
  } catch (err) {
    console.error('选择文件失败:', err);
  }
};

const importMusic = async () => {
  try {
    const files = await pickFiles({
      accept: ['.mp3', '.wav', '.flac', '.ogg', '.m4a'],
      multiple: true,
    });
    selectedFiles.value = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));
  } catch (err) {
    console.error('导入音乐失败:', err);
  }
};

const showDirectories = async () => {
  try {
    const appDataDir = await getAppDataDirectory();
    const documentsDir = await getDocumentsDirectory();

    await showNotification('目录信息', `应用数据: ${appDataDir}\n文档目录: ${documentsDir}`);
  } catch (err) {
    console.error('获取目录信息失败:', err);
  }
};

const saveToStorage = async () => {
  try {
    await setStorage(storageKey.value, storageValue.value);
    storageResult.value = `已保存: ${storageKey.value} = ${storageValue.value}`;
  } catch (err) {
    console.error('保存到存储失败:', err);
  }
};

const loadFromStorage = async () => {
  try {
    const value = await getStorage(storageKey.value);
    storageResult.value = value ? `读取结果: ${value}` : '未找到数据';
  } catch (err) {
    console.error('从存储读取失败:', err);
  }
};

const removeFromStorage = async () => {
  try {
    await setStorage(storageKey.value, '');
    storageResult.value = `已删除: ${storageKey.value}`;
  } catch (err) {
    console.error('从存储删除失败:', err);
  }
};

const makeHttpRequest = async () => {
  try {
    const response = await httpRequest(apiUrl.value, 'GET');
    httpResponse.value = response;
  } catch (err) {
    console.error('HTTP请求失败:', err);
  }
};

const showTestNotification = async () => {
  try {
    await showNotification('OSU! Music', `来自 ${platformInfo.value.type} 平台的测试通知`);
  } catch (err) {
    console.error('显示通知失败:', err);
  }
};

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.platform-demo {
  max-width: 800px;
  margin: 0 auto;
}
</style>
