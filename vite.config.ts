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
          // REN-09: Combat und Missions als eigene Chunks — werden erst im Modus geladen
          if (id.includes('src/combat/')) return 'combat';
          if (id.includes('src/missions/')) return 'missions';
        },
      },
    },
    // REN-09: Warnschwelle auf Vite-Default zurücksetzen
    chunkSizeWarningLimit: 500,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.ts'],
    // QA-02: Coverage Gate — auf Kernmodule beschränkt, nicht auf Geometriecode
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 40,
        functions: 30,
        branches: 30,
      },
      include: ['src/physics/**', 'src/missions/**', 'src/input/**', 'src/core/**'],
      exclude: ['src/ui/**', 'src/environment/**', 'src/aircraft/**', 'src/rendering/**', 'src/weather/**', 'src/combat/**', 'src/camera/**', 'src/game/**'],
    },
  },
});