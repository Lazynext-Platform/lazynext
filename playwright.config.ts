import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration.
 * Tests run against the local dev server (port 3100) with mock Atlas (port 3099).
 * Run with: npx playwright test
 *
 * Authenticated projects use a storageState saved by global-setup.ts, which
 * logs in the test account (test@lazynext.local) via the NextAuth credentials
 * API before any tests run. Unauthenticated projects run without a session.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    locale: 'en-US',
  },
  projects: [
    // Unauthenticated projects — for smoke tests and auth-prompt verification
    {
      name: 'chromium',
      testIgnore: ['**/auth-*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      testIgnore: ['**/auth-*.spec.ts'],
      use: { ...devices['Pixel 5'] },
    },
    // Authenticated projects — use saved storage state from global-setup
    {
      name: 'chromium-auth',
      testMatch: ['**/auth-*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_NO_RATE_LIMIT: '1',
    },
  },
});
