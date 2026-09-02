import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── A/B Test Planner: sample size estimation ──

function computeSampleSize(expectedCvr: number, mdeRelative: number = 0.2): number {
  const p = expectedCvr;
  const delta = p * mdeRelative;
  return Math.ceil(16 * p * (1 - p) / (delta * delta));
}

test('ABTestPlanner: sample size for 2% CVR with 20% MDE', () => {
  const n = computeSampleSize(0.02);
  // n = 16 * 0.02 * 0.98 / (0.004)^2 = 0.3136 / 0.000016 = 19600
  assert.ok(n > 15000, `Expected large sample size, got ${n}`);
  assert.ok(n < 25000, `Expected reasonable sample size, got ${n}`);
});

test('ABTestPlanner: sample size for 5% CVR', () => {
  const n = computeSampleSize(0.05);
  assert.ok(n > 1000, `Expected >1000, got ${n}`);
  assert.ok(n < 10000, `Expected <10000, got ${n}`);
});

test('ABTestPlanner: higher CVR requires smaller sample', () => {
  const lowCvr = computeSampleSize(0.01);
  const highCvr = computeSampleSize(0.10);
  assert.ok(lowCvr > highCvr, 'Lower CVR should require larger sample');
});

test('ABTestPlanner: larger MDE requires smaller sample', () => {
  const smallMde = computeSampleSize(0.02, 0.1);
  const largeMde = computeSampleSize(0.02, 0.5);
  assert.ok(smallMde > largeMde, 'Smaller MDE should require larger sample');
});

test('ABTestPlanner: estimated duration calculation', () => {
  const sampleSize = 10000;
  const dailyBudget = 50;
  // rough CPM-based: impressions = dailyBudget * 1000 / 2 (assuming $2 CPM)
  const dailyImpressions = dailyBudget * 1000 / 2;
  const duration = Math.ceil(sampleSize / dailyImpressions);
  assert.ok(duration > 0);
  assert.ok(duration < 365, 'Should be less than a year');
});

// ── A/B Test Planner: variant labeling ──

function labelVariant(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C, D, E
}

test('ABTestPlanner: variant labels are A, B, C, D', () => {
  assert.equal(labelVariant(0), 'A');
  assert.equal(labelVariant(1), 'B');
  assert.equal(labelVariant(2), 'C');
  assert.equal(labelVariant(3), 'D');
});

test('ABTestPlanner: control variant is always A', () => {
  assert.equal(labelVariant(0), 'A');
});

// ── A/B Test Planner: plan result parsing ──

function parsePlanResult(raw: string) {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_ab_test_plan');
  return JSON.parse(s.slice(a, b + 1));
}

test('ABTestPlanner: parses valid plan result', () => {
  const raw = '{"testName":"Hook Test","controlVariant":{"label":"A","variable":"baseline"},"testVariants":[{"label":"B","variable":"hook","hypothesis":"New hook"}],"primaryMetric":"roas","hypothesis":"Test","variables":["hook"],"notes":"notes"}';
  const j = parsePlanResult(raw);
  assert.equal(j.testName, 'Hook Test');
  assert.equal(j.controlVariant.label, 'A');
  assert.equal(j.testVariants[0].variable, 'hook');
});

test('ABTestPlanner: throws on invalid JSON', () => {
  assert.throws(() => parsePlanResult('not json'), /no_json_in_ab_test_plan/);
});

// ── Brand Voice Checker: score color coding ──

function scoreColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

test('BrandCheck: score >= 80 is green', () => {
  assert.equal(scoreColor(80), 'green');
  assert.equal(scoreColor(95), 'green');
  assert.equal(scoreColor(100), 'green');
});

test('BrandCheck: score 60-79 is yellow', () => {
  assert.equal(scoreColor(60), 'yellow');
  assert.equal(scoreColor(70), 'yellow');
  assert.equal(scoreColor(79), 'yellow');
});

test('BrandCheck: score < 60 is red', () => {
  assert.equal(scoreColor(59), 'red');
  assert.equal(scoreColor(40), 'red');
  assert.equal(scoreColor(0), 'red');
});

// ── Brand Voice Checker: severity ordering ──

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortBySeverity(deviations: Array<{ severity: string }>) {
  return [...deviations].sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity] ?? 3;
    const bOrder = SEVERITY_ORDER[b.severity] ?? 3;
    return aOrder - bOrder;
  });
}

test('BrandCheck: sort deviations by severity (high first)', () => {
  const deviations = [
    { severity: 'low' },
    { severity: 'high' },
    { severity: 'medium' },
  ];
  const sorted = sortBySeverity(deviations);
  assert.equal(sorted[0].severity, 'high');
  assert.equal(sorted[1].severity, 'medium');
  assert.equal(sorted[2].severity, 'low');
});

test('BrandCheck: unknown severity sorts last', () => {
  const deviations = [
    { severity: 'unknown' },
    { severity: 'low' },
  ];
  const sorted = sortBySeverity(deviations);
  assert.equal(sorted[0].severity, 'low');
  assert.equal(sorted[1].severity, 'unknown');
});

// ── Brand Voice Checker: result parsing ──

function parseBrandCheckResult(raw: string) {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_brand_check');
  return JSON.parse(s.slice(a, b + 1));
}

test('BrandCheck: parses valid brand check result', () => {
  const raw = '{"overallScore":85,"toneScore":90,"messagingScore":80,"visualScore":85,"vocabularyScore":88,"deviations":[{"category":"tone","severity":"low","description":"slightly informal","suggestion":"use more professional tone"}],"recommendations":["adjust tone"],"alignedElements":["color palette"]}';
  const j = parseBrandCheckResult(raw);
  assert.equal(j.overallScore, 85);
  assert.equal(j.deviations[0].category, 'tone');
  assert.equal(j.alignedElements[0], 'color palette');
});

test('BrandCheck: throws on invalid JSON', () => {
  assert.throws(() => parseBrandCheckResult('not json'), /no_json_in_brand_check/);
});

// ── Smart Asset Library: tag merging ──

function mergeTags(existing: string[], newTags: string[]): string[] {
  return [...new Set([...existing, ...newTags])];
}

test('SmartAssets: merge tags deduplicates', () => {
  const merged = mergeTags(['skincare', 'beauty'], ['beauty', 'luxury']);
  assert.deepEqual(merged, ['skincare', 'beauty', 'luxury']);
});

test('SmartAssets: merge tags with empty existing', () => {
  const merged = mergeTags([], ['product', 'lifestyle']);
  assert.deepEqual(merged, ['product', 'lifestyle']);
});

test('SmartAssets: merge tags with empty new', () => {
  const merged = mergeTags(['existing'], []);
  assert.deepEqual(merged, ['existing']);
});

test('SmartAssets: merge tags preserves order', () => {
  const merged = mergeTags(['a', 'b'], ['c', 'a']);
  assert.deepEqual(merged, ['a', 'b', 'c']);
});

// ── Smart Asset Library: auto-tag result parsing ──

function parseAutoTagResult(raw: string) {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_auto_tag');
  return JSON.parse(s.slice(a, b + 1));
}

test('SmartAssets: parses valid auto-tag result', () => {
  const raw = '{"tags":["skincare","beauty","luxury"],"category":"product","mood":"luxurious","colorPalette":["#FFD700","#000000"],"sceneType":"studio","productType":"skincare","description":"A luxury skincare product shot"}';
  const j = parseAutoTagResult(raw);
  assert.equal(j.tags.length, 3);
  assert.equal(j.category, 'product');
  assert.equal(j.mood, 'luxurious');
});

test('SmartAssets: throws on invalid JSON', () => {
  assert.throws(() => parseAutoTagResult('not json'), /no_json_in_auto_tag/);
});

// ── Smart Asset Library: asset suggestion scoring ──

interface ScoreableAsset {
  id: string;
  tags: string[];
  autoTag: { productType?: string; mood?: string; description?: string };
}

function scoreAsset(asset: ScoreableAsset, product: string, audience: string): number {
  let score = 0;
  const productLower = product.toLowerCase();
  const audienceLower = audience.toLowerCase();

  if (asset.autoTag.productType && productLower.includes(asset.autoTag.productType.toLowerCase())) {
    score += 30;
  }
  if (asset.autoTag.description && productLower.includes(asset.autoTag.description.toLowerCase().slice(0, 20))) {
    score += 20;
  }
  for (const tag of asset.tags) {
    if (productLower.includes(tag.toLowerCase())) score += 10;
    if (audienceLower.includes(tag.toLowerCase())) score += 10;
  }
  if (Object.keys(asset.autoTag).length > 0) score += 5;
  return score;
}

test('SmartAssets: product type match scores 30', () => {
  const asset: ScoreableAsset = {
    id: '1',
    tags: [],
    autoTag: { productType: 'skincare' },
  };
  const score = scoreAsset(asset, 'skincare product', '');
  assert.ok(score >= 30, `Expected >=30, got ${score}`);
});

test('SmartAssets: tag match adds 10 per match', () => {
  const asset: ScoreableAsset = {
    id: '1',
    tags: ['beauty', 'luxury'],
    autoTag: {},
  };
  const score = scoreAsset(asset, 'beauty luxury product', '');
  assert.ok(score >= 20, `Expected >=20, got ${score}`);
});

test('SmartAssets: no matches scores 5 (auto-tag bonus only)', () => {
  const asset: ScoreableAsset = {
    id: '1',
    tags: ['random'],
    autoTag: { productType: 'tech' },
  };
  const score = scoreAsset(asset, 'skincare', '');
  assert.equal(score, 5);
});

test('SmartAssets: sorts suggestions by score descending', () => {
  const assets: ScoreableAsset[] = [
    { id: '1', tags: [], autoTag: { productType: 'tech' } },
    { id: '2', tags: ['skincare'], autoTag: { productType: 'skincare' } },
    { id: '3', tags: [], autoTag: {} },
  ];
  const scored = assets
    .map((a) => ({ ...a, score: scoreAsset(a, 'skincare product', '') }))
    .sort((a, b) => b.score - a.score);
  assert.equal(scored[0].id, '2'); // highest score
  assert.equal(scored[2].id, '3'); // lowest score (0)
});

// ── Content Calendar: date helpers ──

function getMonthGrid(year: number, month: number): Array<{ date: string | null; day: number | null }> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells: Array<{ date: string | null; day: number | null }> = [];

  // Leading empty cells
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ date: null, day: null });
  }

  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: dateStr, day: d });
  }

  // Trailing empty cells to fill the last week
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null });
  }

  return cells;
}

test('Calendar: January 2026 starts on Thursday', () => {
  const grid = getMonthGrid(2026, 0); // January 2026
  // Jan 1, 2026 is a Thursday (index 4)
  assert.equal(grid[4].day, 1);
  assert.equal(grid[0].day, null); // Sunday before
});

test('Calendar: February 2026 has 28 days', () => {
  const grid = getMonthGrid(2026, 1); // February 2026
  const days = grid.filter((c) => c.day !== null);
  assert.equal(days.length, 28);
});

test('Calendar: grid is always multiple of 7', () => {
  for (let m = 0; m < 12; m++) {
    const grid = getMonthGrid(2026, m);
    assert.equal(grid.length % 7, 0, `Month ${m} grid should be multiple of 7`);
  }
});

test('Calendar: date string format is YYYY-MM-DD', () => {
  const grid = getMonthGrid(2026, 0);
  const firstDay = grid.find((c) => c.day === 1);
  assert.equal(firstDay?.date, '2026-01-01');
});

// ── Content Calendar: entry grouping ──

interface CalendarEntry {
  id: string;
  date: string;
  type: 'campaign' | 'creative';
  name: string;
  platform?: string;
  status?: string;
}

function groupByDate(entries: CalendarEntry[]): Record<string, CalendarEntry[]> {
  return entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {} as Record<string, CalendarEntry[]>);
}

test('Calendar: groups entries by date', () => {
  const entries: CalendarEntry[] = [
    { id: '1', date: '2026-01-15', type: 'campaign', name: 'Test A' },
    { id: '2', date: '2026-01-15', type: 'creative', name: 'Creative 1' },
    { id: '3', date: '2026-01-20', type: 'campaign', name: 'Test B' },
  ];
  const grouped = groupByDate(entries);
  assert.equal(grouped['2026-01-15'].length, 2);
  assert.equal(grouped['2026-01-20'].length, 1);
});

test('Calendar: empty entries returns empty object', () => {
  const grouped = groupByDate([]);
  assert.equal(Object.keys(grouped).length, 0);
});

// ── Content Calendar: optimal times ──

function getDayName(date: Date): string {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
}

test('Calendar: getDayName returns correct day', () => {
  assert.equal(getDayName(new Date('2026-01-01')), 'thursday');
  assert.equal(getDayName(new Date('2026-01-02')), 'friday');
  assert.equal(getDayName(new Date('2026-01-03')), 'saturday');
  assert.equal(getDayName(new Date('2026-01-04')), 'sunday');
});

function findBestTimeSlot(stats: Record<string, { roas: number[] }>): { key: string; avgRoas: number } | null {
  let bestKey = '';
  let bestRoas = 0;
  for (const [key, data] of Object.entries(stats)) {
    if (data.roas.length === 0) continue;
    const avg = data.roas.reduce((a, b) => a + b, 0) / data.roas.length;
    if (avg > bestRoas) { bestRoas = avg; bestKey = key; }
  }
  return bestKey ? { key: bestKey, avgRoas: bestRoas } : null;
}

test('Calendar: finds best time slot by avg ROAS', () => {
  const stats = {
    'monday-9': { roas: [3.0, 3.5] },
    'tuesday-14': { roas: [5.0, 4.5] },
    'wednesday-18': { roas: [2.0, 2.5] },
  };
  const best = findBestTimeSlot(stats);
  assert.equal(best?.key, 'tuesday-14');
  assert.equal(best?.avgRoas, 4.75);
});

test('Calendar: returns null for empty stats', () => {
  const best = findBestTimeSlot({});
  assert.equal(best, null);
});

test('Calendar: returns null when all slots have empty arrays', () => {
  const stats = { 'monday-9': { roas: [] } };
  const best = findBestTimeSlot(stats);
  assert.equal(best, null);
});

// ── Content Calendar: reschedule validation ──

function validateDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

test('Calendar: validates YYYY-MM-DD format', () => {
  assert.ok(validateDate('2026-01-15'));
  assert.ok(validateDate('2026-12-31'));
  assert.ok(!validateDate('2026-1-5'));
  assert.ok(!validateDate('01/15/2026'));
  assert.ok(!validateDate(''));
  assert.ok(!validateDate('invalid'));
});
