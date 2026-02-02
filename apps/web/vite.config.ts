/// <reference types="vitest/config" />
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  optimizeDeps: {
    // Exclude workspace packages from pre-bundling to always use fresh source
    exclude: ['@licensebox/shared', '@licensebox/database'],
  },
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['**/*.unit.test.ts'],
        },
      },
      {
        plugins: [tailwindcss()],
        test: {
          globals: true,
          name: 'browser',
          browser: {
            enabled: true,
            provider: playwright(),
            // https://vitest.dev/config/browser/playwright
            instances: [{ browser: 'chromium', setupFiles: ['./vitest.browser.setup.ts'] }],
            headless: false,
          },
          include: ['**/*.browser.test.tsx'],
        },
      },
    ],
  },
});
