/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv, type PluginOption } from 'vite';

import { sitemapPlugin } from './build/sitemapPlugin';
import { spaFallbackPlugin } from './build/spaFallbackPlugin';

/**
 * Where the app is mounted.
 *
 * GitHub Pages serves this as a project page — the repository is not named
 * after its owner — so the app lives under a sub-path. Everything that builds
 * a URL reads this one value: the router basename, the sitemap, and every
 * asset reference Vite rewrites. Moving to a custom domain, or to the
 * organisation's root, is a one-line change here.
 */
const DEFAULT_BASE_PATH = '/nexus/';

/** Where the built site is reachable. Only used to write absolute SEO URLs. */
const DEFAULT_SITE_URL = 'https://trinity-flux.github.io';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = env['VITE_BASE_PATH'] ?? DEFAULT_BASE_PATH;
  const siteUrl = env['VITE_SITE_URL'] ?? DEFAULT_SITE_URL;

  const plugins: PluginOption[] = [
    react(),
    tailwindcss(),
    // Both only run on build, so `vite dev` is unaffected.
    sitemapPlugin({ siteUrl, basePath: base }),
    spaFallbackPlugin(),
  ];

  if (process.env['ANALYZE'] === 'true') {
    plugins.push(
      visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true }) as PluginOption,
    );
  }

  return {
    base,
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      target: 'es2023',
      sourcemap: true,
      // A stricter budget than the 500 kB default: this is a content site, and
      // a chunk over 300 kB on a mid-range phone is a second of parse time.
      chunkSizeWarningLimit: 300,
      rollupOptions: {
        output: {
          // Vite 8 bundles with Rolldown, where the object form of
          // `manualChunks` no longer exists. `advancedChunks` is the native
          // replacement and matches on resolved module id.
          //
          // Splitting these three out means a release that only touches app
          // code leaves the vendor chunks byte-identical, so returning
          // visitors re-download the app chunk and nothing else.
          advancedChunks: {
            groups: [
              {
                name: 'vendor-react',
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
              },
              {
                name: 'vendor-state',
                test: /[\\/]node_modules[\\/](@reduxjs|react-redux|redux|redux-observable|rxjs|immer|reselect)[\\/]/,
              },
              {
                name: 'vendor-supabase',
                test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['@trinity-nexus/ui/testing/setup'],
      css: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        // Domain and application layers hold the rules worth protecting; the
        // presentation layer is covered by behavioural tests, not line counts.
        include: ['src/features/**/domain/**', 'src/features/**/application/**', 'src/shared/**'],
        thresholds: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },
  };
});
