import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('src/physics/')) return 'physics';
          if (id.includes('src/ui/')) return 'ui';
          if (id.includes('src/environment/')) return 'environment';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.ts'],
  },
});