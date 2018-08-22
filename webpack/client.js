// Dependencies
const { DefinePlugin, EnvironmentPlugin } = require('webpack');
const merge = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const WebpackPwaManifest = require('webpack-pwa-manifest');
const CompressionPlugin = require('compression-webpack-plugin');
const webpackServeWaitpage = require('webpack-serve-waitpage');
const defaults = require('lodash.defaults');
const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware');
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware');
const ignoredFiles = require('react-dev-utils/ignoredFiles');
const convert = require('koa-connect');
const history = require('connect-history-api-fallback');
const proxy = require('http-proxy-middleware');
const path = require('path');
const common = require('./common.js');
const getPaths = require('../src/lib/getPaths');
const clientBabelPreset = require('../babel/client');

// Init
const getOpts = options => {
  const paths = getPaths(options.cwd);
  return defaults({}, options, {
    env: process.env.NODE_ENV,
    analyze: false,
    target: 'web',
    name: undefined,
    // See https://github.com/arthurbergmz/webpack-pwa-manifest for more information on how to specify manifest
    // pwaManifest: {
    //   name: 'Varan Progressive Web App!',
    //   short_name: 'VaranPWA',
    //   description: 'My awesome Progressive Web App using Varan!',
    //   background_color: '#ffffff',
    //   icons: [],
    // },
    pwaManifest: false,
    appDir: paths.appDir,
    appSourceDir: paths.appSourceDir,
    appTargetDir: paths.appTargetDir,
    targetDir: paths.client.targetDir,
    sourceDir: paths.client.sourceDir,
    entry: paths.client.entry,
    favicon: paths.client.favicon,
    devServerPort: process.env.DEV_PORT || 3000,
    serverPort: process.env.PORT || 3001,
  });
};

// Exports
module.exports = options => {
  const opts = getOpts(options);
  const isDev = opts.env !== 'production';
  const publicPath = isDev ? `http://localhost:${opts.devServerPort}/` : `/${path.dirname(opts.entry).substr(2)}`;
  const outputPath = path.resolve(opts.targetDir);
  const name = opts.name || path.basename(opts.entry);
  return merge.smart(common(opts), {
    name,
    devtool: isDev ? 'cheap-module-source-map' : 'none',
    // webpack-serve config - stripped before sending to webpack if it exists
    serve: {
      content: opts.targetDir,
      clipboard: false,
      logTime: true,
      logLevel: 'silent',
      hotClient: {
        logTime: true,
        logLevel: 'silent',
        reload: true,
        hmr: true,
      },
      devMiddleware: {
        watchOptions: {
          ignored: ignoredFiles(opts.sourceDir),
        },
        publicPath,
        logTime: true,
        logLevel: 'silent',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        writeToDisk: true,
        // TODO: Enable this again (after webpack-serve >v2.0.2) and verify HMR is working correctly => writeToDisk: p => /^(?!.*(\.hot-update\.)).*/.test(p),
      },
      add: (app, middleware, options) => {
        app.use(convert(errorOverlayMiddleware()));
        app.use(webpackServeWaitpage(options, { title: '🔁 Building...', theme: 'dark' }));
        app.use(
          (ctx, next) =>
            new Promise((resolve, reject) => {
              // Monkeypatch res.send
              ctx.res.send = body => {
                ctx.body = body;
                resolve();
              };
              convert(noopServiceWorkerMiddleware())(ctx, next)
                .then(resolve)
                .catch(reject);
            }),
        );
        middleware.webpack();
        middleware.content();
        app.use(convert(proxy('/', { target: `http://localhost:${opts.serverPort}/` })));
        app.use(convert(history()));
      },
    },
    performance: false,
    entry: [path.resolve(opts.sourceDir, opts.entry)].filter(Boolean),
    output: {
      path: outputPath,
      filename: isDev ? 'dev-bundle.js' : 'static/js/[name].[contenthash:8].js',
      chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
      pathinfo: isDev,
      publicPath,
      libraryTarget: 'var',
    },
    module: {
      rules: [
        {
          test: /\.(jsx?|mjs|tsx?)$/,
          exclude: /node_modules/,
          loader: require.resolve('babel-loader'),
          options: {
            cacheDirectory: isDev,
            compact: !isDev,
            presets: [[clientBabelPreset]],
          },
        },
      ],
    },
    plugins: [
      new DefinePlugin({
        BUILD_TARGET: JSON.stringify('client'),
        'process.env.BABEL_ENV': JSON.stringify(opts.env),
        'process.env.NODE_ENV': JSON.stringify(opts.env),
        'process.env.browser': JSON.stringify(true),
      }),
      new EnvironmentPlugin({
        DEBUG: false,
      }),
      new ManifestPlugin({
        fileName: 'asset-manifest.json',
      }),
      opts.pwaManifest &&
        new WebpackPwaManifest({
          inject: false,
          fingerprints: !isDev,
          ...opts.pwaManifest,
        }),
      opts.analyze && new BundleAnalyzerPlugin(),
      !isDev &&
        new CompressionPlugin({
          asset: '[path].gz[query]',
          algorithm: 'gzip',
          test: /(\.js|\.json|\.html|\.css|\.svg|\.eot)$/,
          threshold: 4 * 1024,
          minRatio: 0.8,
        }),
      !isDev &&
        new MiniCssExtractPlugin({
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
        }),
      !isDev &&
        new SWPrecacheWebpackPlugin({
          cacheId: name,
          dontCacheBustUrlsMatching: /(\.\w{8}\.)/,
          filename: 'service-worker.js',
          minify: !isDev,
          mergeStaticsConfig: true,
          skipWaiting: true,
          clientsClaim: true,
          directoryIndex: false,
          dynamicUrlToDependencies: {
            [publicPath]: [`${outputPath}/stats-manifest.json`],
          },
          navigateFallback: publicPath,
          navigateFallbackWhitelist: [/^(?!\/__).*/],
          staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/, /stats-manifest\.json$/, /\.gz$/],
          runtimeCaching: [
            {
              handler: 'fastest',
              urlPattern: /\/*/,
            },
          ],
          logger(message) {
            if (message.startsWith('Total precache size is') || message.startsWith('Skipping static resource')) return;
            console.log(message);
          },
        }),
    ].filter(Boolean),
    optimization: isDev
      ? {}
      : {
          minimizer: [
            new UglifyJSPlugin({
              cache: true,
              parallel: true,
              uglifyOptions: {
                compress: true,
                output: {
                  comments: false,
                  ascii_only: true,
                },
              },
              sourceMap: true,
            }),
          ],
          splitChunks: {
            minSize: 30 * 1024,
            maxSize: 1024 * 1024,
            automaticNameDelimiter: '.',
            cacheGroups: {
              // Don't split css in vendor chunks by default due to potential ordering issues
              commons: {
                test: /[\\/]node_modules[\\/](.*)\.(?!(css|sass|scss|less)$)([^.]+$)/,
                name: 'vendor',
                chunks: 'all',
                priority: -5,
              },
            },
          },
        },
    node: {
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty',
    },
  });
};
