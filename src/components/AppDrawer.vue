<template>
  <q-drawer
    :model-value="isOpen"
    @update:model-value="emitUpdateIsOpen"
    side="left"
    class="app-drawer"
    :width="260"
    show-if-above
    :breakpoint="768"
    :bordered="false"
  >
    <div class="drawer-content-wrapper">
      <q-scroll-area class="fit show-scrollbar drawer-scroll-area">
        <q-list padding>
          <!-- 主导航区 -->
          <q-item-label header class="drawer-header-label text-grey-6 q-pt-lg">
            Discover
          </q-item-label>
          <q-item
            v-for="link in primaryNavLinks"
            :key="link.name"
            clickable
            v-ripple
            :to="link.to"
            exact
            class="drawer-item"
            active-class="drawer-item-active"
            @click="handleItemClick"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>
              {{ link.title }}
            </q-item-section>
          </q-item>
          <q-separator spaced class="bg-grey-8 q-my-md" />
          <!-- 曲库和播放列表区 -->
          <q-item-label header class="drawer-header-label text-grey-6"> Your Music </q-item-label>
          <q-item
            v-for="link in secondaryNavLinks"
            :key="link.name"
            clickable
            v-ripple
            :to="link.to"
            exact
            class="drawer-item"
            active-class="drawer-item-active"
            @click="handleItemClick"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>
              {{ link.title }}
            </q-item-section>
          </q-item>
          <q-separator spaced class="bg-grey-8 q-my-md" />
          <!-- 其他链接和设置 -->
          <q-item
            v-for="link in utilityLinks"
            :key="link.name"
            clickable
            v-ripple
            :to="link.to"
            exact
            class="drawer-item"
            active-class="drawer-item-active"
            @click="handleItemClick"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>
              {{ link.title }}
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
      <div class="q-pa-sm absolute-bottom text-center drawer-footer-info">
        <q-separator dark spaced class="footer-separator" />
        <div class="text-caption text-grey-7 q-mt-sm">App Version 0.1.0</div>
      </div>
    </div>
  </q-drawer>
</template>

<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
}>();
const emit = defineEmits(['update:isOpen']);

function emitUpdateIsOpen(value: boolean) {
  emit('update:isOpen', value);
}

function handleItemClick() {
  if (props.isOpen && window.innerWidth < 768) {
    emit('update:isOpen', false);
  }
}

interface NavLink {
  title: string;
  icon: string;
  to: string;
  name: string;
}

const primaryNavLinks: NavLink[] = [
  { title: 'Home', icon: 'home', to: '/', name: 'home' },
  { title: 'Search', icon: 'search', to: '/search', name: 'search' },
];

const secondaryNavLinks: NavLink[] = [
  { title: 'Library', icon: 'library_music', to: '/library', name: 'library' },
  { title: 'Now Playing', icon: 'play_circle_outline', to: '/player', name: 'player' },
  { title: 'Recent Played', icon: 'history', to: '/recent-played', name: 'recentPlayed' }, // 新增
];

const utilityLinks: NavLink[] = [
  { title: 'Auth Settings', icon: 'account_circle', to: '/auth-settings', name: 'authSettings' },
  { title: 'Resources', icon: 'public', to: '/resources', name: 'resources' },
  { title: 'Platform Test', icon: 'science', to: '/platform-test', name: 'platformTest' },
];
</script>

<style lang="scss" scoped>
@use 'sass:color';

.app-drawer {
  background: transparent !important;
  border-right: none !important;
  box-shadow: none !important;
}

.drawer-content-wrapper {
  height: calc(100%);
  background-color: $drawer-bg;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  color: $drawer-text;
}

.drawer-header-label {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.6;
  padding: calc(20px) calc(16px) calc(8px) calc(16px);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: $drawer-text;
}

.drawer-item {
  border-radius: calc(#{$border-radius-root} / 2);
  margin: calc(2px) calc(10px);
  padding: calc(10px) calc(16px);
  color: $drawer-text;
  transition:
    background-color 0.2s ease-in-out,
    color 0.2s ease-in-out;

  .q-item__section--avatar {
    min-width: 40px;
    padding-right: 12px;

    .q-icon {
      font-size: 20px;
      opacity: 0.8;
      color: currentColor;
    }
  }

  .q-item__section--main {
    font-size: 0.9rem;
    font-weight: 500;
  }

  &:hover {
    background-color: rgba($primary, 0.1);
  }
}

.drawer-item.q-router-link--active {
  color: $active-item-text !important;
  background-color: $active-item-bg !important;

  .q-icon {
    opacity: 1;
    color: $active-item-text !important;
  }
}

.drawer-footer-info {
  .footer-separator {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  .text-caption {
    color: $drawer-text;
    opacity: 0.7;
  }
}
</style>
