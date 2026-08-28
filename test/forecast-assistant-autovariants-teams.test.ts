import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Performance Forecasting: linear regression helpers ──

function linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function rSquared(points: Array<{ x: number; y: number }>, slope: number, intercept: number): number {
  const n = points.length;
  if (n < 2) return 0;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  return ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
}

test('Forecast: linearRegression computes correct slope for ascending data', () => {
  const points = [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 4 }];
  const { slope, intercept } = linearRegression(points);
  assert.equal(slope, 1);
  assert.equal(intercept, 1);
});

test('Forecast: linearRegression computes correct slope for descending data', () => {
  const points = [{ x: 0, y: 4 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 1 }];
  const { slope, intercept } = linearRegression(points);
  assert.equal(slope, -1);
  assert.equal(intercept, 4);
});

test('Forecast: linearRegression handles single point', () => {
  const { slope, intercept } = linearRegression([{ x: 0, y: 5 }]);
  assert.equal(slope, 0);
  assert.equal(intercept, 5);
});

test('Forecast: linearRegression handles empty data', () => {
  const { slope, intercept } = linearRegression([]);
  assert.equal(slope, 0);
  assert.equal(intercept, 0);
});

test('Forecast: rSquared returns 1 for perfect linear fit', () => {
  const points = [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }];
  const { slope, intercept } = linearRegression(points);
  const r2 = rSquared(points, slope, intercept);
  assert.equal(r2, 1);
});

test('Forecast: rSquared returns 0 for non-correlated data', () => {
  const points = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 1 }];
  const { slope, intercept } = linearRegression(points);
  const r2 = rSquared(points, slope, intercept);
  assert.ok(r2 < 0.5, `r2 should be low for noisy data, got ${r2}`);
});

test('Forecast: rSquared handles empty data', () => {
  const r2 = rSquared([], 0, 0);
  assert.equal(r2, 0);
});

test('Forecast: rSquared is clamped between 0 and 1', () => {
  const points = [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }];
  const { slope, intercept } = linearRegression(points);
  const r2 = rSquared(points, slope, intercept);
  assert.ok(r2 >= 0 && r2 <= 1, `r2 should be between 0 and 1, got ${r2}`);
});

// ── Budget recommendation logic ──

function budgetRecommendation(avgRoas: number, totalAvgRoas: number): string {
  if (avgRoas > totalAvgRoas) return 'increase';
  if (avgRoas < totalAvgRoas * 0.8) return 'decrease';
  return 'maintain';
}

test('Forecast: budget recommendation increase when ROAS above average', () => {
  assert.equal(budgetRecommendation(3.5, 2.0), 'increase');
});

test('Forecast: budget recommendation decrease when ROAS well below average', () => {
  assert.equal(budgetRecommendation(1.0, 2.0), 'decrease');
});

test('Forecast: budget recommendation maintain when ROAS near average', () => {
  assert.equal(budgetRecommendation(1.8, 2.0), 'maintain');
});

test('Forecast: budget recommendation maintain when ROAS exactly at 80% threshold', () => {
  assert.equal(budgetRecommendation(1.6, 2.0), 'maintain');
});

// ── Brief AI Assistant: suggestion parsing ──

function parseAssistantSuggestion(raw: string) {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_assistant_output');
  return JSON.parse(s.slice(a, b + 1));
}

test('BriefAssistant: parses valid JSON suggestion', () => {
  const raw = '{"toneRecommendations":[{"tone":"Energetic","rationale":"Good for TikTok"}],"angleIdeas":[],"hookSuggestions":[],"ctaOptimizations":[],"overallAssessment":"Good brief","improvements":["Add more specificity"]}';
  const j = parseAssistantSuggestion(raw);
  assert.equal(j.toneRecommendations[0].tone, 'Energetic');
  assert.equal(j.overallAssessment, 'Good brief');
  assert.equal(j.improvements.length, 1);
});

test('BriefAssistant: parses JSON wrapped in markdown code block', () => {
  const raw = '```json\n{"toneRecommendations":[],"angleIdeas":[],"hookSuggestions":[],"ctaOptimizations":[],"overallAssessment":"OK","improvements":[]}\n```';
  const j = parseAssistantSuggestion(raw);
  assert.equal(j.overallAssessment, 'OK');
});

test('BriefAssistant: throws on invalid JSON', () => {
  assert.throws(() => parseAssistantSuggestion('not json at all'), /no_json_in_assistant_output/);
});

test('BriefAssistant: throws on empty string', () => {
  assert.throws(() => parseAssistantSuggestion(''), /no_json_in_assistant_output/);
});

// ── Auto-variants: variant scoring and ranking ──

interface MockScore {
  overall: number;
  hookStrength: number;
}

function rankVariants(variants: Array<{ id: string; score: MockScore }>) {
  return [...variants].sort((a, b) => b.score.overall - a.score.overall);
}

function findWinner(variants: Array<{ id: string; score: MockScore }>) {
  if (variants.length === 0) return null;
  return rankVariants(variants)[0];
}

function computeImprovement(winnerScore: number, baselineScore: number): number {
  if (baselineScore <= 0) return 0;
  return Math.round(((winnerScore - baselineScore) / baselineScore) * 1000) / 10;
}

test('AutoVariants: rankVariants sorts by overall score descending', () => {
  const variants = [
    { id: 'v1', score: { overall: 65, hookStrength: 7 } },
    { id: 'v2', score: { overall: 80, hookStrength: 9 } },
    { id: 'v3', score: { overall: 72, hookStrength: 8 } },
  ];
  const ranked = rankVariants(variants);
  assert.equal(ranked[0].id, 'v2');
  assert.equal(ranked[1].id, 'v3');
  assert.equal(ranked[2].id, 'v1');
});

test('AutoVariants: findWinner returns highest scoring variant', () => {
  const variants = [
    { id: 'v1', score: { overall: 65, hookStrength: 7 } },
    { id: 'v2', score: { overall: 80, hookStrength: 9 } },
    { id: 'v3', score: { overall: 72, hookStrength: 8 } },
  ];
  const winner = findWinner(variants);
  assert.equal(winner?.id, 'v2');
  assert.equal(winner?.score.overall, 80);
});

test('AutoVariants: findWinner returns null for empty array', () => {
  assert.equal(findWinner([]), null);
});

test('AutoVariants: computeImprovement positive when winner beats baseline', () => {
  const improvement = computeImprovement(80, 70);
  assert.equal(improvement, 14.3);
});

test('AutoVariants: computeImprovement negative when winner below baseline', () => {
  const improvement = computeImprovement(60, 70);
  assert.equal(improvement, -14.3);
});

test('AutoVariants: computeImprovement zero when baseline is zero', () => {
  const improvement = computeImprovement(80, 0);
  assert.equal(improvement, 0);
});

test('AutoVariants: computeImprovement zero when baseline is negative', () => {
  const improvement = computeImprovement(80, -10);
  assert.equal(improvement, 0);
});

// ── Team workspaces: role hierarchy ──

const ROLE_HIERARCHY: Record<string, number> = { owner: 3, editor: 2, viewer: 1 };

function canInvite(role: string): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY['editor'];
}

function canManageMembers(role: string): boolean {
  return role === 'owner';
}

function canRemoveMember(requesterRole: string, targetUserId: string, requesterUserId: string, teamOwnerId: string): boolean {
  if (targetUserId === teamOwnerId) return false;
  if (targetUserId === requesterUserId) return true; // self-removal
  return requesterRole === 'owner';
}

test('Teams: owner can invite', () => {
  assert.equal(canInvite('owner'), true);
});

test('Teams: editor can invite', () => {
  assert.equal(canInvite('editor'), true);
});

test('Teams: viewer cannot invite', () => {
  assert.equal(canInvite('viewer'), false);
});

test('Teams: only owner can manage members', () => {
  assert.equal(canManageMembers('owner'), true);
  assert.equal(canManageMembers('editor'), false);
  assert.equal(canManageMembers('viewer'), false);
});

test('Teams: owner cannot be removed', () => {
  assert.equal(canRemoveMember('owner', 'owner-id', 'requester-id', 'owner-id'), false);
});

test('Teams: owner can remove other members', () => {
  assert.equal(canRemoveMember('owner', 'member-id', 'owner-id', 'owner-id'), true);
});

test('Teams: member can remove self', () => {
  assert.equal(canRemoveMember('viewer', 'self-id', 'self-id', 'owner-id'), true);
});

test('Teams: viewer cannot remove other members', () => {
  assert.equal(canRemoveMember('viewer', 'other-id', 'self-id', 'owner-id'), false);
});

// ── Team invitation: token and expiry ──

function isInvitationValid(acceptedAt: Date | null, expiresAt: Date, now: Date): { valid: boolean; reason?: string } {
  if (acceptedAt) return { valid: false, reason: 'already_accepted' };
  if (expiresAt < now) return { valid: false, reason: 'expired' };
  return { valid: true };
}

test('Teams: valid invitation returns valid', () => {
  const result = isInvitationValid(null, new Date(Date.now() + 86400000), new Date());
  assert.equal(result.valid, true);
});

test('Teams: accepted invitation returns invalid', () => {
  const result = isInvitationValid(new Date(), new Date(Date.now() + 86400000), new Date());
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'already_accepted');
});

test('Teams: expired invitation returns invalid', () => {
  const result = isInvitationValid(null, new Date(Date.now() - 86400000), new Date());
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'expired');
});

// ── Team slug generation ──

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base || 'team';
}

test('Teams: slug generation from simple name', () => {
  assert.equal(generateSlug('Marketing Team'), 'marketing-team');
});

test('Teams: slug generation from name with special characters', () => {
  assert.equal(generateSlug('Q4 Launch! @2026'), 'q4-launch-2026');
});

test('Teams: slug generation from empty name falls back to team', () => {
  assert.equal(generateSlug(''), 'team');
});

test('Teams: slug generation from name with only special characters', () => {
  assert.equal(generateSlug('!@#$%'), 'team');
});
