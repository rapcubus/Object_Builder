import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // itch.io 배포를 위해 상대 경로 설정
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }
        }
      }
    }
  }
});
