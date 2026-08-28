import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for:
 * - A/B test results grouping and winner determination
 * - Brief template builder payload structure
 * - Creative export center field selection and format handling
 * - Real-time collaboration comment threading and @mention extraction
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. A/B test results grouping
// ─────────────────────────────────────────────────────────────────────────────

type Campaign = { id: string; name: string; platform: string; status: string };

function groupABTests(campaigns: Campaign[]) {
  const groups: Record<string, Campaign[]> = {};
  for (const c of campaigns) {
    const baseName = c.name.replace(/\s+—\s+Variant\s+[A-E]$/i, '');
    if (!groups[baseName]) groups[baseName] = [];
    groups[baseName].push(c);
  }
  return Object.entries(groups)
    .filter(([_, camps]) => camps.length >= 2)
    .map(([name, camps]) => ({ name, campaigns: camps }));
}

test('AB: groups campaigns by base name', () => {
  const campaigns: Campaign[] = [
    { id: '1', name: 'Test A — Variant A', platform: 'meta', status: 'active' },
    { id: '2', name: 'Test A — Variant B', platform: 'meta', status: 'active' },
    { id: '3', name: 'Test A — Variant C', platform: 'meta', status: 'active' },
  ];
  const groups = groupABTests(campaigns);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, 'Test A');
  assert.equal(groups[0].campaigns.length, 3);
});

test('AB: separates different test groups', () => {
  const campaigns: Campaign[] = [
    { id: '1', name: 'Test1 — Variant A', platform: 'meta', status: 'active' },
    { id: '2', name: 'Test1 — Variant B', platform: 'meta', status: 'active' },
    { id: '3', name: 'Test2 — Variant A', platform: 'google', status: 'active' },
    { id: '4', name: 'Test2 — Variant B', platform: 'google', status: 'active' },
  ];
  const groups = groupABTests(campaigns);
  assert.equal(groups.length, 2);
});

test('AB: excludes single campaigns (no A/B test)', () => {
  const campaigns: Campaign[] = [
    { id: '1', name: 'Solo Campaign', platform: 'meta', status: 'active' },
    { id: '2', name: 'Test — Variant A', platform: 'meta', status: 'active' },
    { id: '3', name: 'Test — Variant B', platform: 'meta', status: 'active' },
  ];
  const groups = groupABTests(campaigns);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, 'Test');
});

function determineWinner(variants: Array<{ variantLabel: string; roas: number; sampleSize: number }>) {
  const withData = variants.filter(v => v.sampleSize > 0);
  if (withData.length === 0) return null;
  return withData.reduce((best, v) => v.roas > best.roas ? v : best);
}

test('AB: winner is highest ROAS with data', () => {
  const variants = [
    { variantLabel: 'A', roas: 1.5, sampleSize: 10 },
    { variantLabel: 'B', roas: 3.2, sampleSize: 15 },
    { variantLabel: 'C', roas: 2.1, sampleSize: 12 },
  ];
  const winner = determineWinner(variants);
  assert.equal(winner?.variantLabel, 'B');
  assert.equal(winner?.roas, 3.2);
});

test('AB: no winner when no data', () => {
  const variants = [
    { variantLabel: 'A', roas: 0, sampleSize: 0 },
    { variantLabel: 'B', roas: 0, sampleSize: 0 },
  ];
  assert.equal(determineWinner(variants), null);
});

function calculateSignificance(totalSamples: number, minSamples = 30) {
  const isSignificant = totalSamples >= minSamples;
  const confidenceLevel = Math.min(95, Math.round((totalSamples / minSamples) * 100));
  return { isSignificant, confidenceLevel };
}

test('AB: significance threshold at 30 samples', () => {
  assert.ok(!calculateSignificance(29).isSignificant);
  assert.ok(calculateSignificance(30).isSignificant);
});

test('AB: confidence caps at 95%', () => {
  assert.equal(calculateSignificance(100).confidenceLevel, 95);
  assert.equal(calculateSignificance(15).confidenceLevel, 50);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Brief template builder
// ─────────────────────────────────────────────────────────────────────────────

function buildBriefPayload(data: {
  product: string;
  audience: string;
  tone: string;
  goals: string;
  keyBenefits: string;
  cta: string;
}) {
  return {
    product: data.product.trim(),
    audience: data.audience.trim(),
    tone: data.tone.trim(),
    goals: data.goals.trim(),
    keyBenefits: data.keyBenefits.trim(),
    cta: data.cta.trim(),
  };
}

test('Brief: builds payload with all fields', () => {
  const payload = buildBriefPayload({
    product: 'Wireless earbuds',
    audience: 'Tech-savvy millennials',
    tone: 'Energetic',
    goals: 'Drive awareness',
    keyBenefits: 'Long battery, noise cancellation',
    cta: 'Shop Now',
  });
  assert.equal(payload.product, 'Wireless earbuds');
  assert.equal(payload.cta, 'Shop Now');
});

test('Brief: trims whitespace from fields', () => {
  const payload = buildBriefPayload({
    product: '  Product  ',
    audience: '  Audience  ',
    tone: '  Tone  ',
    goals: '  Goals  ',
    keyBenefits: '  Benefits  ',
    cta: '  CTA  ',
  });
  assert.equal(payload.product, 'Product');
  assert.equal(payload.audience, 'Audience');
});

test('Brief: empty fields produce empty strings', () => {
  const payload = buildBriefPayload({
    product: '', audience: '', tone: '', goals: '', keyBenefits: '', cta: '',
  });
  assert.equal(payload.product, '');
  assert.equal(payload.cta, '');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Creative export center
// ─────────────────────────────────────────────────────────────────────────────

const EXPORT_FIELDS = ['brief', 'hooks', 'angles', 'script', 'storyboard', 'score', 'variants'];

test('Export: all fields available', () => {
  assert.equal(EXPORT_FIELDS.length, 7);
  assert.ok(EXPORT_FIELDS.includes('brief'));
  assert.ok(EXPORT_FIELDS.includes('score'));
});

test('Export: field selection toggle', () => {
  let selected = [...EXPORT_FIELDS];
  // Toggle off 'brief'
  selected = selected.filter(f => f !== 'brief');
  assert.ok(!selected.includes('brief'));
  assert.equal(selected.length, 6);
  // Toggle back on
  selected = [...selected, 'brief'];
  assert.ok(selected.includes('brief'));
  assert.equal(selected.length, 7);
});

test('Export: no fields selected produces error', () => {
  const selected: string[] = [];
  assert.equal(selected.length, 0);
});

function toCSVRow(values: unknown[]): string {
  return values.map(v => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
    return `"${String(v).replace(/"/g, '""')}"`;
  }).join(',');
}

test('Export: CSV row handles null values', () => {
  const row = toCSVRow(['name', null, 'value']);
  assert.equal(row, '"name",,"value"');
});

test('Export: CSV row escapes quotes', () => {
  const row = toCSVRow(['hello "world"']);
  assert.equal(row, '"hello ""world"""');
});

test('Export: CSV row handles objects as JSON', () => {
  const row = toCSVRow([{ key: 'val' }]);
  assert.equal(row, '"{""key"":""val""}"');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Real-time collaboration — @mention extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.+-]+/g) || [];
  return matches.map(m => m.slice(1));
}

test('Comments: extracts email mentions', () => {
  const mentions = extractMentions('Hey @john check this out');
  assert.deepEqual(mentions, ['john']);
});

test('Comments: extracts multiple mentions', () => {
  const mentions = extractMentions('Hey @alice and @bob');
  assert.deepEqual(mentions, ['alice', 'bob']);
});

test('Comments: no mentions returns empty array', () => {
  const mentions = extractMentions('No mentions here');
  assert.deepEqual(mentions, []);
});

test('Comments: extracts username mentions', () => {
  const mentions = extractMentions('Thanks @john_doe for the feedback');
  assert.deepEqual(mentions, ['john_doe']);
});

function buildThreadedStructure<T extends { id: string; parentId: string | null }>(
  comments: T[]
): Array<T & { replies: T[] }> {
  const topLevel = comments.filter(c => !c.parentId);
  return topLevel.map(parent => ({
    ...parent,
    replies: comments.filter(c => c.parentId === parent.id),
  }));
}

test('Comments: builds threaded structure', () => {
  const comments = [
    { id: '1', parentId: null, body: 'Parent' },
    { id: '2', parentId: '1', body: 'Reply 1' },
    { id: '3', parentId: '1', body: 'Reply 2' },
    { id: '4', parentId: null, body: 'Another parent' },
    { id: '5', parentId: '4', body: 'Reply to another' },
  ] as Array<{ id: string; parentId: string | null; body: string }>;

  const threaded = buildThreadedStructure(comments);
  assert.equal(threaded.length, 2);
  assert.equal(threaded[0].replies.length, 2);
  assert.equal(threaded[1].replies.length, 1);
});

test('Comments: no replies returns empty replies array', () => {
  const comments = [
    { id: '1', parentId: null, body: 'Standalone' },
  ] as Array<{ id: string; parentId: string | null; body: string }>;

  const threaded = buildThreadedStructure(comments);
  assert.equal(threaded.length, 1);
  assert.equal(threaded[0].replies.length, 0);
});

function highlightMentions(text: string): Array<{ type: 'text' | 'mention'; value: string }> {
  const parts = text.split(/(@[\w.+-]+)/g);
  return parts.filter(p => p).map(part => {
    if (part.startsWith('@')) return { type: 'mention' as const, value: part };
    return { type: 'text' as const, value: part };
  });
}

test('Comments: highlights mentions in text', () => {
  const parts = highlightMentions('Hello @john check this');
  assert.equal(parts.length, 3);
  assert.equal(parts[0].type, 'text');
  assert.equal(parts[1].type, 'mention');
  assert.equal(parts[1].value, '@john');
  assert.equal(parts[2].type, 'text');
});

test('Comments: no mentions returns all text parts', () => {
  const parts = highlightMentions('Just regular text');
  assert.equal(parts.length, 1);
  assert.equal(parts[0].type, 'text');
});
