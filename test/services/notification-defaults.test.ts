import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DIGEST_FREQUENCIES,
  TYPE_TO_CATEGORY,
  NOTIFICATION_TYPES,
  getTypeLabel,
  getCategoryLabel,
  getPriorityColor,
  getDefaultPreferences,
} from '@/lib/services/notification-defaults';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

describe('notification-defaults constants', () => {
  it('DIGEST_FREQUENCIES has all 4 frequencies', () => {
    assert.deepEqual(DIGEST_FREQUENCIES, ['instant', 'hourly', 'daily', 'weekly']);
  });

  it('TYPE_TO_CATEGORY maps all notification types', () => {
    assert.equal(TYPE_TO_CATEGORY.task_assigned, 'task');
    assert.equal(TYPE_TO_CATEGORY.task_completed, 'task');
    assert.equal(TYPE_TO_CATEGORY.mention, 'social');
    assert.equal(TYPE_TO_CATEGORY.approval_requested, 'approval');
    assert.equal(TYPE_TO_CATEGORY.approval_granted, 'approval');
    assert.equal(TYPE_TO_CATEGORY.approval_denied, 'approval');
    assert.equal(TYPE_TO_CATEGORY.agent_completed, 'agent');
    assert.equal(TYPE_TO_CATEGORY.agent_failed, 'agent');
    assert.equal(TYPE_TO_CATEGORY.budget_alert, 'financial');
    assert.equal(TYPE_TO_CATEGORY.security_alert, 'security');
    assert.equal(TYPE_TO_CATEGORY.deployment_status, 'deployment');
    assert.equal(TYPE_TO_CATEGORY.comment, 'social');
    assert.equal(TYPE_TO_CATEGORY.system, 'system');
    assert.equal(TYPE_TO_CATEGORY.deadline_approaching, 'task');
    assert.equal(TYPE_TO_CATEGORY.goal_progress, 'system');
    assert.equal(TYPE_TO_CATEGORY.plan_updated, 'system');
  });

  it('NOTIFICATION_TYPES has entries for all types', () => {
    const types = NOTIFICATION_TYPES.map((t) => t.type);
    assert.equal(types.length, 16);
    assert.ok(types.includes('task_assigned'));
    assert.ok(types.includes('agent_failed'));
    assert.ok(types.includes('security_alert'));
    assert.ok(types.includes('plan_updated'));
  });

  it('every NOTIFICATION_TYPES entry has a label and category', () => {
    for (const meta of NOTIFICATION_TYPES) {
      assert.ok(meta.label, `${meta.type} should have a label`);
      assert.ok(meta.category, `${meta.type} should have a category`);
      assert.equal(meta.category, TYPE_TO_CATEGORY[meta.type]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTypeLabel
// ─────────────────────────────────────────────────────────────────────────────

describe('getTypeLabel', () => {
  it('returns the label for known types', () => {
    assert.equal(getTypeLabel('task_assigned'), 'Task Assigned');
    assert.equal(getTypeLabel('agent_failed'), 'Agent Failed');
    assert.equal(getTypeLabel('security_alert'), 'Security Alert');
  });

  it('title-cases unknown types', () => {
    assert.equal(getTypeLabel('some_unknown_type'), 'Some Unknown Type');
  });

  it('returns the raw string for already-formatted unknown types', () => {
    assert.equal(getTypeLabel('CustomType'), 'CustomType');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCategoryLabel
// ─────────────────────────────────────────────────────────────────────────────

describe('getCategoryLabel', () => {
  it('returns labels for known categories', () => {
    assert.equal(getCategoryLabel('task'), 'Tasks');
    assert.equal(getCategoryLabel('agent'), 'Agents');
    assert.equal(getCategoryLabel('approval'), 'Approvals');
    assert.equal(getCategoryLabel('security'), 'Security');
    assert.equal(getCategoryLabel('system'), 'System');
    assert.equal(getCategoryLabel('social'), 'Social');
    assert.equal(getCategoryLabel('financial'), 'Financial');
    assert.equal(getCategoryLabel('deployment'), 'Deployments');
  });

  it('returns the raw string for unknown categories', () => {
    assert.equal(getCategoryLabel('unknown'), 'unknown');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPriorityColor
// ─────────────────────────────────────────────────────────────────────────────

describe('getPriorityColor', () => {
  it('returns danger for urgent', () => {
    assert.equal(getPriorityColor('urgent'), 'danger');
  });

  it('returns warning for high', () => {
    assert.equal(getPriorityColor('high'), 'warning');
  });

  it('returns info for normal', () => {
    assert.equal(getPriorityColor('normal'), 'info');
  });

  it('returns default for low', () => {
    assert.equal(getPriorityColor('low'), 'default');
  });

  it('returns default for unknown priority', () => {
    assert.equal(getPriorityColor('unknown'), 'default');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDefaultPreferences
// ─────────────────────────────────────────────────────────────────────────────

describe('getDefaultPreferences', () => {
  it('returns email and in-app enabled by default', () => {
    const prefs = getDefaultPreferences();
    assert.equal(prefs.emailEnabled, true);
    assert.equal(prefs.inAppEnabled, true);
  });

  it('defaults digest frequency to daily', () => {
    const prefs = getDefaultPreferences();
    assert.equal(prefs.digestFrequency, 'daily');
  });

  it('includes preferences for all notification types', () => {
    const prefs = getDefaultPreferences();
    assert.equal(Object.keys(prefs.types).length, 16);
  });

  it('task_assigned defaults to email=true, inApp=true', () => {
    const prefs = getDefaultPreferences();
    assert.deepEqual(prefs.types.task_assigned, { email: true, inApp: true });
  });

  it('task_completed defaults to email=false, inApp=true', () => {
    const prefs = getDefaultPreferences();
    assert.deepEqual(prefs.types.task_completed, { email: false, inApp: true });
  });

  it('security_alert defaults to email=true, inApp=true', () => {
    const prefs = getDefaultPreferences();
    assert.deepEqual(prefs.types.security_alert, { email: true, inApp: true });
  });
});
