import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanMarkup } from './design-rules';

// ── Positive cases (slop present) ──

test('scanMarkup detects indigo→violet gradient', () => {
  const r = scanMarkup('<div class="bg-gradient-to-r from-indigo-500 to-purple-500">');
  assert.ok(r.hits.some(h => h.id === '01'));
});

test('scanMarkup detects gradient headline text', () => {
  const r = scanMarkup('<h1 class="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">');
  assert.ok(r.hits.some(h => h.id === '02'));
});

test('scanMarkup detects warm cozy palette', () => {
  const r = scanMarkup('<div class="bg-amber-50 text-amber-900">');
  assert.ok(r.hits.some(h => h.id === '03'));
});

test('scanMarkup detects default semantic palette', () => {
  const r = scanMarkup('<span class="bg-blue-50 text-blue-700">Info</span>');
  assert.ok(r.hits.some(h => h.id === '04'));
});

test('scanMarkup detects one-hue status box', () => {
  const r = scanMarkup('<div class="border-red-500 bg-red-500/10 text-red-500 rounded p-3">');
  assert.ok(r.hits.some(h => h.id === '05'));
});

test('scanMarkup detects atmospheric gradient', () => {
  const r = scanMarkup('<body class="bg-[radial-gradient(circle_at_top,#1e293b,#020617)]">');
  assert.ok(r.hits.some(h => h.id === '06'));
});

test('scanMarkup detects serif-italic emphasis', () => {
  const r = scanMarkup('<em class="font-serif italic">actually</em>');
  assert.ok(r.hits.some(h => h.id === '07'));
});

test('scanMarkup detects kicker above heading', () => {
  const r = scanMarkup('<p class="text-xs uppercase tracking-widest text-indigo-500">Features</p>');
  assert.ok(r.hits.some(h => h.id === '10'));
});

test('scanMarkup detects full-sentence display headline', () => {
  const r = scanMarkup('<h1 class="text-7xl font-extrabold tracking-tight">');
  assert.ok(r.hits.some(h => h.id === '11'));
});

test('scanMarkup detects AI copywriting voice', () => {
  const r = scanMarkup('<p>Say goodbye to friction. Supercharge your workflow.</p>');
  assert.ok(r.hits.some(h => h.id === '14'));
});

test('scanMarkup detects emoji in markup', () => {
  const r = scanMarkup('<h2>🚀 Why you\'ll love it</h2>');
  assert.ok(r.hits.some(h => h.id === '15'));
});

test('scanMarkup detects glowing status dot', () => {
  const r = scanMarkup('<span class="animate-ping rounded-full bg-green-400"></span>');
  assert.ok(r.hits.some(h => h.id === '16'));
});

test('scanMarkup detects colored left border callout', () => {
  const r = scanMarkup('<div class="border-l-4 border-indigo-500 rounded-lg bg-indigo-50 p-4">');
  assert.ok(r.hits.some(h => h.id === '17'));
});

test('scanMarkup detects glassmorphism', () => {
  const r = scanMarkup('<div class="rounded-full backdrop-blur bg-white/10 border border-white/20">');
  assert.ok(r.hits.some(h => h.id === '19'));
});

test('scanMarkup detects oversized drop shadow', () => {
  const r = scanMarkup('<div class="shadow-2xl">');
  assert.ok(r.hits.some(h => h.id === '20'));
});

test('scanMarkup detects badge spam', () => {
  const r = scanMarkup('<Pill>✨ New</Pill><Badge>🔥 Popular</Badge>');
  assert.ok(r.hits.some(h => h.id === '23'));
});

test('scanMarkup detects default Inter font', () => {
  const r = scanMarkup('font-family: Inter, sans-serif;');
  assert.ok(r.hits.some(h => h.id === '32'));
});

// ── Negative cases (clean markup) ──

test('scanMarkup returns zero hits on clean markup', () => {
  const clean = '<div class="bg-white border border-gray-200 rounded-lg p-4"><h2 class="text-lg font-semibold">Title</h2><p class="text-sm text-gray-600">Body text.</p></div>';
  const r = scanMarkup(clean);
  assert.equal(r.totalHits, 0, `expected 0 hits, got ${r.totalHits}: ${JSON.stringify(r.hits)}`);
});

// ── Report structure ──

test('scanMarkup report has byTell aggregation', () => {
  const r = scanMarkup('<div class="bg-amber-50"><div class="bg-blue-50">');
  assert.ok(typeof r.byTell === 'object');
  assert.ok(Object.keys(r.byTell).length > 0);
});

test('scanMarkup report has byTier counts', () => {
  const r = scanMarkup('<div class="bg-amber-50"><div class="font-family: Inter">');
  assert.ok(r.byTier.classic >= 1);
  assert.ok(r.byTier.evolved >= 1);
});

test('scanMarkup hits have line numbers', () => {
  const src = '<div class="clean"></div>\n<div class="bg-amber-50">slop</div>';
  const r = scanMarkup(src);
  assert.ok(r.hits.length > 0);
  assert.equal(r.hits[0].line, 2);
});

test('scanMarkup hits have fix suggestions', () => {
  const r = scanMarkup('<div class="bg-amber-50">');
  assert.ok(r.hits.length > 0);
  assert.ok(r.hits.every(h => h.fix.length > 0));
});

test('scanMarkup uses source label', () => {
  const r = scanMarkup('<div class="bg-amber-50">', 'Hero.tsx');
  assert.ok(r.hits.length > 0);
  assert.equal(r.hits[0].source, 'Hero.tsx');
});
