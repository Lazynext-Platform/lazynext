// Programmatic visual QA: detect low-contrast / invisible text by sampling
// computed styles. Composites alpha backgrounds over the element's stacked
// parent backgrounds so translucent surfaces (bg-app/80, bg-white/5, etc.) are
// evaluated against their real painted color, not the raw rgba.
// Run: node scripts/verify-theme-contrast.mjs
import { execSync } from 'node:child_process';

const PW_CORE = execSync('find ~/.npm/_npx -maxdepth 4 -name playwright-core -type d 2>/dev/null | head -1', { shell: '/bin/zsh' }).toString().trim();
const pw = await import(PW_CORE + '/index.js');
const chromium = pw.chromium || pw.default?.chromium;

const BASE = 'http://localhost:3001';
const ROUTES = ['/', '/pricing', '/settings', '/dashboard', '/my-work', '/assets', '/lazynext-studio', '/ad-reference', '/drama-studio', '/ad-skit', '/privacy', '/terms'];
const MODES = [
  { name: 'light', os: 'light', sel: 'light' },
  { name: 'dark', os: 'dark', sel: 'dark' },
  { name: 'system-light', os: 'light', sel: 'system' },
  { name: 'system-dark', os: 'dark', sel: 'system' },
];

function parseColor(s) {
  if (!s) return null;
  // rgb(r, g, b) or rgba(r, g, b, a)
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  // hex
  const h = s.match(/#([0-9a-f]{6})/i);
  if (h) return { r: parseInt(h[1].slice(0,2),16), g: parseInt(h[1].slice(2,4),16), b: parseInt(h[1].slice(4,6),16), a: 1 };
  return null;
}
function composite(fg, bg) {
  // alpha-composite fg over bg (both {r,g,b,a})
  const a = fg.a;
  return { r: Math.round(fg.r * a + bg.r * (1 - a)), g: Math.round(fg.g * a + bg.g * (1 - a)), b: Math.round(fg.b * a + bg.b * (1 - a)), a: 1 };
}
function lum(c) { if (!c) return 0; const f=(x)=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);}; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); }
function contrast(fg, bg) { const L1=lum(fg),L2=lum(bg);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05); }

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const issues = [];

for (const mode of MODES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: mode.os });
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate((sel) => { try { localStorage.setItem('lazynext-theme', sel); } catch {} }, mode.sel);
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(500);

    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const expected = mode.sel === 'system' ? mode.os : mode.sel;
    if (themeAttr !== expected) issues.push(`${mode.name} ${route}: data-theme=${themeAttr} expected ${expected}`);

    // Collect each text element's color + the composited background of its ancestor stack.
    const samples = await page.evaluate(() => {
      const out = [];
      const els = document.querySelectorAll('h1, h2, h3, p, span, a, button, label, td, li, div');
      let n = 0;
      for (const el of els) {
        if (n++ > 60) break;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const text = (el.textContent || '').trim();
        if (!text || text.length > 40) continue;
        // Walk up collecting bg layers until opaque or body.
        const layers = [];
        let node = el;
        while (node && node !== document.documentElement) {
          const bg = getComputedStyle(node).backgroundColor;
          layers.push(bg);
          const parsed = bg.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*([\d.]+)\s*)?\)/);
          const a = parsed && parsed[1] !== undefined ? +parsed[1] : 1;
          if (a === 1) break;
          node = node.parentElement;
        }
        // body bg as the base
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        out.push({ text: text.slice(0, 30), tag: el.tagName, color: cs.color, layers, bodyBg });
      }
      return out;
    });

    let lowContrast = 0;
    for (const s of samples) {
      // s.layers is element-first, ancestor-last. Reverse so we composite
      // from the deepest ancestor (closest to body) up to the element.
      let bg = parseColor(s.bodyBg) || { r: 19, g: 20, b: 22, a: 1 };
      const ordered = [...s.layers].reverse(); // deepest-first, element-last
      for (const l of ordered) {
        const c = parseColor(l);
        if (!c) continue;
        if (c.a === 1) bg = c;
        else bg = composite(c, bg);
      }
      const fg = parseColor(s.color);
      if (!fg) continue;
      const c = contrast(fg, bg);
      if (c < 2.0) lowContrast++;
    }
    if (lowContrast > 5) issues.push(`${mode.name} ${route}: ${lowContrast}/${samples.length} text samples below 2:1 contrast`);
  }
  await ctx.close();
}
await browser.close();

if (issues.length) {
  console.log('ISSUES FOUND:');
  issues.forEach((i) => console.log('  - ' + i));
  process.exit(1);
} else {
  console.log('No theme-attribute or low-contrast issues across ' + (MODES.length * ROUTES.length) + ' route/mode combos.');
}
