// src/services/api/osuAuthService.ts
import { useAuthStore } from 'src/stores/authStore';
import { useSettingsStore } from 'stores/settingsStore';
import { getPlatformService } from '../core/platform';

// OAuth 配置常量
const OSU_AUTHORIZE_URL = 'https://osu.ppy.sh/oauth/authorize';
const OSU_TOKEN_URL = 'https://osu.ppy.sh/oauth/token';

// 获取平台服务实例
const platform = getPlatformService();

// 定义 Token 响应的接口
interface OsuTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * 获取平台特定的重定向 URI
 */
function getRedirectUri(): string {
  const platformInfo = platform.getPlatformInfo();

  switch (platformInfo.type) {
    case 'electron':
      return 'osu-music-fusion://oauth/callback';
    case 'ios':
      return 'osu-music-fusion://oauth/callback';
    case 'android':
      return 'osu-music-fusion://oauth/callback';
    default:
      // Web 环境使用当前域名
      return `${window.location.origin}/oauth/callback`;
  }
}

/**
 * 使用平台特定的方式重定向到 Osu! 登录页面
 */
export async function redirectToOsuLogin(): Promise<void> {
  const settingsStore = useSettingsStore();
  const clientId = settingsStore.osuClientId;

  if (typeof clientId !== 'string' || !clientId.trim()) {
    console.error('Osu! Client ID is not configured in application settings.');
    alert('Please configure your Osu! Client ID in the Settings page.');
    return;
  }

  try {
    const redirectUri = getRedirectUri();
    const platformInfo = platform.getPlatformInfo();

    if (platformInfo.type === 'electron') {
      // Electron: 使用系统浏览器
      await handleElectronOAuth(clientId, redirectUri);
    } else {
      // Capacitor (iOS/Android): 使用应用内浏览器
      await handleCapacitorOAuth(clientId, redirectUri);
    }
  } catch (error) {
    console.error('OAuth error:', error);
    alert(`OAuth error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 处理 Electron 平台的 OAuth（系统浏览器）
 */
async function handleElectronOAuth(clientId: string, redirectUri: string): Promise<void> {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify public friends.read chat.read',
  });

  const authUrl = `${OSU_AUTHORIZE_URL}?${params.toString()}`;

  console.log('[OAuth] Opening system browser for Electron OAuth');
  console.log('- Auth URL:', authUrl);
  console.log('- Redirect URI:', redirectUri);

  // 使用 Electron IPC 打开系统浏览器
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('open-external-url', authUrl);
  } else {
    // 降级处理
    window.open(authUrl, '_blank');
  }
}

/**
 * 处理 Capacitor 平台的 OAuth（应用内浏览器）
 */
async function handleCapacitorOAuth(clientId: string, redirectUri: string): Promise<void> {
  const settingsStore = useSettingsStore();

  console.log('[OAuth] Using Capacitor in-app browser for OAuth');

  try {
    const oauthResult = await platform.openOAuth({
      clientId: clientId,
      clientSecret: settingsStore.osuClientSecret || '',
      redirectUri: redirectUri,
      scopes: ['identify', 'public', 'friends.read', 'chat.read'],
      authUrl: OSU_AUTHORIZE_URL,
      tokenUrl: OSU_TOKEN_URL,
    });

    if (oauthResult.error) {
      console.error('[OAuth] OAuth failed:', oauthResult.error, oauthResult.errorDescription);
      alert(`OAuth failed: ${oauthResult.error}`);
      return;
    }

    if (oauthResult.code) {
      console.log('[OAuth] Authorization code received, will be processed by deep link handler');
      // 在Capacitor平台，深链接处理器会处理token交换
      // 这里只需要记录日志，不需要重复处理
    }
  } catch (error) {
    console.error('[OAuth] Error in Capacitor OAuth flow:', error);
    alert(`OAuth error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 使用授权码获取 Access Token
 * @param code - 从 OAuth 回调中获取的授权码
 * @returns Promise<boolean> - 指示 token 获取是否成功
 */
export async function handleOsuCallback(code: string): Promise<boolean> {
  const settingsStore = useSettingsStore();
  const clientId = settingsStore.osuClientId;
  const clientSecret = settingsStore.osuClientSecret;

  if (!clientId || !clientSecret) {
    console.error('Osu! Client ID or Client Secret not configured for token exchange.');
    alert('Please configure your Osu! Client ID and Client Secret in the Settings page.');
    return false;
  }

  // 首先测试网络连接
  const networkOk = await testNetworkConnection();
  if (!networkOk) {
    console.error('[OAuth] Network connection test failed');
    alert('网络连接失败，请检查网络连接后重试');
    return false;
  }

  try {
    const redirectUri = getRedirectUri();

    // 添加详细的调试日志
    console.log('[OAuth Debug] Token exchange parameters:');
    console.log('- Client ID:', clientId);
    console.log('- Client Secret:', clientSecret ? '***' + clientSecret.slice(-4) : 'null');
    console.log('- Authorization Code:', code);
    console.log('- Redirect URI:', redirectUri);
    console.log('- Grant Type:', 'authorization_code');

    // 使用平台抽象层进行 HTTP 请求
    const response = await platform.httpRequest<OsuTokenResponse>({
      url: OSU_TOKEN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    console.log('[OAuth Debug] Token exchange response status:', response.status);
    console.log('[OAuth Debug] Token exchange response data:', response.data);

    if (response.status === 200 && response.data) {
      const tokenData = response.data;
      if (tokenData.access_token) {
        const authStore = useAuthStore();
        await authStore.setTokens(
          tokenData.access_token,
          tokenData.refresh_token,
          tokenData.expires_in,
        );
        console.log('[OAuth] Token exchange successful');
        return true;
      }
    }

    // 详细的错误处理
    console.error('[OAuth] Token exchange failed');
    console.error('- Response Status:', response.status);
    console.error('- Response Data:', response.data);

    if (response.status === 400) {
      const errorData = response.data as {
        error?: string;
        error_description?: string;
        message?: string;
      };
      if (errorData?.error === 'invalid_client') {
        console.error('[OAuth] Invalid Client Error - Possible causes:');
        console.error('1. Client ID or Client Secret is incorrect');
        console.error("2. Redirect URI doesn't match what's registered in OSU! app");
        console.error('3. Client credentials are not properly configured');
        alert(
          `OAuth 错误: 客户端认证失败\n\n可能的原因:\n1. Client ID 或 Client Secret 不正确\n2. 重定向 URI 与 OSU! 应用设置中的不匹配\n3. 授权码已过期\n\n当前重定向 URI: ${getRedirectUri()}\n请检查 OSU! 开发者控制台中的设置`,
        );
      } else if (errorData?.error === 'invalid_grant') {
        console.error('[OAuth] Invalid Grant - Authorization code expired or invalid');
        alert('OAuth 错误: 授权码无效或已过期，请重新登录');
      } else {
        alert(
          `OAuth 错误: ${errorData?.error || 'Unknown error'}\n${errorData?.error_description || ''}`,
        );
      }
    } else {
      alert(`OAuth 错误: HTTP ${response.status}\n${JSON.stringify(response.data)}`);
    }

    return false;
  } catch (error) {
    console.error('[OAuth] Token exchange failed:', error);

    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error) {
      if (error.message.includes('Load Failed') || error.message.includes('Network Error')) {
        errorMessage = '网络连接失败，请检查网络连接后重试';
      } else if (error.message.includes('HTTP request failed')) {
        errorMessage = '服务器请求失败，请稍后重试';
      } else {
        errorMessage = error.message;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    alert(`OAuth 请求失败: ${errorMessage}`);
    const authStore = useAuthStore();
    authStore.logout();
    return false;
  }
}

/**
 * 使用 Refresh Token 获取新的 Access Token
 */
export async function refreshToken(): Promise<boolean> {
  const settingsStore = useSettingsStore();
  const clientId = settingsStore.osuClientId;
  const clientSecret = settingsStore.osuClientSecret;
  const authStore = useAuthStore();

  if (!authStore.refreshToken) {
    console.warn('No Osu! refresh token available for refresh.');
    authStore.logout();
    return false;
  }

  if (!clientId || !clientSecret) {
    console.error('Osu! API credentials not configured for token refresh.');
    authStore.logout();
    return false;
  }

  try {
    // 使用平台抽象层进行 HTTP 请求
    const response = await platform.httpRequest<OsuTokenResponse>({
      url: OSU_TOKEN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: authStore.refreshToken,
        scope: 'identify public friends.read chat.read',
      }).toString(),
    });

    if (response.status === 200 && response.data) {
      const tokenData = response.data;
      if (tokenData.access_token) {
        await authStore.setTokens(
          tokenData.access_token,
          tokenData.refresh_token || authStore.refreshToken, // 保留旧的 refresh token 如果没有新的
          tokenData.expires_in,
        );
        console.log('[OAuth] Token refresh successful');
        return true;
      }
    }

    console.error('[OAuth] Invalid refresh response:', response);
    if (response.status === 400 || response.status === 401) {
      authStore.logout(); // refresh token 无效，需要重新登录
    }
    return false;
  } catch (error) {
    console.error('[OAuth] Token refresh failed:', error);
    return false;
  }
}

/**
 * 测试网络连接到osu.ppy.sh
 */
async function testNetworkConnection(): Promise<boolean> {
  try {
    console.log('[OAuth] Testing network connection to osu.ppy.sh...');

    const response = await platform.httpRequest({
      url: 'https://osu.ppy.sh',
      method: 'GET',
      headers: {
        'User-Agent': 'OSU-Music-App/1.0',
      },
    });

    console.log('[OAuth] Network test response status:', response.status);
    return response.status >= 200 && response.status < 400;
  } catch (error) {
    console.error('[OAuth] Network connection test failed:', error);
    return false;
  }
}
