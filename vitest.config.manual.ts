import { defineConfig } from 'vitest/config';

// Opt-in spec that calls the real Paystack API. Never run in CI by default.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/paystack-live.manual.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
