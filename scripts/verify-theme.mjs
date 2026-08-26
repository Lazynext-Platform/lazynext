// Standalone Playwright verification of the Lazynext theme system.
// Uses playwright-core (cached by the MCP server) + system Google Chrome.
// Run: node scripts/verify-theme.mjs
import { execSync } from 'node:child_process';

// Resolve playwright-core from the npx cache (MCP installs it there).
const PW_CORE = execSync('find ~/.npm/_npx -maxdepth 4 -name playwright-core -type d 2>/dev/null | head -1', { shell: '/bin/zsh' }).toString().trim();
if (!PW_CORE) { console.error('playwright-core not found'); process.exit(2); }
const pw = await import(PW_CORE + '/index.js');
const chromium = (pw.chromium || pw.default?.chromium);

const BASE = 'http://localhost:3001';
const RESULTS = [];
function log(ok, msg) { RESULTS.push({ ok, msg }); console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); }

const b2 = await chromium.launch({ headless: true, channel: 'chrome' });
const c2 = await b2.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
const p2 = await c2.newPage();
await p2.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
let s = await p2.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), selected: document.documentElement.getAttribute('data-theme-selected'), stored: localStorage.getItem('lazynext-theme'), bg: getComputedStyle(document.body).backgroundColor }));
log(s.selected === 'system' && s.theme === 'light' && s.stored === null, `default=system, OS light -> resolved light (selected=${s.selected}, theme=${s.theme}, stored=${s.stored})`);
log(s.bg.includes('247') || s.bg.includes('248'), `light bg=${s.bg}`);

// 2. Select Dark explicitly -> persists, ignores OS
await p2.getByRole('radio', { name: 'Dark' }).click();
await p2.waitForTimeout(200);
s = await p2.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), selected: document.documentElement.getAttribute('data-theme-selected'), stored: localStorage.getItem('lazynext-theme'), bg: getComputedStyle(document.body).backgroundColor }));
log(s.selected === 'dark' && s.theme === 'dark' && s.stored === 'dark', `select Dark persists (selected=${s.selected}, theme=${s.theme}, stored=${s.stored})`);
log(s.bg.includes('19') && s.bg.includes('20'), `dark bg=${s.bg}`);

// 3. Dark persists across navigation to home
await p2.goto(`${BASE}/`, { waitUntil: 'networkidle' });
s = await p2.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), stored: localStorage.getItem('lazynext-theme') }));
log(s.theme === 'dark' && s.stored === 'dark', `Dark persists across nav to home (theme=${s.theme})`);

// 4. Select System -> follows OS (light)
await p2.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
await p2.getByRole('radio', { name: 'System' }).click();
await p2.waitForTimeout(200);
s = await p2.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), selected: document.documentElement.getAttribute('data-theme-selected'), bg: getComputedStyle(document.body).backgroundColor }));
log(s.selected === 'system' && s.theme === 'light', `System + OS light -> light (selected=${s.selected}, theme=${s.theme})`);

// 5. Emulate OS dark while System selected -> live switch to dark WITHOUT reload
await p2.emulateMedia({ colorScheme: 'dark' });
await p2.waitForTimeout(300);
s = await p2.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor }));
log(s.theme === 'dark', `System live-switch to dark without reload (theme=${s.theme})`);

// 6. Emulate OS light again -> live switch back to light
await p2.emulateMedia({ colorScheme: 'light' });
await p2.waitForTimeout(300);
s = await p2.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme') }));
log(s.theme === 'light', `System live-switch back to light (theme=${s.theme})`);

// 7. Manual Light override ignores OS dark
await p2.getByRole('radio', { name: 'Light' }).click();
await p2.waitForTimeout(200);
await p2.emulateMedia({ colorScheme: 'dark' });
await p2.waitForTimeout(300);
s = await p2.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), selected: document.documentElement.getAttribute('data-theme-selected') }));
log(s.selected === 'light' && s.theme === 'light', `Manual Light ignores OS dark (selected=${s.selected}, theme=${s.theme})`);

// 8. Manual Dark override ignores OS light
await p2.getByRole('radio', { name: 'Dark' }).click();
await p2.waitForTimeout(200);
await p2.emulateMedia({ colorScheme: 'light' });
await p2.waitForTimeout(300);
s = await p2.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), selected: document.documentElement.getAttribute('data-theme-selected') }));
log(s.selected === 'dark' && s.theme === 'dark', `Manual Dark ignores OS light (selected=${s.selected}, theme=${s.theme})`);

// 9. Invalid localStorage falls back to system
await p2.evaluate(() => localStorage.setItem('lazynext-theme', 'purple'));
await p2.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
await p2.waitForTimeout(300);
s = await p2.evaluate(() => ({ selected: document.documentElement.getAttribute('data-theme-selected'), theme: document.documentElement.getAttribute('data-theme') }));
log(s.selected === 'system', `invalid localStorage falls back to system (selected=${s.selected})`);

// 10. No hydration errors on a fresh load
const errors = [];
p2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p2.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await p2.waitForTimeout(500);
const hydrationErrors = errors.filter((e) => e.includes('hydrat'));
log(hydrationErrors.length === 0, `no hydration errors (found ${hydrationErrors.length})`);

// 11. Check console errors across key routes
const routes = ['/pricing', '/dashboard', '/my-work', '/assets', '/lazynext-studio', '/ad-reference', '/drama-studio', '/ad-skit', '/privacy', '/terms'];
let routeErrors = 0;
for (const r of routes) {
  const errs = [];
  const p3 = await c2.newPage();
  p3.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p3.on('pageerror', (e) => errs.push(String(e)));
  await p3.goto(`${BASE}${r}`, { waitUntil: 'networkidle' }).catch(() => {});
  await p3.waitForTimeout(400);
  const hyd = errs.filter((e) => e.includes('hydrat'));
  if (hyd.length) { routeErrors += hyd.length; console.log(`  ${r}: ${hyd.length} hydration errors`); }
  await p3.close();
}
log(routeErrors === 0, `no hydration errors across ${routes.length} routes (found ${routeErrors})`);

await b2.close();

const failed = RESULTS.filter((r) => !r.ok);
console.log(`\n${RESULTS.length - failed.length}/${RESULTS.length} checks passed`);
if (failed.length) { console.log('FAILURES:'); failed.forEach((f) => console.log(`  - ${f.msg}`)); process.exit(1); }
