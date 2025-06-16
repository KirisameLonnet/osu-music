// src/router/routes.ts

import type { RouteRecordRaw } from 'vue-router';
import MainLayout from 'layouts/MainLayout.vue'; // 直接导入，或使用异步导入

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout, // 使用 MainLayout 作为根布局
    children: [
      // 首页 (默认子路由)
      {
        path: '', // 当访问 '/' 时，默认显示这个
        name: 'home',
        component: () => import('pages/IndexPage.vue'),
        meta: { title: 'Home', icon: 'home' },
      },
      // 播放器页
      {
        path: 'player', // 访问 '/player'
        name: 'player',
        component: () => import('pages/PlayerPage.vue'), // 你需要创建这个页面
        meta: { title: 'Player', icon: 'play_circle_filled' },
      },
      // 曲库页
      {
        path: 'library', // 访问 '/library'
        name: 'library',
        component: () => import('pages/LibraryPage.vue'), // 你需要创建这个页面
        meta: { title: 'Library', icon: 'library_music' },
      },
      // Recent Played 页
      {
        path: 'recent-played', // 访问 '/recent-played'
        name: 'recentPlayed',
        component: () => import('pages/RecentPlayed.vue'),
        meta: { title: 'Recent Played', icon: 'history' },
      },
      // 搜索页
      {
        path: 'search', // 访问 '/search'
        name: 'search',
        component: () => import('pages/SearchPage.vue'), // 你需要创建这个页面
        meta: { title: 'Search', icon: 'search' },
      },
      // 资源页
      {
        path: 'resources', // 访问 '/resources'
        name: 'resources',
        component: () => import('pages/ResourcesPage.vue'), // 你需要创建这个页面
        meta: { title: 'Resources', icon: 'public' },
      },
      // 单个播放列表详情页
      {
        path: 'playlist/:id', // 访问 '/playlist/歌单ID'
        name: 'playlist',
        component: () => import('pages/PlaylistPage.vue'),
        meta: { title: 'Playlist', icon: 'queue_music' },
        props: true, // 使路由参数作为props传递给组件
      },
      // Safe Area 演示页面
      {
        path: 'safe-area-demo', // 访问 '/safe-area-demo'
        name: 'safeAreaDemo',
        component: () => import('pages/SafeAreaDemoPage.vue'),
        meta: { title: 'Safe Area Demo', icon: 'phone_iphone' },
      },
      // 认证设置页
      {
        path: 'auth-settings', // 访问 '/auth-settings'
        name: 'authSettings',
        component: () => import('pages/AuthSettingsPage.vue'), // 认证设置页面
        meta: { title: 'Authentication Settings', icon: 'account_circle' },
      },
      // 平台测试页面
      {
        path: 'platform-test', // 访问 '/platform-test'
        name: 'platformTest',
        component: () => import('pages/PlatformTestPage.vue'),
        meta: { title: 'Platform Test', icon: 'science' },
      },
      // Edge-to-Edge 测试页面
      {
        path: 'edge-to-edge-test', // 访问 '/edge-to-edge-test'
        name: 'edgeToEdgeTest',
        component: () => import('pages/EdgeToEdgeTestPage.vue'),
        meta: { title: 'Edge-to-Edge Test', icon: 'fullscreen' },
      },
      {
        path: 'oauth/callback', // Osu! 回调路由
        name: 'osuCallback', // 路由名称
        component: () => import('pages/OsuCallbackPage.vue'), // 指向回调页面组件
        meta: { title: 'Osu! Callback', public: true },
      },
    ],
  },

  // 404 页面
  {
    path: '/:catchAll(.*)*',
    name: 'NotFound',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
