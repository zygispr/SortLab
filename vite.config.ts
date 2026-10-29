import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    // Vitest blanks every stylesheet import, `?raw` included; let `?raw` through so
    // tests/unit/styleRules.test.ts can read stylesheet sources. Plain and module imports
    // are still blanked (feature 003, research R6).
    css: { include: [/[?&]raw(&|$)/] },
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.tsx'],
    benchmark: {
      include: ['tests/perf/**/*.bench.ts'],
    },
  },
});
