/**
 * Playwright global setup — authenticates the test account and saves the
 * browser storage state (cookies + localStorage) so authenticated E2E
 * projects can reuse the session without re-logging-in per test.
 *
 * The test account (test@lazynext.local / Test1234!) is seeded by the
 * local dev database and has 150 credits + admin access.
 */
import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3100';
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });

  try {
    // 1. Fetch CSRF token from NextAuth
    const csrfRes = await context.request.get('/api/auth/csrf');
    if (!csrfRes.ok()) {
      throw new Error(`global-setup: failed to fetch CSRF token (HTTP ${csrfRes.status()})`);
    }
    const { csrfToken } = await csrfRes.json() as { csrfToken: string };

    // 2. POST credentials to NextAuth callback — this sets the session-token cookie
    const loginRes = await context.request.post('/api/auth/callback/credentials', {
      form: {
        email: 'test@lazynext.local',
        password: 'Test1234!',
        csrfToken,
        callbackUrl: baseURL,
        json: 'true',
      },
    });

    // NextAuth returns 200 with a redirect URL on success, or 401 on failure
    if (loginRes.status() === 401) {
      throw new Error('global-setup: credentials rejected — is the test account seeded?');
    }

    // 3. Verify the session is active by hitting the session endpoint
    const sessionRes = await context.request.get('/api/auth/session');
    const session = await sessionRes.json() as { user?: { email?: string } };
    if (!session?.user?.email) {
      throw new Error('global-setup: session not established after login');
    }

    // 4. Save storage state for authenticated projects
    await context.storageState({ path: 'e2e/.auth/user.json' });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
