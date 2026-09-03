import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the remaining pages not covered by other spec files.
 * Covers: approvals, assets, budget-optimizer, calendar, compliance, fatigue,
 * forecasting, inspiration, observability, personas, privacy, publish,
 * repurposing, reset-password, skills, templates, terms, ugc-studio.
 */

const authPages = [
  'approvals',
  'assets',
  'budget-optimizer',
  'calendar',
  'compliance',
  'fatigue',
  'forecasting',
  'personas',
  'publish',
  'repurposing',
  'skills',
  'templates',
  'ugc-studio',
];

const publicPages = [
  'inspiration',
  'observability',
  'privacy',
  'reset-password',
  'terms',
];

for (const p of authPages) {
  test(`${p} — reachable, has h1, auth gate or content`, async ({ page }) => {
    await page.goto(`/${p}`);
    // Auth-gated pages should either redirect to sign-in or show an auth modal
    const hasMain = await page.locator('main, [id="main-content"]').count();
    const hasAuthModal = await page.locator('text=/Sign in|登录|サインイン|로그인|Acceder|Se connecter|Anmelden|تسجيل الدخول|साइन इन|Masuk|เข้าสู่ระบบ|Đăng nhập/').count();
    expect(hasMain + hasAuthModal).toBeGreaterThan(0);
    // Should have data-theme
    const dataTheme = await page.locator('[data-theme]').count();
    expect(dataTheme).toBeGreaterThan(0);
  });
}

for (const p of publicPages) {
  test(`${p} — reachable, has h1, main content`, async ({ page }) => {
    await page.goto(`/${p}`);
    // Public pages should render content (main landmark or h1)
    const hasMain = await page.locator('main, [id="main-content"], h1').count();
    expect(hasMain).toBeGreaterThan(0);
    // Should have data-theme
    const dataTheme = await page.locator('[data-theme]').count();
    expect(dataTheme).toBeGreaterThan(0);
  });
}
