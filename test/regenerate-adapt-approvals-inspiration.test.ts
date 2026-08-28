import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Creative Regeneration: result parsing ──

function parseRegenerationResult(raw: string) {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_regeneration_output');
  return JSON.parse(s.slice(a, b + 1));
}

test('Regeneration: parses valid regeneration result', () => {
  const raw = '{"regenerated":{"text":"New hook text","type":"conflict"},"changes":["Made it more aggressive","Shortened by 20%"],"improvementNote":"Stronger opening"}';
  const j = parseRegenerationResult(raw);
  assert.equal(j.regenerated.text, 'New hook text');
  assert.equal(j.changes.length, 2);
  assert.equal(j.improvementNote, 'Stronger opening');
});

test('Regeneration: parses JSON wrapped in markdown', () => {
  const raw = '```json\n{"regenerated":{"text":"x"},"changes":[],"improvementNote":""}\n```';
  const j = parseRegenerationResult(raw);
  assert.equal(j.regenerated.text, 'x');
});

test('Regeneration: throws on invalid JSON', () => {
  assert.throws(() => parseRegenerationResult('not json'), /no_json_in_regeneration_output/);
});

test('Regeneration: throws on empty input', () => {
  assert.throws(() => parseRegenerationResult(''), /no_json_in_regeneration_output/);
});

// ── Regeneration: preset instructions ──

const PRESETS = [
  { key: 'aggressive', instruction: 'Make the hook more aggressive' },
  { key: 'simplify', instruction: 'Simplify the language' },
  { key: 'emotional', instruction: 'Increase the emotional impact' },
  { key: 'shorter', instruction: 'Make it more concise' },
  { key: 'urgent', instruction: 'Add urgency and scarcity' },
  { key: 'social', instruction: 'Add social proof elements' },
];

test('Regeneration: presets are non-empty', () => {
  for (const p of PRESETS) {
    assert.ok(p.instruction.length > 0, `Preset ${p.key} should have non-empty instruction`);
  }
});

test('Regeneration: presets have unique keys', () => {
  const keys = PRESETS.map((p) => p.key);
  assert.equal(new Set(keys).size, keys.length);
});

// ── Regeneration: before/after diff ──

function computeDiff(original: Record<string, unknown>, regenerated: Record<string, unknown>): string[] {
  const changes: string[] = [];
  for (const key of Object.keys(original)) {
    const oldVal = JSON.stringify(original[key]);
    const newVal = JSON.stringify(regenerated[key]);
    if (oldVal !== newVal) {
      changes.push(key);
    }
  }
  // Check for new keys
  for (const key of Object.keys(regenerated)) {
    if (!(key in original)) {
      changes.push(key);
    }
  }
  return changes;
}

test('Regeneration: diff detects changed fields', () => {
  const original = { hook: 'Old hook', angle: 'Same angle', cta: 'Old CTA' };
  const regenerated = { hook: 'New hook', angle: 'Same angle', cta: 'Old CTA' };
  const changes = computeDiff(original, regenerated);
  assert.deepEqual(changes, ['hook']);
});

test('Regeneration: diff detects new fields', () => {
  const original = { hook: 'Old hook' };
  const regenerated = { hook: 'Old hook', newField: 'New value' };
  const changes = computeDiff(original, regenerated);
  assert.deepEqual(changes, ['newField']);
});

test('Regeneration: diff returns empty for identical objects', () => {
  const original = { hook: 'Same', cta: 'Same' };
  const regenerated = { hook: 'Same', cta: 'Same' };
  const changes = computeDiff(original, regenerated);
  assert.equal(changes.length, 0);
});

test('Regeneration: diff detects multiple changes', () => {
  const original = { hook: 'A', angle: 'B', cta: 'C' };
  const regenerated = { hook: 'X', angle: 'Y', cta: 'C' };
  const changes = computeDiff(original, regenerated);
  assert.equal(changes.length, 2);
  assert.ok(changes.includes('hook'));
  assert.ok(changes.includes('angle'));
});

// ── Multi-Platform Adapter: platform specs ──

const PLATFORM_SPECS: Record<string, { aspectRatio: string; maxDuration: number; format: string }> = {
  tiktok: { aspectRatio: '9:16', maxDuration: 60, format: 'ugc' },
  instagram: { aspectRatio: '9:16', maxDuration: 90, format: 'ugc' },
  youtube: { aspectRatio: '9:16', maxDuration: 60, format: 'commercial' },
  facebook: { aspectRatio: '1:1', maxDuration: 120, format: 'commercial' },
};

test('PlatformAdapter: all 4 platforms have specs', () => {
  assert.equal(Object.keys(PLATFORM_SPECS).length, 4);
  assert.ok('tiktok' in PLATFORM_SPECS);
  assert.ok('instagram' in PLATFORM_SPECS);
  assert.ok('youtube' in PLATFORM_SPECS);
  assert.ok('facebook' in PLATFORM_SPECS);
});

test('PlatformAdapter: TikTok has 9:16 and 60s max', () => {
  assert.equal(PLATFORM_SPECS.tiktok.aspectRatio, '9:16');
  assert.equal(PLATFORM_SPECS.tiktok.maxDuration, 60);
});

test('PlatformAdapter: Facebook has 1:1 and 120s max', () => {
  assert.equal(PLATFORM_SPECS.facebook.aspectRatio, '1:1');
  assert.equal(PLATFORM_SPECS.facebook.maxDuration, 120);
});

test('PlatformAdapter: Instagram has 90s max duration', () => {
  assert.equal(PLATFORM_SPECS.instagram.maxDuration, 90);
});

function filterPlatformsToAdapt(targetPlatforms: string[], originalPlatform: string): string[] {
  return targetPlatforms.filter((p) => p in PLATFORM_SPECS && p !== originalPlatform);
}

test('PlatformAdapter: filters out original platform', () => {
  const result = filterPlatformsToAdapt(['tiktok', 'instagram', 'youtube'], 'tiktok');
  assert.deepEqual(result, ['instagram', 'youtube']);
});

test('PlatformAdapter: filters out invalid platforms', () => {
  const result = filterPlatformsToAdapt(['tiktok', 'snapchat', 'twitter'], 'facebook');
  assert.deepEqual(result, ['tiktok']);
});

test('PlatformAdapter: returns empty when all targets match original', () => {
  const result = filterPlatformsToAdapt(['tiktok'], 'tiktok');
  assert.equal(result.length, 0);
});

test('PlatformAdapter: returns all valid platforms when original is different', () => {
  const result = filterPlatformsToAdapt(['tiktok', 'instagram', 'youtube', 'facebook'], 'snapchat');
  assert.equal(result.length, 4);
});

// ── PlatformAdapter: adaptation result parsing ──

function parseAdaptationResult(raw: string) {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_adaptation_output');
  return JSON.parse(s.slice(a, b + 1));
}

test('PlatformAdapter: parses valid adaptation result', () => {
  const raw = '{"adaptations":[{"platform":"instagram","hook":"New hook","cta":"Shop now","aspectRatio":"9:16","maxDurationSec":90,"format":"ugc","scriptSummary":"Summary","visualDirection":"Visual","platformSpecificNotes":"Notes"}],"notes":"Overall notes"}';
  const j = parseAdaptationResult(raw);
  assert.equal(j.adaptations[0].platform, 'instagram');
  assert.equal(j.adaptations[0].hook, 'New hook');
  assert.equal(j.notes, 'Overall notes');
});

test('PlatformAdapter: throws on invalid JSON', () => {
  assert.throws(() => parseAdaptationResult('not json'), /no_json_in_adaptation_output/);
});

// ── Multi-Stage Approvals: stage pipeline ──

const STAGES = ['creative_review', 'brand_review', 'legal_review', 'final_approval'] as const;
type Stage = typeof STAGES[number];

function getNextStage(currentStage: string): string | null {
  const idx = STAGES.indexOf(currentStage as Stage);
  if (idx >= 0 && idx < STAGES.length - 1) {
    return STAGES[idx + 1];
  }
  return null;
}

test('Approvals: creative_review advances to brand_review', () => {
  assert.equal(getNextStage('creative_review'), 'brand_review');
});

test('Approvals: brand_review advances to legal_review', () => {
  assert.equal(getNextStage('brand_review'), 'legal_review');
});

test('Approvals: legal_review advances to final_approval', () => {
  assert.equal(getNextStage('legal_review'), 'final_approval');
});

test('Approvals: final_approval has no next stage', () => {
  assert.equal(getNextStage('final_approval'), null);
});

test('Approvals: invalid stage returns null', () => {
  assert.equal(getNextStage('invalid_stage'), null);
});

test('Approvals: pipeline has 4 stages in correct order', () => {
  assert.equal(STAGES.length, 4);
  assert.equal(STAGES[0], 'creative_review');
  assert.equal(STAGES[3], 'final_approval');
});

// ── Approval stage status transitions ──

function processDecision(decision: 'approve' | 'reject' | 'request_changes'): { status: string; nextStage: string | null } {
  if (decision === 'approve') {
    return { status: 'approved', nextStage: 'next' };
  } else if (decision === 'reject') {
    return { status: 'rejected', nextStage: null };
  } else {
    return { status: 'changes_requested', nextStage: null };
  }
}

test('Approvals: approve sets status to approved', () => {
  const result = processDecision('approve');
  assert.equal(result.status, 'approved');
});

test('Approvals: reject sets status to rejected', () => {
  const result = processDecision('reject');
  assert.equal(result.status, 'rejected');
});

test('Approvals: request_changes sets status to changes_requested', () => {
  const result = processDecision('request_changes');
  assert.equal(result.status, 'changes_requested');
});

test('Approvals: only approve advances to next stage', () => {
  assert.notEqual(processDecision('approve').nextStage, null);
  assert.equal(processDecision('reject').nextStage, null);
  assert.equal(processDecision('request_changes').nextStage, null);
});

// ── Inspiration feed: filtering ──

interface InspirationCreative {
  id: string;
  platform: string;
  format: string;
  industry: string;
  avgRoas: number;
  source: string;
}

const SAMPLE_CREATIVES: InspirationCreative[] = [
  { id: '1', platform: 'tiktok', format: 'ugc', industry: 'beauty', avgRoas: 4.2, source: 'curated' },
  { id: '2', platform: 'instagram', format: 'ugc', industry: 'tech', avgRoas: 3.5, source: 'curated' },
  { id: '3', platform: 'tiktok', format: 'ugc', industry: 'fitness', avgRoas: 5.1, source: 'curated' },
  { id: '4', platform: 'youtube', format: 'commercial', industry: 'tech', avgRoas: 3.8, source: 'curated' },
  { id: '5', platform: 'facebook', format: 'drama', industry: 'food', avgRoas: 4.5, source: 'curated' },
  { id: '6', platform: 'tiktok', format: 'ugc', industry: 'finance', avgRoas: 4.8, source: 'user' },
];

function filterCreatives(creatives: InspirationCreative[], platform: string, format: string, industry: string): InspirationCreative[] {
  return creatives.filter((c) => {
    if (platform && c.platform !== platform) return false;
    if (format && c.format !== format) return false;
    if (industry && c.industry !== industry) return false;
    return true;
  });
}

test('Inspiration: filter by platform returns matching creatives', () => {
  const result = filterCreatives(SAMPLE_CREATIVES, 'tiktok', '', '');
  assert.equal(result.length, 3);
  assert.ok(result.every((c) => c.platform === 'tiktok'));
});

test('Inspiration: filter by format returns matching creatives', () => {
  const result = filterCreatives(SAMPLE_CREATIVES, '', 'ugc', '');
  assert.equal(result.length, 4);
  assert.ok(result.every((c) => c.format === 'ugc'));
});

test('Inspiration: filter by industry returns matching creatives', () => {
  const result = filterCreatives(SAMPLE_CREATIVES, '', '', 'tech');
  assert.equal(result.length, 2);
  assert.ok(result.every((c) => c.industry === 'tech'));
});

test('Inspiration: filter by all dimensions', () => {
  const result = filterCreatives(SAMPLE_CREATIVES, 'tiktok', 'ugc', 'fitness');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, '3');
});

test('Inspiration: no filters returns all', () => {
  const result = filterCreatives(SAMPLE_CREATIVES, '', '', '');
  assert.equal(result.length, 6);
});

test('Inspiration: sort by ROAS descending', () => {
  const sorted = [...SAMPLE_CREATIVES].sort((a, b) => b.avgRoas - a.avgRoas);
  assert.equal(sorted[0].avgRoas, 5.1);
  assert.equal(sorted[sorted.length - 1].avgRoas, 3.5);
});

test('Inspiration: filter by source', () => {
  const userCreatives = SAMPLE_CREATIVES.filter((c) => c.source === 'user');
  const curatedCreatives = SAMPLE_CREATIVES.filter((c) => c.source === 'curated');
  assert.equal(userCreatives.length, 1);
  assert.equal(curatedCreatives.length, 5);
});
