// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { configure } from 'quasar/wrappers';
import { fileURLToPath } from 'node:url';

export default configure((ctx) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['i18n', 'axios', 'auth', 'deeplink'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },

      typescript: {
        strict: true,
        vueShim: true,
        // extendTsConfig (tsConfig) {}
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      // env: {},
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      // extendViteConf (viteConf) {},
      // viteVuePluginOptions: {},

      vitePlugins: [
        [
          '@intlify/unplugin-vue-i18n/vite',
          {
            // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
            // compositionOnly: false,

            // if you want to use named tokens in your Vue I18n messages, such as 'Hello {name}',
            // you need to set `runtimeOnly: false`
            // runtimeOnly: false,

            ssr: ctx.modeName === 'ssr',

            // you need to set i18n resource including paths !
            include: [fileURLToPath(new URL('./src/i18n', import.meta.url))],
          },
        ],

        [
          'vite-plugin-checker',
          {
            vueTsc: true,
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      open: true, // opens browser window automatically
      proxy: {
        '/osu-api': {
          target: 'https://osu.ppy.sh/api/v2',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/osu-api/, ''),
        },
      },
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: ['Notify', 'Dialog', 'Loading'],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
    //   pwaServiceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render', // keep this as last one
      ],

      // extendPackageJson (json) {},
      // extendSSRWebserverConf (esbuildConf) {},

      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      pwa: false,
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!

      // pwaExtendGenerateSWOptions (cfg) {},
      // pwaExtendInjectManifestOptions (cfg) {}
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      // extendManifestJson (json) {},
      // useCredentialsForManifestTag: true,
      // injectPwaMetaTags: false,
      // extendPWACustomSWConf (esbuildConf) {},
      // extendGenerateSWOptions (cfg) {},
      // extendInjectManifestOptions (cfg) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (esbuildConf) {},
      // extendElectronPreloadConf (esbuildConf) {},

      // extendPackageJson (json) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      preloadScripts: ['electron-preload'],

      // specify the debugging port to use for the Electron app when running in development mode
      // 使用动态端口避免冲突，Windows 下更稳定
      inspectPort: ctx.dev ? (process.platform === 'win32' ? 0 : 5858) : 5858,

      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options

        // 应用基本信息
        name: 'osu-music',
        appVersion: '0.0.1',

        // 明确指定架构 - 针对 Windows AMD64
        arch: 'x64', // 强制使用 x64 架构 (AMD64)
        platform: 'win32', // 针对 Windows 平台

        // 图标配置
        icon: 'src-electron/icons/icon', // 不需要扩展名，packager会自动选择

        // 输出目录
        out: 'dist/electron',

        // 忽略的文件/目录
        ignore: [
          /\.git/,
          /node_modules\/.*\/test/,
          /node_modules\/.*\/tests/,
          /node_modules\/.*\/\.git/,
        ],

        // 跨平台编译设置
        // win32 特定设置
        win32metadata: {
          CompanyName: 'osu-music',
          ProductName: 'osu-music',
          FileDescription: 'osu! Music Player',
          InternalName: 'osu-music',
          OriginalFilename: 'osu-music.exe',
        },

        // macOS 特定设置
        appBundleId: 'com.osu-music.app',
        appCategoryType: 'public.app-category.music',

        // 协议注册
        protocol: 'osu-music-fusion',

        // 下载选项
        download: {
          cacheRoot: 'dist/.electron-download-cache',
        },

        // 额外资源
        // extraResource: [],
      },

      builder: {
        // https://www.electron.build/configuration/configuration
        appId: 'com.osu-music.app',

        // 产品名称
        productName: 'osu-music',

        // 版权信息
        copyright: 'Copyright © 2024 osu-music',

        // 目录配置
        directories: {
          output: 'dist/electron-builder',
        },

        // 文件配置
        files: ['dist/electron/**/*', 'node_modules/**/*', 'package.json'],

        // macOS 配置
        mac: {
          icon: 'src-electron/icons/icon.icns',
          category: 'public.app-category.music',
          target: [
            {
              target: 'dmg',
              arch: ['x64', 'arm64'],
            },
          ],
        },

        // Windows 配置
        win: {
          icon: 'src-electron/icons/icon.ico',
          target: [
            {
              target: 'nsis',
              arch: ['x64'],
            },
            {
              target: 'portable',
              arch: ['x64'],
            },
          ],
        },

        // Linux 配置
        linux: {
          icon: 'src-electron/icons/icon.png',
          category: 'Audio',
          target: [
            {
              target: 'AppImage',
              arch: ['x64'],
            },
            {
              target: 'deb',
              arch: ['x64'],
            },
          ],
        },

        // NSIS 安装器配置 (Windows)
        nsis: {
          oneClick: false,
          perMachine: false,
          allowToChangeInstallationDirectory: true,
          deleteAppDataOnUninstall: false,
        },

        // 协议注册
        protocols: [
          {
            name: 'osu-music-fusion',
            schemes: ['osu-music-fusion'],
          },
        ],
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: [],
    },
  };
});
