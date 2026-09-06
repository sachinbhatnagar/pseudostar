import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/worker/**/*.test.ts', 'tests/emails/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
  esbuild: { jsx: 'automatic' },
});
