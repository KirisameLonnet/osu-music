<template>
  <q-page class="flex flex-center column text-center q-pa-md">
    <q-spinner-gears :color="spinnerColor" size="3rem" class="q-mb-lg" />
    <div class="text-h6 q-mb-sm">{{ statusMessage }}</div>
    <div v-if="errorMessage" class="text-negative text-body2 error-message">
      <q-icon name="error_outline" class="q-mr-sm" />
      {{ errorMessage }}
    </div>
    <q-btn
      v-if="showRetryButton"
      label="Try Again"
      color="primary"
      icon="refresh"
      @click="retryLogin"
      class="q-mt-lg"
      unelevated
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/authStore';
import { useSettingsStore } from 'src/stores/settingsStore';
import { useQuasar } from 'quasar';
import { getPlatformService, CapacitorPlatformService } from 'src/services/core/platform';
import { handleOsuCallback } from 'src/services/api/osuAuthService';
import { setCapacitorPlatformService } from 'src/boot/deeplink';

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const $q = useQuasar();
const platform = getPlatformService();

const statusMessage = ref<string>('Starting OAuth login...');
const errorMessage = ref<string | null>(null);
const showRetryButton = ref(false);

const spinnerColor = computed(() => (errorMessage.value ? 'negative' : 'primary'));

async function startOAuthFlow() {
  try {
    statusMessage.value = 'Checking OAuth configuration...';

    // 验证OAuth配置
    if (!settingsStore.osuClientId || !settingsStore.osuClientSecret) {
      throw new Error(
        'OAuth configuration missing. Please configure Client ID and Client Secret in Settings.',
      );
    }

    console.log('[OsuCallbackPage] Starting OAuth with settings:', {
      clientId: settingsStore.osuClientId,
      clientSecret: settingsStore.osuClientSecret ? '***' : 'missing',
      redirectUri: 'osu-music-fusion://oauth/callback',
    });

    // 如果是Capacitor平台，先注册平台服务实例到深链接处理器
    if (platform instanceof CapacitorPlatformService) {
      setCapacitorPlatformService(platform);
      console.log('[OsuCallbackPage] Registered platform service with deep link handler');

      // 给一点时间让深链接处理器完全初始化
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    statusMessage.value = 'Opening OAuth browser...';
    console.log(
      '[OsuCallbackPage] Important: Make sure the OSU! developer console has this redirect URI: osu-music-fusion://oauth/callback',
    );

    const result = await platform.openOAuth({
      clientId: settingsStore.osuClientId,
      clientSecret: settingsStore.osuClientSecret,
      redirectUri: 'osu-music-fusion://oauth/callback',
      scopes: ['identify', 'public', 'friends.read', 'chat.read'],
      authUrl: 'https://osu.ppy.sh/oauth/authorize',
      tokenUrl: 'https://osu.ppy.sh/oauth/token',
    });

    if (result.error) {
      throw new Error(
        `OAuth error: ${result.error}${result.errorDescription ? ` - ${result.errorDescription}` : ''}`,
      );
    }

    if (result.code) {
      statusMessage.value = 'Processing authorization code...';

      const success = await handleOsuCallback(result.code);
      if (success) {
        statusMessage.value = 'Fetching user profile...';
        await authStore.fetchUserProfile();

        if (authStore.user) {
          statusMessage.value = 'Login successful!';
          $q.notify({
            type: 'positive',
            message: `Welcome, ${authStore.user.username}!`,
            icon: 'check_circle',
          });

          setTimeout(() => {
            router.replace({ name: 'authSettings' }).catch(console.error);
          }, 1000);
        } else {
          throw new Error('Failed to load user profile');
        }
      } else {
        throw new Error('Failed to exchange authorization code');
      }
    }
  } catch (error) {
    console.error('[OsuCallbackPage] OAuth error:', error);
    errorMessage.value = error instanceof Error ? error.message : 'OAuth login failed';
    showRetryButton.value = true;
    statusMessage.value = 'Login failed';

    $q.notify({
      type: 'negative',
      message: errorMessage.value,
      icon: 'error',
    });
  }
}

function retryLogin() {
  errorMessage.value = null;
  showRetryButton.value = false;
  router.replace({ name: 'authSettings' }).catch(console.error);
}

onMounted(() => {
  // 检查是否已经认证
  if (authStore.isAuthenticated && authStore.user) {
    statusMessage.value = 'Already logged in';
    router.replace({ name: 'authSettings' }).catch(console.error);
    return;
  }

  // 启动OAuth流程
  startOAuthFlow();
});
</script>

<style lang="scss" scoped>
.error-message {
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
  word-break: break-word;
}
</style>
