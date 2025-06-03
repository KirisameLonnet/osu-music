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
      // 浏览页
      {
        path: 'browse', // 访问 '/browse'
        name: 'browse',
        component: () => import('pages/BrowsePage.vue'), // 你需要创建这个页面
        meta: { title: 'Browse', icon: 'explore' },
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
      // 设置页 (也可以是 MainLayout 的子路由)
      {
        path: 'settings', // 访问 '/settings'
        name: 'settings',
        component: () => import('pages/SettingsPage.vue'), // 你需要创建这个页面
        meta: { title: 'Settings', icon: 'settings' },
      },
      // 认证设置页
      {
        path: 'auth-settings', // 访问 '/auth-settings'
        name: 'authSettings',
        component: () => import('pages/AuthSettingsPage.vue'), // 认证设置页面
        meta: { title: 'Authentication Settings', icon: 'account_circle' },
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
