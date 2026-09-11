import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanCopy, scoreCopy } from './copy-rules';

// ── Positive cases (slop present) ──

test('scanCopy detects throat-clearing openers', () => {
  const r = scanCopy("Here's the thing: building products is hard.");
  assert.ok(r.hits.length > 0);
  assert.ok(r.hits.some(h => h.category === 'throat_clearing'));
});

test('scanCopy detects emphasis crutches', () => {
  const r = scanCopy("This matters because everything depends on it. Let that sink in.");
  assert.ok(r.hits.some(h => h.category === 'emphasis_crutch'));
});

test('scanCopy detects adverbs', () => {
  const r = scanCopy("This is really good and genuinely useful.");
  assert.ok(r.hits.some(h => h.category === 'adverb'));
  assert.ok(r.hits.filter(h => h.category === 'adverb').length >= 2);
});

test('scanCopy detects business jargon', () => {
  const r = scanCopy("We need to lean into the landscape and double down on our strategy.");
  assert.ok(r.hits.some(h => h.category === 'business_jargon'));
});

test('scanCopy detects banned words', () => {
  const r = scanCopy("We leverage robust solutions to foster growth.");
  assert.ok(r.hits.some(h => h.category === 'banned_word'));
  assert.ok(r.hits.filter(h => h.category === 'banned_word').length >= 3);
});

test('scanCopy detects binary contrasts', () => {
  const r = scanCopy("It's not just a tool, but a movement.");
  assert.ok(r.hits.some(h => h.category === 'binary_contrast'));
});

test('scanCopy detects em dashes', () => {
  const r = scanCopy("The tool — which is great — does many things.");
  assert.ok(r.hits.some(h => h.category === 'em_dash'));
});

test('scanCopy detects filler phrases', () => {
  const r = scanCopy("At the end of the day, it's worth noting that this works.");
  assert.ok(r.hits.some(h => h.category === 'filler_phrase'));
});

test('scanCopy detects vague declaratives', () => {
  const r = scanCopy("The implications are significant. The stakes are high.");
  assert.ok(r.hits.some(h => h.category === 'vague_declarative'));
});

test('scanCopy detects weasel attribution', () => {
  const r = scanCopy("Experts agree that this is the best approach.");
  assert.ok(r.hits.some(h => h.category === 'weasel_attribution'));
});

test('scanCopy detects passive voice', () => {
  const r = scanCopy("The app was created by the team.");
  assert.ok(r.hits.some(h => h.category === 'passive_voice'));
});

test('scanCopy detects summary recaps', () => {
  const r = scanCopy("In conclusion, this is the final point.");
  assert.ok(r.hits.some(h => h.category === 'summary_recap'));
});

test('scanCopy detects meta commentary', () => {
  const r = scanCopy("Let me walk you through the process.");
  assert.ok(r.hits.some(h => h.category === 'meta_commentary'));
});

test('scanCopy detects false agency', () => {
  const r = scanCopy("The market rewards innovation.");
  assert.ok(r.hits.some(h => h.category === 'false_agency'));
});

test('scanCopy detects rhetorical setups', () => {
  const r = scanCopy("What if I told you that this changes everything?");
  assert.ok(r.hits.some(h => h.category === 'rhetorical_setup'));
});

test('scanCopy detects lazy extremes', () => {
  const r = scanCopy("Everyone loves this. Nobody can resist.");
  assert.ok(r.hits.some(h => h.category === 'lazy_extreme'));
});

test('scanCopy detects importance puffery', () => {
  const r = scanCopy("The launch marks a pivotal moment for the company.");
  assert.ok(r.hits.some(h => h.category === 'importance_puffery'));
});

// ── Negative cases (clean prose) ──

test('scanCopy returns few hits on clean prose', () => {
  const clean = "The team shipped the feature on Tuesday. Users can now export CSV files from the dashboard. The export button is in the top right.";
  const r = scanCopy(clean);
  assert.ok(r.totalHits <= 1, `expected <= 1 hits, got ${r.totalHits}`);
});

test('scanCopy returns zero hits on minimal clean prose', () => {
  const clean = "Click the button. The file downloads.";
  const r = scanCopy(clean);
  assert.equal(r.totalHits, 0);
});

// ── Scoring ──

test('scoreCopy returns low score for heavy slop', () => {
  const slop = "Here's the thing: we leverage robust solutions to foster growth. It's not just a tool, but a movement. Let that sink in. The implications are significant.";
  const s = scoreCopy(slop);
  assert.ok(s.total < 35, `expected < 35, got ${s.total}`);
});

test('scoreCopy returns high score for clean prose', () => {
  const clean = "The team shipped the feature on Tuesday. Users export CSV files from the dashboard. The button is in the top right corner.";
  const s = scoreCopy(clean);
  assert.ok(s.total >= 35, `expected >= 35, got ${s.total}`);
});

test('scanCopy verdict is revise for heavy slop', () => {
  const slop = "Here's the thing: we leverage robust solutions to foster growth.";
  const r = scanCopy(slop);
  assert.equal(r.verdict, 'revise');
});

test('scanCopy verdict is pass for clean prose', () => {
  const clean = "The team shipped the feature. Users can export files.";
  const r = scanCopy(clean);
  assert.equal(r.verdict, 'pass');
});

// ── Report structure ──

test('scanCopy report has categories aggregation', () => {
  const r = scanCopy("We leverage robust solutions. Let that sink in.");
  assert.ok(typeof r.categories === 'object');
  assert.ok(Object.keys(r.categories).length > 0);
});

test('scanCopy hits have line numbers', () => {
  const text = "Line one is clean.\nHere's the thing: line two has slop.";
  const r = scanCopy(text);
  assert.ok(r.hits.length > 0);
  assert.equal(r.hits[0].line, 2);
});

test('scanCopy hits have fix suggestions', () => {
  const r = scanCopy("We leverage robust solutions.");
  assert.ok(r.hits.length > 0);
  assert.ok(r.hits.every(h => h.fix.length > 0));
});
