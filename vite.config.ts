import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Object_Builder/', // GitHub Pages 배포를 위해 저장소 이름 설정
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
