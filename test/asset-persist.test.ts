import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the asset persistence module (src/lib/creative/asset-persist.ts).
 *
 * The production functions query Prisma, whose Cloudflare-backed client cannot
 * be instantiated in the Node test runner. Following the same convention as
 * test/creative-director.test.ts and test/creative-learning.test.ts, we
 * replicate the pure logic (asset grouping, metadata parsing, type filtering)
 * to verify the data structures and invariants hermetically.
 */

interface AssetRecord {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  tags: unknown;
  metadata: unknown;
  createdAt: string;
}

// Replicate parseMetadata from the creative-assets page
function parseMetadata(data: unknown): Record<string, unknown> | null {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

// Replicate parseTags from the creative-assets page
function parseTags(data: unknown): string[] {
  if (typeof data === 'string') {
    try { return JSON.parse(data) as string[]; } catch { return []; }
  }
  if (Array.isArray(data)) return data as string[];
  return [];
}

// Replicate the grouping logic from the page
function groupAssets(assets: AssetRecord[]) {
  const packages = assets.filter((a) => a.type === 'creative_package');
  const standalone = assets.filter((a) => a.type !== 'creative_package' && !a.parentId);
  const childrenOf = (parentId: string) => assets.filter((a) => a.parentId === parentId);
  return { packages, standalone, childrenOf };
}

// ── parseMetadata ──

test('parseMetadata parses a JSON string into an object', () => {
  const result = parseMetadata('{"key":"value","num":42}');
  assert.equal(result?.key, 'value');
  assert.equal(result?.num, 42);
});

test('parseMetadata returns null for invalid JSON string', () => {
  assert.equal(parseMetadata('not json'), null);
});

test('parseMetadata passes through an object', () => {
  const obj = { foo: 'bar' };
  assert.deepEqual(parseMetadata(obj), obj);
});

test('parseMetadata returns null for null/undefined', () => {
  assert.equal(parseMetadata(null), null);
  assert.equal(parseMetadata(undefined), null);
});

// ── parseTags ──

test('parseTags parses a JSON string array', () => {
  assert.deepEqual(parseTags('["director","best"]'), ['director', 'best']);
});

test('parseTags passes through an array', () => {
  assert.deepEqual(parseTags(['a', 'b']), ['a', 'b']);
});

test('parseTags returns empty array for invalid JSON', () => {
  assert.deepEqual(parseTags('not json'), []);
});

test('parseTags returns empty array for null', () => {
  assert.deepEqual(parseTags(null), []);
});

// ── groupAssets ──

test('groupAssets separates packages from standalone assets', () => {
  const assets: AssetRecord[] = [
    { id: 'p1', type: 'creative_package', name: 'Package 1', parentId: null, tags: null, metadata: null, createdAt: '2026-01-01' },
    { id: 'b1', type: 'brief', name: 'Brief', parentId: 'p1', tags: '["director"]', metadata: '{}', createdAt: '2026-01-01' },
    { id: 'h1', type: 'hooks', name: 'Hooks', parentId: 'p1', tags: '["director"]', metadata: '{}', createdAt: '2026-01-01' },
    { id: 's1', type: 'script', name: 'Standalone Script', parentId: null, tags: null, metadata: '{}', createdAt: '2026-01-01' },
  ];
  const { packages, standalone, childrenOf } = groupAssets(assets);
  assert.equal(packages.length, 1);
  assert.equal(packages[0].id, 'p1');
  assert.equal(standalone.length, 1);
  assert.equal(standalone[0].id, 's1');
  const children = childrenOf('p1');
  assert.equal(children.length, 2);
  assert.deepEqual(children.map((c) => c.type), ['brief', 'hooks']);
});

test('groupAssets returns empty arrays for no assets', () => {
  const { packages, standalone } = groupAssets([]);
  assert.equal(packages.length, 0);
  assert.equal(standalone.length, 0);
});

test('groupAssets childrenOf returns empty for a parent with no children', () => {
  const assets: AssetRecord[] = [
    { id: 'p1', type: 'creative_package', name: 'Package 1', parentId: null, tags: null, metadata: null, createdAt: '2026-01-01' },
  ];
  const { childrenOf } = groupAssets(assets);
  assert.equal(childrenOf('p1').length, 0);
});

test('groupAssets does not count child assets as standalone', () => {
  const assets: AssetRecord[] = [
    { id: 'p1', type: 'creative_package', name: 'Package 1', parentId: null, tags: null, metadata: null, createdAt: '2026-01-01' },
    { id: 'b1', type: 'brief', name: 'Brief', parentId: 'p1', tags: null, metadata: null, createdAt: '2026-01-01' },
  ];
  const { standalone } = groupAssets(assets);
  // b1 has a parentId, so it should NOT be in standalone
  assert.equal(standalone.length, 0);
});

// ── Asset type filtering (replicate the filter logic from the page) ──

test('filtering by type returns only matching assets', () => {
  const assets: AssetRecord[] = [
    { id: 'p1', type: 'creative_package', name: 'P1', parentId: null, tags: null, metadata: null, createdAt: '2026-01-01' },
    { id: 'b1', type: 'brief', name: 'B1', parentId: 'p1', tags: null, metadata: null, createdAt: '2026-01-01' },
    { id: 'b2', type: 'brief', name: 'B2', parentId: null, tags: null, metadata: null, createdAt: '2026-01-01' },
  ];
  const filtered = assets.filter((a) => a.type === 'brief');
  assert.equal(filtered.length, 2);
  assert.deepEqual(filtered.map((a) => a.id), ['b1', 'b2']);
});

test('filtering by "all" returns all assets', () => {
  const assets: AssetRecord[] = [
    { id: 'p1', type: 'creative_package', name: 'P1', parentId: null, tags: null, metadata: null, createdAt: '2026-01-01' },
    { id: 'b1', type: 'brief', name: 'B1', parentId: 'p1', tags: null, metadata: null, createdAt: '2026-01-01' },
  ];
  const filtered = assets.filter((a) => true); // "all" filter
  assert.equal(filtered.length, 2);
});

// ── AssetType validation ──

const VALID_ASSET_TYPES = ['brief', 'hooks', 'angles', 'script', 'storyboard', 'score', 'variants', 'creative_package'];

test('all expected asset types are valid', () => {
  for (const type of VALID_ASSET_TYPES) {
    assert.ok(VALID_ASSET_TYPES.includes(type), `${type} should be valid`);
  }
});

test('creative_package is a valid asset type', () => {
  assert.ok(VALID_ASSET_TYPES.includes('creative_package'));
});

test('unknown type is not in the valid set', () => {
  assert.ok(!VALID_ASSET_TYPES.includes('unknown'));
});
