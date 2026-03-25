import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'pnpm --filter @blue-escrow/web dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
