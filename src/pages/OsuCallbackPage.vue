<template>
  <q-page class="flex flex-center column text-center q-pa-md">
    <q-spinner-gears :color="spinnerColor" size="3rem" class="q-mb-lg" />
    <div class="text-h6 q-mb-sm">{{ statusMessage }}</div>
    <div v-if="errorMessage" class="text-negative text-body2 error-message">
      <q-icon name="error_outline" class="q-mr-sm" />
      {{ errorMessage }}
    </div>
    <q-btn v-if="showRetryButton" label="Try Login Again" color="primary" icon="refresh" @click="retryLogin"
      class="q-mt-lg" unelevated />
    <div v-if="!showRetryButton && !authStore.isAuthenticated && !errorMessage"
      class="text-caption text-grey-7 q-mt-md">
      If this takes too long, please check your internet connection or try again later.
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router'; // 移除 useRoute
import {
  handleOsuCallback as exchangeCodeForToken,
  redirectToOsuLogin,
} from 'src/services/osuAuthService';
import { useAuthStore } from 'src/services/auth';
import { useQuasar } from 'quasar';
import { Capacitor } from '@capacitor/core';

const router = useRouter();
const authStore = useAuthStore();
const $q = useQuasar();
const route = useRoute();

const statusMessage = ref<string>('Connecting to Osu!...');
const errorMessage = ref<string | null>(null);
const showRetryButton = ref(false);
const isLoading = ref(true);

const spinnerColor = computed(() => (errorMessage.value ? 'negative' : 'primary'));

function processAuthentication(authCode: string | undefined): Promise<void> {
  isLoading.value = true;
  statusMessage.value = 'Authenticating with Osu!...';
  errorMessage.value = null;
  showRetryButton.value = false;

  if (!authCode) {
    errorMessage.value = 'Invalid authorization code received from Osu! via protocol.';
    showRetryButton.value = true;
    isLoading.value = false;
    $q.notify({
      type: 'negative',
      message: errorMessage.value,
      multiLine: true,
      timeout: 7000,
      icon: 'error',
    });
    return Promise.reject(new Error(errorMessage.value));
  }

  return exchangeCodeForToken(authCode)
    .then((tokenExchangeSuccess) => {
      if (tokenExchangeSuccess) {
        statusMessage.value = 'Fetching your Osu! profile...';
        return authStore
          .fetchUserProfile()
          .then(() => {
            if (authStore.user) {
              $q.notify({
                type: 'positive',
                message: `Welcome, ${authStore.user.username}! Successfully logged in.`,
                icon: 'check_circle',
              });
              router.replace({ name: 'settings' }).catch((err) => {
                console.error('Navigation error:', err);
              });
              return Promise.resolve();
            } else {
              throw new Error('User profile could not be loaded after login.');
            }
          })
          .catch((profileError) => {
            console.error('Error fetching profile after login:', profileError);
            const message =
              profileError instanceof Error ? profileError.message : 'Could not load profile.';
            errorMessage.value = `Logged in, but failed to fetch Osu! profile: ${message}`;
            $q.notify({
              type: 'warning',
              message: errorMessage.value,
              multiLine: true,
              timeout: 7000,
              icon: 'warning',
            });
            router.replace({ name: 'settings' }).catch((err) => {
              console.error('Navigation error:', err);
            });
            return Promise.resolve();
          });
      } else {
        errorMessage.value =
          'Authentication failed. Could not exchange authorization code for a token.';
        showRetryButton.value = true;
        $q.notify({
          type: 'negative',
          message: errorMessage.value,
          multiLine: true,
          timeout: 7000,
          icon: 'error',
        });
        return Promise.reject(new Error(errorMessage.value));
      }
    })
    .catch((criticalError) => {
      console.error('Critical error during authentication process:', criticalError);
      const message =
        criticalError instanceof Error ? criticalError.message : 'An unexpected error occurred.';
      errorMessage.value = `Critical authentication error: ${message}`;
      showRetryButton.value = true;
      $q.notify({
        type: 'negative',
        message: errorMessage.value,
        multiLine: true,
        timeout: 7000,
        icon: 'error',
      });
      return Promise.reject(criticalError instanceof Error ? criticalError : new Error(message));
    })
    .finally(() => {
      isLoading.value = false;
    });
}

async function handleAuthenticationFlow() {
  console.log('[OsuCallbackPage] handleAuthenticationFlow started.');
  isLoading.value = true;
  statusMessage.value = 'Initializing authentication...';
  errorMessage.value = null;
  showRetryButton.value = false;
  let codeToProcess: string | undefined | null = null;

  if (Capacitor.isNativePlatform()) {
    // Capacitor 流程: App.vue 将 code 存入 authStore
    const authStore = useAuthStore();
    codeToProcess = authStore.consumePendingOAuthCode();
    console.log('[OsuCallbackPage Capacitor] Code from authStore.consumePendingOAuthCode():', codeToProcess);
  } else if (window.electron?.ipcRenderer) {
    // Electron 流程: 通过 IPC 从主进程获取暂存的 code
    console.log('[OsuCallbackPage Electron] Attempting to fetch pending auth code from main process...');
    try {
      const result = await window.electron.ipcRenderer.invoke('get-pending-oauth-code');
      const r = result as { success?: boolean; code?: string; error?: string };
      if (r && r.success && r.code && typeof r.code === 'string') {
        console.log('[OsuCallbackPage Electron] Successfully fetched stashed code from main process:', r.code);
        codeToProcess = r.code;
      } else {
        console.log('[OsuCallbackPage Electron] No stashed code from main process or error:', r?.error);
      }
    } catch (ipcError) {
      console.error('[OsuCallbackPage Electron] Error invoking IPC for get-pending-oauth-code:', ipcError);
    }
  } else {
    // 其他环境或备用：尝试从路由参数获取 (如果 App.vue 在某些情况下仍然传递了)
    const codeFromQuery = route.query.code as string | undefined;
    if (codeFromQuery && typeof codeFromQuery === 'string' && codeFromQuery.trim() !== '') {
      console.log('[OsuCallbackPage Fallback] Code obtained from route query:', codeFromQuery);
      codeToProcess = codeFromQuery;
    }
  }

  if (codeToProcess && typeof codeToProcess === 'string' && codeToProcess.trim() !== '') {
    console.log('[OsuCallbackPage] Valid code found. Processing authentication with:', codeToProcess);
    await processAuthentication(codeToProcess);
  } else {
    // 没有获取到 code，并且用户未认证，则发起新的 OAuth 流程
    const authStore = useAuthStore(); // 再次获取，确保状态最新
    if (!authStore.isAuthenticated) {
      console.log('[OsuCallbackPage] NO VALID CODE obtained and not authenticated. Initiating Osu! login.');
      statusMessage.value = 'Redirecting to Osu! for login...';
      try {
        await redirectToOsuLogin(); // redirectToOsuLogin 内部处理平台差异打开浏览器
      } catch (e: unknown) {
        console.error('[OsuCallbackPage] Error calling redirectToOsuLogin:', e);
        errorMessage.value = e instanceof Error ? e.message : 'Failed to initiate Osu! login.';
        statusMessage.value = 'Error';
        showRetryButton.value = true;
        isLoading.value = false;
      }
    } else {
      // 已认证但没有处理任何 code (例如，直接访问了此页面)
      console.warn('[OsuCallbackPage] Authenticated but no code processed. Redirecting to settings.');
      statusMessage.value = 'Already authenticated or invalid state.';
      isLoading.value = false;
      router.replace({ name: 'settings' }).catch((err) => {
        console.error('Navigation error:', err);
      });
    }
  }
}

onMounted(async () => {
  console.log(
    '[OsuCallbackPage] Component mounted. Current route query:',
    JSON.stringify(route.query),
  );
  await handleAuthenticationFlow();
  const timeoutId = setTimeout(() => {
    if (isLoading.value && !authStore.isAuthenticated && !errorMessage.value) {
      // 可选：超时处理逻辑
      console.warn('[OsuCallbackPage] Authentication flow timeout.');
      statusMessage.value = 'Authentication timeout.';
      errorMessage.value = '登录流程超时，请重试。';
      showRetryButton.value = true;
      isLoading.value = false;
    }
  }, 30000);
  onUnmounted(() => {
    clearTimeout(timeoutId);
  });
});

let isProcessingTChange = false;
watch(
  () => route.query.t,
  async (newT, oldT) => {
    if (newT && newT !== oldT && !isProcessingTChange) {
      isProcessingTChange = true;
      console.log('[OsuCallbackPage] Route param t changed, re-initiating authentication flow.');
      await handleAuthenticationFlow();
      isProcessingTChange = false;
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  // 移除旧的 unlistenOauthCode 调用
  // if (unlistenOauthCode) {
  //   unlistenOauthCode();
  // }
});

function retryLogin() {
  errorMessage.value = null;
  showRetryButton.value = false;
  statusMessage.value = 'Retrying login...';
  isLoading.value = true;
  router.push({ name: 'settings' }).catch((err) => {
    console.error('Retry navigation error:', err);
    isLoading.value = false;
  });
}
</script>

<style lang="scss" scoped>
.error-message {
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
  word-break: break-word;
}
</style>
