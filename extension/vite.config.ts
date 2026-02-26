import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      // manifest.json과 아이콘을 dist로 복사
      name: 'copy-manifest',
      closeBundle() {
        const files = ['manifest.json'];
        files.forEach((file) => {
          try {
            copyFileSync(resolve(__dirname, file), resolve(__dirname, 'dist', file));
          } catch {
            // 파일이 없으면 무시
          }
        });

        // 아이콘 폴더 복사
        const iconsDir = resolve(__dirname, 'public/icons');
        const distIconsDir = resolve(__dirname, 'dist/icons');
        if (existsSync(iconsDir)) {
          if (!existsSync(distIconsDir)) mkdirSync(distIconsDir, { recursive: true });
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/extractor.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background/service-worker.js';
          if (chunkInfo.name === 'content') return 'content/extractor.js';
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
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
