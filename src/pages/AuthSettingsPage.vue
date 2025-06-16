// src/pages/AuthSettingsPage.vue
<template>
  <q-page padding class="auth-settings-page text-page-text">
    <div class="q-mx-auto" style="max-width: 700px">
      <h4 class="q-mt-none q-mb-md text-h4">Authentication Settings</h4>
      <q-separator dark spaced />

      <!-- Osu! Auth Configuration Section -->
      <div class="q-mt-lg">
        <q-card class="settings-card" flat bordered>
          <q-card-section>
            <div class="text-h6">Osu! Authentication Configuration</div>
            <div class="text-caption text-grey-6 q-mt-xs">
              You need to create your own Osu! OAuth application.
              <a
                href="https://osu.ppy.sh/home/account/edit#oauth"
                target="_blank"
                class="text-primary"
              >
                Create one on the Osu! website <q-icon name="open_in_new" size="xs" /> </a
              >.
            </div>
          </q-card-section>
          <q-separator dark />
          <q-card-section>
            <div class="text-subtitle1 q-mb-sm">Your Application's Callback URI:</div>
            <q-input
              :model-value="osuCallbackUriToDisplay"
              label="This is the Callback URI for your Osu! App"
              readonly
              dark
              outlined
              dense
              class="q-mb-md callback-uri-input"
            >
              <template v-slot:append>
                <q-btn
                  flat
                  dense
                  round
                  icon="content_copy"
                  @click="copyCallbackUri"
                  aria-label="Copy Callback URI"
                >
                  <q-tooltip>Copy to clipboard</q-tooltip>
                </q-btn>
              </template>
            </q-input>
            <div class="text-caption text-warning">
              <q-icon name="warning" class="q-mr-xs" />
              Ensure this exact URI is set as a "Redirect URI" in your Osu! OAuth application
              settings.
            </div>
          </q-card-section>
          <q-separator dark spaced />
          <q-card-section>
            <q-form @submit="onSaveAuthConfig" class="q-gutter-md">
              <q-input
                v-model="form.osuClientId"
                label="Osu! Client ID"
                outlined
                dark
                dense
                lazy-rules
                :rules="[(val) => !!val || 'Client ID is required']"
                placeholder="Enter your Osu! Client ID"
                clearable
              />
              <q-input
                v-model="form.osuClientSecret"
                label="Osu! Client Secret"
                type="password"
                outlined
                dark
                dense
                lazy-rules
                :rules="[(val) => !!val || 'Client Secret is required']"
                placeholder="Enter your Osu! Client Secret"
                clearable
              />
              <div class="row justify-end">
                <q-btn label="Save Auth Config" type="submit" color="primary" unelevated />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Osu! Account Login/Logout Section -->
      <div class="q-mt-xl">
        <q-card class="settings-card" flat bordered>
          <q-card-section>
            <div class="text-h6">Osu! Account Status</div>
          </q-card-section>
          <q-separator dark />

          <!-- OAuth 诊断信息 -->
          <q-card-section>
            <div class="text-subtitle1 q-mb-sm">OAuth 配置诊断:</div>
            <div class="q-mb-sm"><strong>当前平台:</strong> {{ currentPlatform }}</div>
            <div class="q-mb-sm"><strong>重定向 URI:</strong> {{ currentRedirectUri }}</div>
            <div class="q-mb-sm">
              <strong>Client ID 已配置:</strong> {{ settingsStore.osuClientId ? '是' : '否' }}
            </div>
            <div class="q-mb-sm">
              <strong>Client Secret 已配置:</strong>
              {{ settingsStore.osuClientSecret ? '是' : '否' }}
            </div>

            <div class="q-mt-md">
              <q-btn
                label="验证 OAuth 配置"
                color="secondary"
                icon="verified"
                @click="validateOAuthConfig"
                :disable="!settingsStore.osuClientId || !settingsStore.osuClientSecret"
                class="q-mr-sm q-mb-sm"
                unelevated
              />
              <q-btn
                label="测试深链接"
                color="info"
                icon="link"
                @click="testDeepLink"
                class="q-mr-sm q-mb-sm"
                unelevated
              />
              <q-btn
                label="复制诊断信息"
                color="grey"
                icon="content_copy"
                @click="copyDiagnosticInfo"
                flat
              />
            </div>

            <q-separator class="q-my-md" />
          </q-card-section>

          <q-card-section v-if="authStore.isAuthenticated && authStore.user">
            <div class="row items-center q-col-gutter-md">
              <div class="col-auto">
                <q-avatar size="72px">
                  <img :src="authStore.user.avatar_url" :alt="authStore.user.username" />
                </q-avatar>
              </div>
              <div class="col">
                <div class="text-subtitle1 text-weight-bold">{{ authStore.user.username }}</div>
                <div class="text-caption text-grey-6">ID: {{ authStore.user.id }}</div>
              </div>
            </div>
            <q-btn
              label="Logout from Osu!"
              color="negative"
              @click="handleLogout"
              class="q-mt-md full-width"
              unelevated
            />
          </q-card-section>
          <q-card-section v-else>
            <p v-if="!canLogin" class="text-negative">
              Please configure your Osu! API Client ID and Client Secret above before logging in.
            </p>
            <q-btn
              v-else
              label="Login with Osu!"
              color="primary"
              icon-right="login"
              @click="handleOsuLogin"
              class="full-width"
              size="lg"
              unelevated
              :loading="authStore.isLoading"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Navigation to General Settings -->
      <div class="q-mt-xl">
        <q-card class="settings-card" flat bordered>
          <q-card-section>
            <div class="text-h6">Other Settings</div>
            <div class="text-caption text-grey-6 q-mt-xs">
              Configure general application preferences.
            </div>
          </q-card-section>
          <q-separator dark />
          <q-card-section>
            <q-btn
              label="Go to General Settings"
              color="secondary"
              icon="settings"
              @click="goToGeneralSettings"
              class="full-width"
              unelevated
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useQuasar, copyToClipboard } from 'quasar';
import { useAuthStore } from 'src/stores/authStore';
import { useSettingsStore } from 'src/stores/settingsStore';
import { useRouter } from 'vue-router';
import { getPlatformService } from 'src/services/core/platform';

const $q = useQuasar();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const platform = getPlatformService();

const form = ref({
  osuClientId: '',
  osuClientSecret: '',
});

// 这个值应该与 osuAuthService.ts 中的 OSU_REDIRECT_URI 和 Electron 主进程配置一致
const osuCallbackUriToDisplay = ref<string>('osu-music-fusion://oauth/callback');

// PKCE
const canLogin = computed(() => !!settingsStore.osuClientId && !!settingsStore.osuClientSecret);

onMounted(() => {
  // 从 store 加载已保存的设置到表单
  form.value.osuClientId = settingsStore.osuClientId || '';
  form.value.osuClientSecret = settingsStore.osuClientSecret || '';
});

// 诊断信息
const currentPlatform = computed(() => {
  const info = platform.getPlatformInfo();
  return info.type;
});

const currentRedirectUri = computed(() => {
  const info = platform.getPlatformInfo();
  switch (info.type) {
    case 'electron':
      return 'osu-music-fusion://oauth/callback';
    case 'ios':
      return 'osu-music-fusion://oauth/callback';
    case 'android':
      return 'osu-music-fusion://oauth/callback';
    default:
      return `${window.location.origin}/oauth/callback`;
  }
});

function onSaveAuthConfig() {
  const clientIdValue = form.value.osuClientId;
  const clientSecretValue = form.value.osuClientSecret;

  // 检查是否为 null 或 undefined，以及 trim 后是否为空字符串
  if (!clientIdValue || typeof clientIdValue !== 'string' || !clientIdValue.trim()) {
    $q.notify({ type: 'negative', message: 'Osu! Client ID is required and cannot be empty.' });
    return;
  }
  if (!clientSecretValue || typeof clientSecretValue !== 'string' || !clientSecretValue.trim()) {
    $q.notify({ type: 'negative', message: 'Osu! Client Secret is required and cannot be empty.' });
    return;
  }

  // 到这里，我们知道它们都是非空字符串了
  settingsStore.saveSettings({
    osuClientId: clientIdValue.trim(),
    osuClientSecret: clientSecretValue.trim(),
  });
  $q.notify({ type: 'positive', message: 'Osu! Auth Config saved!' });
}

async function copyCallbackUri() {
  try {
    await copyToClipboard(osuCallbackUriToDisplay.value);
    $q.notify({ message: 'Callback URI copied!', color: 'positive', icon: 'content_paste' });
  } catch {
    $q.notify({ message: 'Failed to copy.', color: 'negative' });
  }
}

async function handleOsuLogin() {
  if (!canLogin.value) {
    $q.notify({
      type: 'warning',
      message:
        'Please configure your Osu! API Client ID and Client Secret in the settings above before logging in.',
      multiLine: true,
    });
    return;
  }

  try {
    // 简单地导航到回调页面，让回调页面处理OAuth流程
    await router.push({ name: 'osuCallback' });
  } catch (error) {
    console.error('Failed to navigate to Osu! callback page:', error);
    $q.notify({
      type: 'negative',
      message: 'Could not navigate to Osu! login page. Check console for errors.',
    });
  }
}

function handleLogout() {
  authStore.logout();
  $q.notify({ type: 'info', message: 'Successfully logged out from Osu!' });
  router.push('/').catch((err) => console.error('Logout navigation error:', err));
}

function goToGeneralSettings() {
  router.push({ name: 'authSettings' }).catch(console.error);
}

async function validateOAuthConfig() {
  if (!settingsStore.osuClientId || !settingsStore.osuClientSecret) {
    $q.notify({
      type: 'warning',
      message: '请先配置 Client ID 和 Client Secret',
    });
    return;
  }

  $q.loading.show({ message: '验证 OAuth 配置中...' });

  try {
    // 验证配置的基本检查
    const diagnosticInfo = {
      platform: currentPlatform.value,
      redirectUri: currentRedirectUri.value,
      clientIdLength: settingsStore.osuClientId?.length || 0,
      clientSecretLength: settingsStore.osuClientSecret?.length || 0,
      hasClientId: !!settingsStore.osuClientId,
      hasClientSecret: !!settingsStore.osuClientSecret,
    };

    console.log('[OAuth Validation] 诊断信息:', diagnosticInfo);

    $q.notify({
      type: 'info',
      message: `配置验证完成\n平台: ${diagnosticInfo.platform}\n重定向 URI: ${diagnosticInfo.redirectUri}\nClient ID 长度: ${diagnosticInfo.clientIdLength}\nClient Secret 长度: ${diagnosticInfo.clientSecretLength}`,
      multiLine: true,
      timeout: 5000,
    });
  } catch (error) {
    console.error('配置验证失败:', error);
    $q.notify({
      type: 'negative',
      message: `配置验证失败: ${error}`,
    });
  } finally {
    $q.loading.hide();
  }
}

async function copyDiagnosticInfo() {
  const diagnosticText = `
OSU! Music OAuth 诊断信息
========================
平台: ${currentPlatform.value}
重定向 URI: ${currentRedirectUri.value}
Client ID 已配置: ${settingsStore.osuClientId ? '是' : '否'}
Client Secret 已配置: ${settingsStore.osuClientSecret ? '是' : '否'}
Client ID 长度: ${settingsStore.osuClientId?.length || 0}
Client Secret 长度: ${settingsStore.osuClientSecret?.length || 0}

故障排除提示:
1. 确保重定向 URI 在 OSU! 开发者控制台中完全匹配
2. 确保 Client ID 和 Client Secret 正确复制
3. 确保 OSU! 应用类型设置正确（公共客户端/机密客户端）
4. 检查 OSU! 应用的作用域权限设置
  `.trim();

  try {
    await copyToClipboard(diagnosticText);
    $q.notify({
      type: 'positive',
      message: '诊断信息已复制到剪贴板',
    });
  } catch (error) {
    console.error('复制失败:', error);
    $q.notify({
      type: 'negative',
      message: '复制失败，请手动复制控制台输出',
    });
    console.log(diagnosticText);
  }
}

async function testDeepLink() {
  $q.loading.show({ message: '测试深链接...' });

  try {
    console.log('[AuthSettings] Testing deep link functionality...');

    const platformInfo = platform.getPlatformInfo();

    if (platformInfo.type === 'ios' || platformInfo.type === 'android') {
      // 在原生平台上，我们可以测试模拟一个深链接回调
      const testUrl = 'osu-music-fusion://oauth/callback?code=test_code_12345&state=test_state';

      $q.notify({
        type: 'info',
        message: `测试深链接 URL: ${testUrl}\n\n在 Safari 或 Chrome 中输入此 URL 来测试深链接是否工作`,
        multiLine: true,
        timeout: 8000,
        actions: [
          {
            label: '复制测试 URL',
            color: 'white',
            handler: () => {
              copyToClipboard(testUrl).then(() => {
                $q.notify({
                  type: 'positive',
                  message: '测试 URL 已复制',
                });
              });
            },
          },
        ],
      });
    } else {
      $q.notify({
        type: 'warning',
        message: '深链接测试仅在 iOS/Android 平台上可用',
      });
    }
  } catch (error) {
    console.error('深链接测试失败:', error);
    $q.notify({
      type: 'negative',
      message: `深链接测试失败: ${error}`,
    });
  } finally {
    $q.loading.hide();
  }
}
</script>

<style lang="scss" scoped>
@use 'sass:color';

.settings-card {
  background-color: color.adjust($dark-page, $lightness: 5%);
}
.callback-uri-input :deep(.q-field__control) {
  background-color: color.adjust($dark-page, $lightness: -3%);
}
</style>
