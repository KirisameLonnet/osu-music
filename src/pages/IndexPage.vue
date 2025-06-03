<template>
  <q-page class="index-page q-pa-md">
    <!-- Welcome Section -->
    <section class="welcome-section text-center q-py-xl">
      <div class="text-overline text-primary q-mb-sm">Welcome Back!</div>
      <h1 class="text-h2 text-weight-bold q-mb-md animated-greeting">{{ greeting }}</h1>
      <p
        class="text-subtitle1 text-grey-7 q-mb-lg"
        style="max-width: 500px; margin-left: auto; margin-right: auto"
      >
        Your Osu! music hub. Discover, listen, and enjoy.
      </p>
      <div class="text-center">
        <q-btn
          to="/browse"
          label="Explore Music Library"
          color="primary"
          size="lg"
          unelevated
          rounded
          icon-right="eva-arrow-ios-forward-outline"
          class="q-px-xl q-py-sm explore-btn"
        ></q-btn>
      </div>
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
            <q-card flat bordered class="placeholder-card">
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
            <q-card flat bordered class="placeholder-card">
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
            <q-card flat bordered class="placeholder-card">
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
    <section class="q-py-xl text-center">
      <q-btn
        to="/auth-settings"
        label="Setup Osu! Authentication"
        color="secondary"
        outline
        rounded
        icon="account_circle"
        class="q-px-lg q-mr-md"
      />
      <q-btn
        to="/settings"
        label="General Settings"
        color="grey-7"
        outline
        rounded
        icon="settings"
        class="q-px-lg"
      />
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
});
</script>

<style lang="scss" scoped>
.welcome-section {
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
  padding-bottom: 8px;
  margin-bottom: 24px;
}

.recommend-section {
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 2rem;
}
.placeholder-card {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    box-shadow 0.3s ease-in-out,
    transform 0.3s ease-in-out;
  &:hover {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-4px);
  }
}
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
</style>
