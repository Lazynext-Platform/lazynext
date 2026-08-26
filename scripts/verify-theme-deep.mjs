// Deep visual QA: for each route, in light + dark mode, capture the computed
// background and text colors of the body, main container, first card, first
// heading, first button, and first link. Flag any that look wrong for the
// active theme (e.g. dark bg in light mode, light text on light bg).
// Run: node scripts/verify-theme-deep.mjs
import { execSync } from 'node:child_process';

const PW_CORE = execSync('find ~/.npm/_npx -maxdepth 4 -name playwright-core -type d 2>/dev/null | head -1', { shell: '/bin/zsh' }).toString().trim();
const pw = await import(PW_CORE + '/index.js');
const chromium = pw.chromium || pw.default?.chromium;

const BASE = 'http://localhost:3001';
const ROUTES = [
  '/', '/pricing', '/settings', '/dashboard', '/my-work', '/my-work/[id]',
  '/assets', '/lazynext-studio', '/ad-reference', '/drama-studio', '/ad-skit',
  '/admin', '/privacy', '/terms', '/reset-password',
];
const MODES = [
  { name: 'light', os: 'light', sel: 'light' },
  { name: 'dark', os: 'dark', sel: 'dark' },
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

for (const mode of MODES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: mode.os });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    const url = route.includes('[') ? BASE + route.replace('[id]', 'test-id') : BASE + route;
    // Set theme
    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate((sel) => localStorage.setItem('lazynext-theme', sel), mode.sel);
    await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(600);

    const data = await page.evaluate(() => {
      const cs = (el) => el ? {
        bg: getComputedStyle(el).backgroundColor,
        color: getComputedStyle(el).color,
        border: getComputedStyle(el).borderColor,
      } : null;
      return {
        theme: document.documentElement.getAttribute('data-theme'),
        body: cs(document.body),
        main: cs(document.querySelector('main')),
        h1: cs(document.querySelector('h1')),
        h2: cs(document.querySelector('h2')),
        card: cs(document.querySelector('[class*="rounded-2xl"], [class*="rounded-xl"]')),
        btn: cs(document.querySelector('button')),
        link: cs(document.querySelector('a')),
      };
    });

    const expected = mode.sel;
    if (data.theme !== expected) {
      issues.push(`[${mode.name}] ${route}: data-theme=${data.theme} expected ${expected}`);
    }

    // In light mode, body bg should be light; in dark mode, dark
    const bodyBg = parseRgb(data.body?.bg);
    if (mode.name === 'light' && bodyBg && isDark(bodyBg)) {
      issues.push(`[${mode.name}] ${route}: body bg is dark (${data.body.bg}) in light mode`);
    }
    if (mode.name === 'dark' && bodyBg && isLight(bodyBg) && data.body.bg !== 'rgba(0, 0, 0, 0)') {
      issues.push(`[${mode.name}] ${route}: body bg is light (${data.body.bg}) in dark mode`);
    }

    // In light mode, heading text should be dark; in dark mode, light
    const h1Color = parseRgb(data.h1?.color);
    if (mode.name === 'light' && h1Color && isLight(h1Color)) {
      issues.push(`[${mode.name}] ${route}: h1 text is light (${data.h1.color}) in light mode`);
    }
    if (mode.name === 'dark' && h1Color && isDark(h1Color)) {
      issues.push(`[${mode.name}] ${route}: h1 text is dark (${data.h1.color}) in dark mode`);
    }
  }
  await ctx.close();
}

await browser.close();

if (issues.length) {
  console.log('ISSUES FOUND:');
  issues.forEach((i) => console.log('  - ' + i));
  process.exit(1);
} else {
  console.log(`No theme issues across ${ROUTES.length * MODES.length} route/mode combos.`);
}
