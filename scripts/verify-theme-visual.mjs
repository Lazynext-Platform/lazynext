// Visual QA: capture screenshots of key routes in Light / Dark / System-Light / System-Dark
// across desktop + mobile viewports. Run: node scripts/verify-theme-visual.mjs
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PW_CORE = execSync('find ~/.npm/_npx -maxdepth 4 -name playwright-core -type d 2>/dev/null | head -1', { shell: '/bin/zsh' }).toString().trim();
const pw = await import(PW_CORE + '/index.js');
const chromium = pw.chromium || pw.default?.chromium;

const BASE = 'http://localhost:3001';
const OUT = '.playwright-mcp/theme-qa';
mkdirSync(OUT, { recursive: true });

const ROUTES = ['/', '/pricing', '/settings', '/dashboard', '/my-work', '/assets', '/lazynext-studio', '/ad-reference', '/drama-studio', '/ad-skit', '/privacy', '/terms'];
const MODES = [
  { name: 'light', os: 'light', sel: 'light' },
  { name: 'dark', os: 'dark', sel: 'dark' },
  { name: 'system-light', os: 'light', sel: 'system' },
  { name: 'system-dark', os: 'dark', sel: 'system' },
];
const VIEWPORTS = [
  { w: 1280, h: 800, tag: 'desktop' },
  { w: 390, h: 844, tag: 'mobile' },
];

const browser = await chromium.launch({ headless: true, channel: 'chrome' });

for (const mode of MODES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, colorScheme: mode.os });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      // Set persisted selection so the inline bootstrap script applies it.
      await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.evaluate((sel) => { try { localStorage.setItem('lazynext-theme', sel); } catch {} }, mode.sel);
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(600);
      const safe = route.replace(/\//g, '_') || '_home';
      const file = `${OUT}/${mode.name}_${vp.tag}${safe}.png`;
      await page.screenshot({ path: file, fullPage: false }).catch(() => {});
    }
    await ctx.close();
  }
}
await browser.close();
console.log('Screenshots written to', OUT);
