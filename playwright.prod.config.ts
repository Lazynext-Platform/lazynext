import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for production smoke tests.
 * Run with: npx playwright test --config=playwright.prod.config.ts
 *
 * This runs unauthenticated smoke tests against the production site.
 * It does NOT start a local server or run authenticated tests.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/prod-*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'https://lazynext.com',
    trace: 'on-first-retry',
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium-prod',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — testing against already-deployed production
});
