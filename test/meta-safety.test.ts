import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Meta Ads Safety Layer.
 *
 * Verifies the default safety config, checkSafety gating logic (blocked
 * actions, allowedActions whitelist, dry-run mode, approval gating), spend cap
 * detection, the audit log, the approval workflow, and config validation.
 *
 * The module under test has no database or external API dependencies, so it
 * can be exercised directly via the @/ alias loader.
 */

import {
  DEFAULT_SAFETY_CONFIG,
  validateSafetyConfig,
  checkSafety,
  checkSpendCaps,
  recordAuditEntry,
  getAuditLog,
  clearAuditLog,
  createApprovalRequest,
  getPendingApprovals,
  getApprovalRequest,
  approveRequest,
  rejectRequest,
  clearApprovals,
  type SafetyConfig,
} from '@/lib/ads/meta-safety';

function freshConfig(overrides: Partial<SafetyConfig> = {}): SafetyConfig {
  return { ...DEFAULT_SAFETY_CONFIG, ...overrides };
}

// Reset in-memory stores between tests to keep them independent.
test.beforeEach(() => {
  clearAuditLog();
  clearApprovals();
});

// ── Default config ──

test('default safety config has dryRun=true', () => {
  assert.equal(DEFAULT_SAFETY_CONFIG.dryRun, true);
});

test('default safety config blocks destructive delete actions', () => {
  assert.deepEqual(DEFAULT_SAFETY_CONFIG.blockedActions, [
    'delete_campaign',
    'delete_ad_set',
    'delete_ad',
  ]);
});

test('default safety config has sensible caps', () => {
  assert.equal(DEFAULT_SAFETY_CONFIG.maxDailyBudget, 100);
  assert.equal(DEFAULT_SAFETY_CONFIG.maxCampaignBudget, 50);
  assert.equal(DEFAULT_SAFETY_CONFIG.maxDailyMutations, 20);
  assert.equal(DEFAULT_SAFETY_CONFIG.warningThreshold, 80);
});

// ── checkSafety: blocked actions ──

test('checkSafety blocks actions in blockedActions', () => {
  const config = freshConfig({ dryRun: false });
  const result = checkSafety('delete_campaign', config);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'action_blocked');
  assert.equal(result.dryRun, false);
});

test('blocked actions are denied even in non-dry-run mode', () => {
  const config = freshConfig({ dryRun: false, requireApproval: false });
  for (const action of ['delete_campaign', 'delete_ad_set', 'delete_ad']) {
    const result = checkSafety(action, config);
    assert.equal(result.allowed, false, `${action} should be blocked`);
    assert.equal(result.reason, 'action_blocked');
  }
});

test('blocked actions are denied even in dry-run mode', () => {
  const config = freshConfig({ dryRun: true });
  const result = checkSafety('delete_ad', config);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'action_blocked');
});

// ── checkSafety: allowedActions whitelist ──

test('checkSafety allows actions in allowedActions', () => {
  const config = freshConfig({
    dryRun: false,
    requireApproval: false,
    allowedActions: ['create_campaign', 'update_budget'],
  });
  const result = checkSafety('create_campaign', config);
  assert.equal(result.allowed, true);
  assert.equal(result.reason, 'ok');
});

test('checkSafety denies actions not in a non-empty allowedActions', () => {
  const config = freshConfig({
    dryRun: false,
    allowedActions: ['create_campaign'],
  });
  const result = checkSafety('pause_campaign', config);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'action_not_allowed');
});

// ── checkSafety: dry-run mode ──

test('checkSafety returns dryRun=true when config.dryRun is true', () => {
  const config = freshConfig({ dryRun: true });
  const result = checkSafety('create_campaign', config);
  assert.equal(result.allowed, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.reason, 'dry_run_mode');
});

test('checkSafety returns dryRun=false when config.dryRun is false', () => {
  const config = freshConfig({ dryRun: false, requireApproval: false });
  const result = checkSafety('create_campaign', config);
  assert.equal(result.allowed, true);
  assert.equal(result.dryRun, false);
});

// ── checkSafety: approval gating ──

test('checkSafety returns requiresApproval=true when config.requireApproval is true', () => {
  const config = freshConfig({ dryRun: false, requireApproval: true });
  const result = checkSafety('create_campaign', config);
  assert.equal(result.requiresApproval, true);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'approval_required');
});

test('checkSafety does not require approval when requireApproval is false', () => {
  const config = freshConfig({ dryRun: false, requireApproval: false });
  const result = checkSafety('create_campaign', config);
  assert.equal(result.requiresApproval, false);
  assert.equal(result.allowed, true);
});

// ── checkSafety: spend caps ──

test('checkSafety denies budget action when proposed budget exceeds daily cap', () => {
  const config = freshConfig({ dryRun: false, requireApproval: false, maxDailyBudget: 50 });
  const result = checkSafety('create_campaign', config, { proposedBudget: 100 });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'proposed_budget_exceeds_daily_cap');
});

test('checkSafety denies budget action when current daily spend cap exceeded', () => {
  const config = freshConfig({ dryRun: false, requireApproval: false, maxDailyBudget: 50 });
  const result = checkSafety('update_budget', config, { dailySpend: 60, proposedBudget: 10 });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'daily_spend_cap_exceeded');
});

test('checkSafety warns when spend approaches threshold', () => {
  const config = freshConfig({
    dryRun: false,
    requireApproval: false,
    maxDailyBudget: 100,
    maxCampaignBudget: 100,
    warningThreshold: 80,
  });
  const result = checkSafety('update_budget', config, { dailySpend: 85, proposedBudget: 10 });
  assert.equal(result.allowed, true);
  assert.ok(result.warnings.length > 0, 'should emit a threshold warning');
});

// ── checkSpendCaps ──

test('checkSpendCaps detects exceeded daily budget', () => {
  const caps = checkSpendCaps(
    { dailySpend: 120, campaignSpend: 10 },
    { dailyBudget: 100, campaignBudget: 50, warningThreshold: 80 },
  );
  assert.equal(caps.exceededDaily, true);
  assert.equal(caps.exceededCampaign, false);
});

test('checkSpendCaps detects exceeded campaign budget', () => {
  const caps = checkSpendCaps(
    { dailySpend: 10, campaignSpend: 60 },
    { dailyBudget: 100, campaignBudget: 50, warningThreshold: 80 },
  );
  assert.equal(caps.exceededDaily, false);
  assert.equal(caps.exceededCampaign, true);
});

test('checkSpendCaps calculates warning level correctly', () => {
  // daily 40/100 = 40%, campaign 25/50 = 50% → max = 50
  const caps = checkSpendCaps(
    { dailySpend: 40, campaignSpend: 25 },
    { dailyBudget: 100, campaignBudget: 50, warningThreshold: 80 },
  );
  assert.equal(caps.warningLevel, 50);
  assert.equal(caps.exceededDaily, false);
  assert.equal(caps.exceededCampaign, false);
});

test('checkSpendCaps warning level caps at 100', () => {
  const caps = checkSpendCaps(
    { dailySpend: 500, campaignSpend: 0 },
    { dailyBudget: 100, campaignBudget: 50, warningThreshold: 80 },
  );
  assert.equal(caps.warningLevel, 100);
});

test('checkSpendCaps treats 0 caps as unlimited (no exceedance)', () => {
  const caps = checkSpendCaps(
    { dailySpend: 9999, campaignSpend: 9999 },
    { dailyBudget: 0, campaignBudget: 0, warningThreshold: 80 },
  );
  assert.equal(caps.exceededDaily, false);
  assert.equal(caps.exceededCampaign, false);
  assert.equal(caps.warningLevel, 0);
});

// ── Audit log ──

test('Audit log records entries', () => {
  const entry = recordAuditEntry({
    action: 'create_campaign',
    actor: 'user_123',
    dryRun: true,
    approved: false,
    result: 'simulated',
  });
  assert.ok(entry.id, 'entry should have an id');
  assert.equal(entry.action, 'create_campaign');
  assert.equal(entry.actor, 'user_123');
  assert.equal(entry.dryRun, true);
  assert.equal(entry.result, 'simulated');

  const log = getAuditLog();
  assert.equal(log.length, 1);
  assert.equal(log[0].id, entry.id);
});

test('Audit log accumulates multiple entries', () => {
  recordAuditEntry({ action: 'create_campaign', actor: 'a' });
  recordAuditEntry({ action: 'update_budget', actor: 'b' });
  assert.equal(getAuditLog().length, 2);
});

// ── Approval workflow ──

test('Approval workflow: create, approve, reject', () => {
  const config = freshConfig({ requireApproval: true });

  // Create two pending requests.
  const req1 = createApprovalRequest('create_campaign', config, { name: 'Campaign A' });
  const req2 = createApprovalRequest('update_budget', config, { budgetDaily: 30 });

  assert.equal(req1.status, 'pending');
  assert.equal(req2.status, 'pending');
  assert.ok(req1.id !== req2.id, 'ids should be unique');

  // Both should appear in pending list.
  assert.equal(getPendingApprovals().length, 2);

  // Approve req1.
  const approved = approveRequest(req1.id, 'admin@lazynext.local');
  assert.ok(approved);
  assert.equal(approved!.status, 'approved');
  assert.equal(approved!.approvedBy, 'admin@lazynext.local');
  assert.ok(approved!.approvedAt);

  // Reject req2.
  const rejected = rejectRequest(req2.id, 'admin@lazynext.local');
  assert.ok(rejected);
  assert.equal(rejected!.status, 'rejected');
  assert.equal(rejected!.approvedBy, 'admin@lazynext.local');

  // No more pending.
  assert.equal(getPendingApprovals().length, 0);

  // getApprovalRequest returns the (now-resolved) record.
  assert.equal(getApprovalRequest(req1.id)?.status, 'approved');
  assert.equal(getApprovalRequest(req2.id)?.status, 'rejected');
});

test('approveRequest returns undefined for unknown or non-pending ids', () => {
  assert.equal(approveRequest('does_not_exist', 'admin'), undefined);
  const req = createApprovalRequest('create_campaign', freshConfig());
  approveRequest(req.id, 'admin');
  // Already approved → second call returns undefined.
  assert.equal(approveRequest(req.id, 'admin'), undefined);
});

test('rejectRequest returns undefined for unknown or non-pending ids', () => {
  assert.equal(rejectRequest('does_not_exist', 'admin'), undefined);
  const req = createApprovalRequest('create_campaign', freshConfig());
  rejectRequest(req.id, 'admin');
  assert.equal(rejectRequest(req.id, 'admin'), undefined);
});

// ── validateSafetyConfig ──

test('validateSafetyConfig accepts the default config', () => {
  const result = validateSafetyConfig(DEFAULT_SAFETY_CONFIG);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validateSafetyConfig rejects invalid configs', () => {
  assert.equal(validateSafetyConfig(null).valid, false);
  assert.equal(validateSafetyConfig(undefined).valid, false);
  assert.equal(validateSafetyConfig('nope').valid, false);

  const bad = validateSafetyConfig({
    ...DEFAULT_SAFETY_CONFIG,
    dryRun: 'yes' as unknown as boolean,
    maxDailyBudget: -5,
    warningThreshold: 150,
    allowedActions: 'create_campaign' as unknown as string[],
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length >= 4, 'should report multiple errors');
  assert.ok(bad.errors.includes('dryRun_must_be_boolean'));
  assert.ok(bad.errors.includes('maxDailyBudget_must_be_non_negative_number'));
  assert.ok(bad.errors.includes('warningThreshold_must_be_between_0_and_100'));
  assert.ok(bad.errors.includes('allowedActions_must_be_string_array'));
});

test('validateSafetyConfig rejects non-array action lists', () => {
  const result = validateSafetyConfig({
    ...DEFAULT_SAFETY_CONFIG,
    blockedActions: [1, 2, 3] as unknown as string[],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('blockedActions_must_be_string_array'));
});
