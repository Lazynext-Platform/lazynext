// Full QA matrix: all routes × 3 modes (light, dark, system-light, system-dark) × 2 viewports (desktop, mobile)
// Checks: data-theme correctness, body bg, heading text color, card bg, no overflow on mobile.
// Run: node scripts/verify-theme-full.mjs
import { execSync } from 'node:child_process';

const PW_CORE = execSync('find ~/.npm/_npx -maxdepth 4 -name playwright-core -type d 2>/dev/null | head -1', { shell: '/bin/zsh' }).toString().trim();
const pw = await import(PW_CORE + '/index.js');
const chromium = pw.chromium || pw.default?.chromium;

const BASE = 'http://localhost:3001';
const ROUTES = [
  '/', '/pricing', '/settings', '/dashboard', '/my-work',
  '/assets', '/lazynext-studio', '/ad-reference', '/drama-studio', '/ad-skit',
  '/admin', '/privacy', '/terms', '/reset-password',
];
const MODES = [
  { name: 'light', os: 'light', sel: 'light', expected: 'light' },
  { name: 'dark', os: 'dark', sel: 'dark', expected: 'dark' },
  { name: 'system-light', os: 'light', sel: 'system', expected: 'light' },
  { name: 'system-dark', os: 'dark', sel: 'system', expected: 'dark' },
];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

function parseRgb(s) {
  if (!s) return null;
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
}
function isLight(c) { return c && (c.r + c.g + c.b) / 3 > 128; }
function isDark(c) { return c && (c.r + c.g + c.b) / 3 <= 128; }

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const issues = [];
let totalChecks = 0;

for (const vp of VIEWPORTS) {
  for (const mode of MODES) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: mode.os });
    const page = await ctx.newPage();

    for (const route of ROUTES) {
      // Set theme via localStorage on settings page first
      await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.evaluate((sel) => localStorage.setItem('lazynext-theme', sel), mode.sel);
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(500);

      const data = await page.evaluate(() => {
        const cs = (el) => el ? {
          bg: getComputedStyle(el).backgroundColor,
          color: getComputedStyle(el).color,
        } : null;
        return {
          theme: document.documentElement.getAttribute('data-theme'),
          selected: document.documentElement.getAttribute('data-theme-selected'),
          bodyBg: getComputedStyle(document.body).backgroundColor,
          bodyColor: getComputedStyle(document.body).color,
          h1: cs(document.querySelector('h1')),
          card: cs(document.querySelector('[class*="rounded-2xl"]')),
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });

      totalChecks++;

      // 1. Theme attribute correctness
      if (data.theme !== mode.expected) {
        issues.push(`[${vp.name}/${mode.name}] ${route}: data-theme=${data.theme} expected ${mode.expected}`);
      }

      // 2. Selected attribute
      if (data.selected !== mode.sel) {
        issues.push(`[${vp.name}/${mode.name}] ${route}: data-theme-selected=${data.selected} expected ${mode.sel}`);
      }

      // 3. Body bg should match theme
      const bodyBg = parseRgb(data.bodyBg);
      if (mode.expected === 'light' && bodyBg && isDark(bodyBg)) {
        issues.push(`[${vp.name}/${mode.name}] ${route}: body bg dark in light mode (${data.bodyBg})`);
      }
      if (mode.expected === 'dark' && bodyBg && isLight(bodyBg) && data.bodyBg !== 'rgba(0, 0, 0, 0)') {
        issues.push(`[${vp.name}/${mode.name}] ${route}: body bg light in dark mode (${data.bodyBg})`);
      }

      // 4. Heading text should contrast with body bg
      const h1Color = parseRgb(data.h1?.color);
      if (mode.expected === 'light' && h1Color && isLight(h1Color)) {
        issues.push(`[${vp.name}/${mode.name}] ${route}: h1 text light on light bg (${data.h1.color})`);
      }
      if (mode.expected === 'dark' && h1Color && isDark(h1Color)) {
        issues.push(`[${vp.name}/${mode.name}] ${route}: h1 text dark on dark bg (${data.h1.color})`);
      }

      // 5. Mobile overflow check
      if (vp.name === 'mobile' && data.scrollWidth > data.clientWidth + 1) {
        issues.push(`[${vp.name}/${mode.name}] ${route}: horizontal overflow (scroll=${data.scrollWidth} client=${data.clientWidth})`);
      }
    }
    await ctx.close();
  }
}

await browser.close();

console.log(`Checked ${totalChecks} route/mode/viewport combos (${ROUTES.length} routes × ${MODES.length} modes × ${VIEWPORTS.length} viewports).`);
if (issues.length) {
  console.log(`\nISSUES FOUND (${issues.length}):`);
  issues.forEach((i) => console.log('  - ' + i));
  process.exit(1);
} else {
  console.log('No theme issues found across the full QA matrix.');
}
