import { defineStore } from 'pinia';

interface AppSettings {
  osuClientId: string | null;
  osuClientSecret: string | null;
}

const defaultSettings: AppSettings = {
  osuClientId: null,
  osuClientSecret: null,
};

export const useSettingsStore = defineStore('settings', {
  state: (): AppSettings => ({
    ...defaultSettings,
  }),
  getters: {
    areCredentialsSet: (state): boolean => !!state.osuClientId && !!state.osuClientSecret,
  },
  actions: {
    async initializeSettings() {
      console.log('[SettingsStore] Initializing settings from storage...');
      try {
        // 从持久化存储加载设置
        if (window.electron?.settingsStore) {
          const clientId = await window.electron.settingsStore.get('osuClientId', null);
          const clientSecret = await window.electron.settingsStore.get('osuClientSecret', null);
          this.osuClientId = typeof clientId === 'string' ? clientId : null;
          this.osuClientSecret = typeof clientSecret === 'string' ? clientSecret : null;
          console.log('[SettingsStore] Loaded from Electron storage:', {
            clientId: this.osuClientId ? '***' + this.osuClientId.slice(-4) : null,
            clientSecret: this.osuClientSecret ? '***' : null,
          });
        } else {
          // 非 Electron 环境：使用 localStorage
          const clientId = localStorage.getItem('osuClientId');
          const clientSecret = localStorage.getItem('osuClientSecret');
          this.osuClientId = clientId;
          this.osuClientSecret = clientSecret;
          console.log('[SettingsStore] Loaded from localStorage');
        }
      } catch (error) {
        console.error('[SettingsStore] Failed to load settings:', error);
      }
    },

    async saveSettings(settingsToSave: Partial<AppSettings>) {
      console.log('[SettingsStore] Saving settings...');
      try {
        if (settingsToSave.osuClientId !== undefined) {
          this.osuClientId = settingsToSave.osuClientId?.trim() || null;
        }
        if (settingsToSave.osuClientSecret !== undefined) {
          this.osuClientSecret = settingsToSave.osuClientSecret?.trim() || null;
        }

        // 持久化到存储
        if (window.electron?.settingsStore) {
          window.electron.settingsStore.set('osuClientId', this.osuClientId);
          window.electron.settingsStore.set('osuClientSecret', this.osuClientSecret);
          console.log('[SettingsStore] Saved to Electron storage');
        } else {
          // 非 Electron 环境：使用 localStorage
          if (this.osuClientId) {
            localStorage.setItem('osuClientId', this.osuClientId);
          } else {
            localStorage.removeItem('osuClientId');
          }
          if (this.osuClientSecret) {
            localStorage.setItem('osuClientSecret', this.osuClientSecret);
          } else {
            localStorage.removeItem('osuClientSecret');
          }
          console.log('[SettingsStore] Saved to localStorage');
        }
      } catch (error) {
        console.error('[SettingsStore] Failed to save settings:', error);
      }
    },

    async clearOsuCredentials() {
      this.osuClientId = null;
      this.osuClientSecret = null;

      try {
        if (window.electron?.settingsStore) {
          window.electron.settingsStore.set('osuClientId', null);
          window.electron.settingsStore.set('osuClientSecret', null);
        } else {
          localStorage.removeItem('osuClientId');
          localStorage.removeItem('osuClientSecret');
        }
        console.log('[SettingsStore] Credentials cleared from storage');
      } catch (error) {
        console.error('[SettingsStore] Failed to clear credentials:', error);
      }
    },
  },
});
