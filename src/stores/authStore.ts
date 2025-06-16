// src/stores/auth.ts
import { defineStore } from 'pinia';
import { refreshToken as refreshOsuTokenService } from 'src/services/api/osuAuthService'; // 导入刷新服务
import { getPlatformService } from 'src/services/core/platform'; // 导入平台抽象层

// 定义用户信息的接口
export interface OsuUserProfile {
  id: number;
  username: string;
  avatar_url: string;
  country_code: string;
  is_supporter: boolean;
  // ... 根据 Osu! API /me 端点返回的数据添加更多字段
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: OsuUserProfile | null;
  isLoading: boolean;
  pendingOAuthCode: string | null; // 新增临时存储 code
}

// 定义 IPC 返回结果类型

// 创建平台服务实例
const platform = getPlatformService();

// 异步加载存储的认证数据
async function loadStoredAuthData(): Promise<Partial<AuthState>> {
  try {
    const [accessToken, refreshToken, expiresAt, userProfile] = await Promise.all([
      platform.getStorage('osu_access_token'),
      platform.getStorage('osu_refresh_token'),
      platform.getStorage('osu_expires_at'),
      platform.getStorage('osu_user_profile'),
    ]);

    return {
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      expiresAt: expiresAt ? parseInt(expiresAt, 10) : null,
      user: userProfile ? JSON.parse(userProfile) : null,
    };
  } catch (error) {
    console.error('[AuthStore] Failed to load stored auth data:', error);
    return {};
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null, // 将通过 initializeFromStorage 异步加载
    refreshToken: null,
    expiresAt: null,
    user: null,
    isLoading: false,
    pendingOAuthCode: null,
  }),

  getters: {
    isAuthenticated: (state): boolean => {
      return !!state.accessToken && (state.expiresAt ? Date.now() < state.expiresAt : false);
    },
    currentUser: (state) => state.user,
  },

  actions: {
    // 初始化认证数据（从跨平台存储加载）
    async initializeFromStorage() {
      try {
        const storedData = await loadStoredAuthData();
        this.accessToken = storedData.accessToken || null;
        this.refreshToken = storedData.refreshToken || null;
        this.expiresAt = storedData.expiresAt || null;
        this.user = storedData.user || null;
        console.log('[AuthStore] Initialized from platform storage');
      } catch (error) {
        console.error('[AuthStore] Failed to initialize from storage:', error);
      }
    },

    async setTokens(accessToken: string, refreshToken: string | null, expiresIn: number) {
      this.accessToken = accessToken;
      this.expiresAt = Date.now() + (expiresIn - 300) * 1000; // 提前 5 分钟视为过期，以便刷新

      if (refreshToken) {
        // Osu! 可能在每次刷新时不一定返回新的 refresh token
        this.refreshToken = refreshToken;
      }

      // 使用平台抽象层保存到存储
      try {
        await Promise.all([
          platform.setStorage('osu_access_token', accessToken),
          platform.setStorage('osu_expires_at', this.expiresAt.toString()),
          refreshToken ? platform.setStorage('osu_refresh_token', refreshToken) : Promise.resolve(),
        ]);
        console.log('[AuthStore] Tokens saved to platform storage');
      } catch (error) {
        console.error('[AuthStore] Failed to save tokens to storage:', error);
      }

      // 在设置 token 后立即获取用户信息
      void this.fetchUserProfile();
    },
    setPendingOAuthCode(code: string | null) {
      this.pendingOAuthCode = code;
      if (code) {
        console.log('[AuthStore] Pending OAuth Code SET:', code);
      } else {
        console.log('[AuthStore] Pending OAuth Code CLEARED.');
      }
    },
    consumePendingOAuthCode(): string | null {
      const code = this.pendingOAuthCode;
      this.pendingOAuthCode = null;
      if (code) {
        console.log('[AuthStore] Pending OAuth Code CONSUMED:', code);
      }
      return code;
    },

    async fetchUserProfile() {
      if (!this.accessToken) {
        console.warn('[AuthStore] Cannot fetch user profile without an access token.');
        throw new Error('No access token available for fetching user profile.');
      }

      this.isLoading = true;
      try {
        // 使用平台抽象层获取用户配置文件
        const result = await platform.fetchUserProfile<OsuUserProfile>(this.accessToken);

        if (result.success && result.data) {
          this.user = result.data;
          // 使用平台抽象层保存用户配置文件
          await platform.setStorage('osu_user_profile', JSON.stringify(this.user));
        } else {
          if (result.status === 401) {
            const refreshed = await this.tryRefreshToken();
            if (refreshed) {
              const newResult = await platform.fetchUserProfile<OsuUserProfile>(this.accessToken!);
              if (newResult.success && newResult.data) {
                this.user = newResult.data;
                await platform.setStorage('osu_user_profile', JSON.stringify(this.user));
              } else {
                throw new Error(newResult.error || 'Failed to fetch profile after refresh');
              }
            } else {
              this.logout();
              throw new Error('Token refresh failed.');
            }
          } else {
            throw new Error(result.error || 'Failed to fetch user profile.');
          }
        }
      } catch (error) {
        console.error('[AuthStore] Error fetching user profile:', error);
        this.isLoading = false;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async tryRefreshToken(): Promise<boolean> {
      if (!this.refreshToken) {
        console.warn('No refresh token available to try refresh.');
        this.logout(); // 没有 refresh token，直接登出
        return false;
      }
      this.isLoading = true;
      try {
        // 调用 osuAuthService 中的刷新逻辑
        return await refreshOsuTokenService();
      } finally {
        this.isLoading = false;
      }
    },

    async logout() {
      this.accessToken = null;
      this.refreshToken = null;
      this.expiresAt = null;
      this.user = null;

      // 使用平台抽象层清除存储数据
      try {
        await Promise.all([
          platform.removeStorage('osu_access_token'),
          platform.removeStorage('osu_refresh_token'),
          platform.removeStorage('osu_expires_at'),
          platform.removeStorage('osu_user_profile'),
        ]);
        console.log('[AuthStore] User logged out, storage cleared');
      } catch (error) {
        console.error('[AuthStore] Failed to clear storage on logout:', error);
      }

      // 清除 sessionStorage（仍需要直接使用，因为这是临时数据）
      sessionStorage.removeItem('osu_code_verifier');
      console.log('[AuthStore] User logged out from Osu! store.');
    },

    // 初始化 store，例如在应用启动时调用
    // 检查 token 是否仍然有效，如果无效或即将过期，尝试刷新
    async initAuth() {
      if (this.accessToken && this.expiresAt && Date.now() >= this.expiresAt) {
        console.log('Access token expired, attempting refresh on init.');
        await this.tryRefreshToken();
      }
      // 如果有 token 但没有 user 信息，尝试获取
      if (this.isAuthenticated && !this.user) {
        await this.fetchUserProfile();
      }
    },
  },
});
