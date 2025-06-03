// src/pages/SettingsPage.vue
<template>
  <q-page padding class="settings-page text-page-text">
    <div class="q-mx-auto" style="max-width: 700px">
      <h4 class="q-mt-none q-mb-md text-h4">General Settings</h4>
      <q-separator dark spaced />

      <!-- Authentication Settings Link -->
      <div class="q-mt-lg">
        <q-card class="settings-card" flat bordered>
          <q-card-section>
            <div class="text-h6">Authentication</div>
            <div class="text-caption text-grey-6 q-mt-xs">
              Configure your Osu! authentication settings and login status.
            </div>
          </q-card-section>
          <q-separator dark />
          <q-card-section>
            <q-btn
              label="Authentication Settings"
              color="primary"
              icon="account_circle"
              @click="goToAuthSettings"
              class="full-width"
              unelevated
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Playback Settings -->
      <div class="q-mt-xl">
        <q-card class="settings-card" flat bordered>
          <q-card-section>
            <div class="text-h6">Playback</div>
            <div class="text-caption text-grey-6 q-mt-xs">
              Configure audio playback preferences.
            </div>
          </q-card-section>
          <q-separator dark />
          <q-card-section>
            <div class="q-gutter-md">
              <q-toggle
                v-model="autoplay"
                label="Autoplay next track"
                color="primary"
                dark
                @update:model-value="onAutoplayChange"
              />
              <q-toggle
                v-model="shuffle"
                label="Shuffle mode"
                color="primary"
                dark
                @update:model-value="onShuffleChange"
              />
              <q-toggle
                v-model="repeat"
                label="Repeat mode"
                color="primary"
                dark
                @update:model-value="onRepeatChange"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- About Section -->
      <div class="q-mt-xl">
        <q-card class="settings-card" flat bordered>
          <q-card-section>
            <div class="text-h6">About</div>
            <div class="text-caption text-grey-6 q-mt-xs">Information about Osu! Music Fusion.</div>
          </q-card-section>
          <q-separator dark />
          <q-card-section>
            <div class="q-gutter-sm">
              <div class="text-body2">
                <strong>Osu! Music Fusion</strong>
              </div>
              <div class="text-caption text-grey-6">Version 1.0.0</div>
              <div class="text-caption text-grey-6">
                A modern music streaming application for Osu! beatmaps.
              </div>
              <div class="q-mt-md">
                <q-btn
                  label="View on GitHub"
                  icon="code"
                  color="secondary"
                  flat
                  dense
                  @click="openGitHub"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const router = useRouter();

// Audio settings
const autoplay = ref(true);
const shuffle = ref(false);
const repeat = ref(false);

function goToAuthSettings() {
  router.push({ name: 'authSettings' }).catch(console.error);
}

function onAutoplayChange(enabled: boolean) {
  // TODO: Implement autoplay setting logic
  console.log('Autoplay:', enabled);
  $q.notify({
    message: `Autoplay ${enabled ? 'enabled' : 'disabled'}`,
    color: 'info',
    icon: enabled ? 'play_arrow' : 'pause',
  });
}

function onShuffleChange(enabled: boolean) {
  // TODO: Implement shuffle setting logic
  console.log('Shuffle:', enabled);
  $q.notify({
    message: `Shuffle ${enabled ? 'enabled' : 'disabled'}`,
    color: 'info',
    icon: 'shuffle',
  });
}

function onRepeatChange(enabled: boolean) {
  // TODO: Implement repeat setting logic
  console.log('Repeat:', enabled);
  $q.notify({
    message: `Repeat ${enabled ? 'enabled' : 'disabled'}`,
    color: 'info',
    icon: 'repeat',
  });
}

function openGitHub() {
  window.open('https://github.com/KirisameLonnet/osu-music', '_blank');
}
</script>

<style lang="scss" scoped>
@use 'sass:color';

.settings-card {
  background-color: color.adjust($dark-page, $lightness: 5%);
}
</style>
