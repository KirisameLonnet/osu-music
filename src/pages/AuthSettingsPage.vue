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
import { useAuthStore } from 'src/services/auth';
import { useSettingsStore } from 'src/stores/settingsStore';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const router = useRouter();

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
    // 只跳转到 callback 页面，由 callback 页面负责发起 OAuth 跳转
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
  router.push({ name: 'settings' }).catch(console.error);
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
