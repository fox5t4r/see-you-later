import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';

function copyAssetsPlugin() {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(__dirname, 'dist', 'manifest.json'),
      );

      const iconsDir = resolve(__dirname, 'public/icons');
      const distIconsDir = resolve(__dirname, 'dist/icons');
      if (existsSync(iconsDir)) {
        if (!existsSync(distIconsDir)) mkdirSync(distIconsDir, { recursive: true });
        for (const file of readdirSync(iconsDir)) {
          copyFileSync(resolve(iconsDir, file), resolve(distIconsDir, file));
        }
      }
    },
  };
}

const isContentScript = process.env.BUILD_TARGET === 'content';

export default defineConfig(
  isContentScript
    ? {
        plugins: [],
        build: {
          outDir: 'dist',
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/content/extractor.ts'),
            name: 'ContentScript',
            formats: ['iife'],
            fileName: () => 'content/extractor.js',
          },
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
            },
          },
        },
        resolve: {
          alias: { '@': resolve(__dirname, 'src') },
        },
      }
    : {
        plugins: [react(), copyAssetsPlugin()],
        build: {
          outDir: 'dist',
          emptyOutDir: true,
          rollupOptions: {
            input: {
              sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
              popup: resolve(__dirname, 'src/popup/index.html'),
              background: resolve(__dirname, 'src/background/service-worker.ts'),
            },
            output: {
              entryFileNames: (chunkInfo) => {
                if (chunkInfo.name === 'background') return 'background/service-worker.js';
                if (chunkInfo.name === 'sidepanel') return 'sidepanel/sidepanel.js';
                if (chunkInfo.name === 'popup') return 'popup/popup.js';
                return '[name]/[name].js';
              },
              chunkFileNames: 'chunks/[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash][extname]',
            },
          },
        },
        resolve: {
          alias: { '@': resolve(__dirname, 'src') },
        },
      },
);
