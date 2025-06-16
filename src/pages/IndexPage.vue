<template>
  <q-page class="index-page q-pa-md">
    <!-- Welcome Section -->
    <section class="welcome-section text-center q-py-xl">
      <!-- User Profile Header -->
      <div v-if="authStore.isAuthenticated && authStore.user" class="user-profile-header q-mb-lg">
        <div class="user-avatar-container">
          <q-avatar size="120px" class="user-avatar">
            <img :src="authStore.user.avatar_url" :alt="authStore.user.username" />
          </q-avatar>
          <div class="avatar-ring"></div>
        </div>
        <div class="user-info q-mt-md">
          <h2 class="text-h4 text-weight-bold q-mb-xs user-name">
            {{ authStore.user.username }}
          </h2>
          <div class="user-badges q-mb-sm">
            <q-chip
              v-if="authStore.user.is_supporter"
              color="pink"
              text-color="white"
              icon="favorite"
              size="sm"
              class="supporter-badge"
            >
              Supporter
            </q-chip>
          </div>
          <div class="text-overline text-primary">Welcome Back!</div>
        </div>
      </div>

      <!-- Default Welcome for Non-authenticated Users -->
      <div v-else class="default-welcome">
        <div class="text-overline text-primary q-mb-sm">Welcome!</div>
        <div class="welcome-icon q-mb-md">
          <q-icon name="music_note" size="80px" color="primary" class="animated-icon" />
        </div>
      </div>

      <h1 class="text-h2 text-weight-bold q-mb-md animated-greeting">{{ greeting }}</h1>
      <p
        class="text-subtitle1 text-grey-7 q-mb-lg"
        style="max-width: 500px; margin-left: auto; margin-right: auto"
      >
        Your Osu! music hub. Discover, listen, and enjoy.
      </p>
    </section>

    <q-separator spaced="xl" inset />

    <!-- Recommendations Grid -->
    <section class="recommendations-grid q-mt-xl">
      <div class="row q-col-gutter-lg">
        <!-- OSU! Community Picks -->
        <div class="col-12 col-md-4">
          <h2 class="text-h5 text-weight-medium q-mb-md section-title">
            <q-icon name="groups" class="q-mr-sm text-primary" />
            Community Hot Picks
          </h2>
          <div class="recommend-section">
            <q-card
              flat
              bordered
              class="placeholder-card bg-grey-9"
              @click="handleCommunityPicksClick"
            >
              <q-card-section class="text-center">
                <q-icon name="whatshot" size="lg" color="deep-orange" class="q-mb-sm" />
                <div class="text-subtitle2">Top tracks from the Osu! community.</div>
                <div class="text-caption text-grey-6 q-mt-xs">(Coming Soon)</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
        <!-- Recommended for You -->
        <div class="col-12 col-md-4">
          <h2 class="text-h5 text-weight-medium q-mb-md section-title">
            <q-icon name="person_pin" class="q-mr-sm text-primary" />
            Just For You
          </h2>
          <div class="recommend-section">
            <q-card flat bordered class="placeholder-card bg-grey-9" @click="handleForYouClick">
              <q-card-section class="text-center">
                <q-icon name="album" size="lg" color="light-blue" class="q-mb-sm" />
                <div class="text-subtitle2">Personalized based on your listening.</div>
                <div class="text-caption text-grey-6 q-mt-xs">(Coming Soon)</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
        <!-- Tag-based Recommendations -->
        <div class="col-12 col-md-4">
          <h2 class="text-h5 text-weight-medium q-mb-md section-title">
            <q-icon name="sell" class="q-mr-sm text-primary" />
            Explore by Tags
          </h2>
          <div class="recommend-section">
            <q-card
              flat
              bordered
              class="placeholder-card bg-grey-9"
              @click="handleExploreByTagsClick"
            >
              <q-card-section class="text-center">
                <q-icon name="tag" size="lg" color="green" class="q-mb-sm" />
                <div class="text-subtitle2">Discover music through popular tags.</div>
                <div class="text-caption text-grey-6 q-mt-xs">(Coming Soon)</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </section>

    <!-- Call to Action -->
    <section class="q-py-xl text-center cta-buttons">
      <template v-if="authStore.isAuthenticated && authStore.user">
        <q-btn
          :to="{ name: 'authSettings' }"
          label="Account & Settings"
          color="primary"
          rounded
          icon="manage_accounts"
          class="q-px-lg"
          unelevated
        />
        <q-btn
          label="Logout"
          color="negative"
          outline
          rounded
          icon="logout"
          @click="handleLogout"
          class="q-px-lg"
        />
      </template>
      <template v-else>
        <q-btn
          :to="{ name: 'authSettings' }"
          label="Setup Osu! Authentication"
          color="secondary"
          size="lg"
          unelevated
          rounded
          icon="account_circle"
          class="q-px-xl q-py-sm main-cta"
        />
        <q-btn
          :to="{ name: 'authSettings' }"
          label="General Settings"
          color="grey-7"
          outline
          rounded
          icon="settings"
          class="q-px-lg"
        />
      </template>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from 'src/stores/authStore';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

const authStore = useAuthStore();
const router = useRouter();
const $q = useQuasar();

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
});

function handleLogout() {
  authStore.logout();
  $q.notify({
    type: 'info',
    message: 'You have been logged out.',
    icon: 'info',
  });
  router.push({ name: 'home' }).catch(() => {});
}

function handleCommunityPicksClick() {
  console.log('Community Hot Picks card clicked!');
  $q.notify('Community Hot Picks clicked (Coming Soon)');
}

function handleForYouClick() {
  console.log('Just For You card clicked!');
  $q.notify('Just For You clicked (Coming Soon)');
}

function handleExploreByTagsClick() {
  console.log('Explore by Tags card clicked!');
  $q.notify('Explore by Tags clicked (Coming Soon)');
}
</script>

<style lang="scss" scoped>
.welcome-section {
  .user-profile-header {
    .user-avatar-container {
      position: relative;
      display: inline-block;

      .user-avatar {
        border: 4px solid rgba(var(--q-primary-rgb), 0.2);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);

        // 优化图片填充和居中
        :deep(img) {
          object-fit: cover;
          width: 100%;
          height: 100%;
          display: block;
        }
      }

      .avatar-ring {
        position: absolute;
        width: calc(100%);
        height: calc(100%);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(1.1);
        border: 2px solid $primary;
        border-radius: 50%;
        opacity: 0;
        animation: pulse-ring 2s infinite alternate;
        pointer-events: none;
      }
    }

    .user-info {
      .user-name {
        background: linear-gradient(45deg, $primary, #ff6b9d);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: gradient-shift 3s ease-in-out infinite;
      }

      .user-badges {
        display: flex;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;

        .supporter-badge {
          animation: sparkle 2s ease-in-out infinite;
        }
      }
    }
  }

  .default-welcome {
    .welcome-icon {
      .animated-icon {
        animation: float 3s ease-in-out infinite;
      }
    }
  }

  .animated-greeting {
    animation: fadeInDown 0.8s ease-out;
  }

  .explore-btn {
    transition:
      transform 0.2s ease-out,
      box-shadow 0.2s ease-out;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
    }
  }
}

.section-title {
  display: flex;
  align-items: center;
  border-bottom: 2px solid $primary;
  padding-bottom: calc(8px);
  margin-bottom: calc(24px);
}

.recommend-section {
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 2rem;
}

.placeholder-card {
  cursor: pointer;
  background-color: $drawer-bg;
  transition:
    box-shadow 0.3s ease-in-out,
    transform 0.3s ease-in-out,
    background-color 0.3s ease-in-out;

  &:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
    transform: translateY(-5px) scale(1.02);
    background-color: color-mix(in srgb, $drawer-bg 95%, white 5%);
  }
}

.cta-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px; // 统一使用 gap 来控制按钮间距，确保居中

  // 移动端竖直排列并加间距
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 16px; // 移动端也使用 gap

    .q-btn {
      width: auto;
      max-width: auto;
      margin: 0; // 清除所有按钮自身的 margin
    }
  }
}

// 移动端样式已在上面的 .cta-buttons 中统一处理

// 动画定义
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(1.05);
    opacity: 0.7;
  }

  100% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 0;
  }
}

@keyframes gradient-shift {
  0%,
  100% {
    background: linear-gradient(45deg, $primary, #ff6b9d);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  50% {
    background: linear-gradient(45deg, #ff6b9d, $primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

@keyframes sparkle {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1);
  }

  50% {
    transform: scale(1.05);
    filter: brightness(1.2);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-10px);
  }
}
</style>
