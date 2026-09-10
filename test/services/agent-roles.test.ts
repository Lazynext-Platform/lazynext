import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// No mocks required — agent-roles is a pure definition module.
// ─────────────────────────────────────────────────────────────────────────────

const {
  AgentRoleDefinitions,
  getRoleDefinition,
  getAllRoles,
  getToolsForRole,
  getSystemPromptForRole,
} = await import('@/lib/services/agent-roles');

const EXPECTED_ROLES = [
  'ceo',
  'strategy',
  'engineering',
  'research',
  'product',
  'design',
  'growth',
  'sales',
  'support',
  'finance',
  'operations',
  'security',
];

// ─────────────────────────────────────────────────────────────────────────────
// Tests — AgentRoleDefinitions
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentRoleDefinitions', () => {
  it('has all 12 roles', () => {
    assert.equal(Object.keys(AgentRoleDefinitions).length, 12);
  });

  it('contains every expected role key', () => {
    for (const role of EXPECTED_ROLES) {
      assert.ok(AgentRoleDefinitions[role], `missing role: ${role}`);
    }
  });

  it('each definition has the required fields', () => {
    for (const role of EXPECTED_ROLES) {
      const def = AgentRoleDefinitions[role];
      assert.equal(def.role, role);
      assert.ok(def.name.length > 0);
      assert.ok(def.description.length > 0);
      assert.ok(def.systemPrompt.length > 0);
      assert.ok(Array.isArray(def.tools));
      assert.ok(def.tools.length > 0);
      assert.ok(Array.isArray(def.permissions));
      assert.ok(def.permissions.length > 0);
      assert.ok(['low', 'medium', 'high'].includes(def.riskLevel));
      assert.ok(['manual', 'assisted', 'autonomous'].includes(def.autonomyMode));
      assert.ok(def.budgetCategory.length > 0);
      assert.ok(def.maxConcurrentRuns >= 1);
      assert.ok(Array.isArray(def.defaultContextTypes));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — getRoleDefinition
// ─────────────────────────────────────────────────────────────────────────────

describe('getRoleDefinition', () => {
  it('returns the correct definition for each known role', () => {
    for (const role of EXPECTED_ROLES) {
      const def = getRoleDefinition(role);
      assert.ok(def, `expected definition for ${role}`);
      assert.equal(def!.role, role);
      assert.equal(def!.name, AgentRoleDefinitions[role].name);
    }
  });

  it('returns null for an unknown role', () => {
    const def = getRoleDefinition('nonexistent_role');
    assert.equal(def, null);
  });

  it('returns a copy (not a reference) of the definition object', () => {
    const def = getRoleDefinition('ceo');
    assert.ok(def);
    // The top-level object is a shallow copy — it must not be the same reference
    assert.notEqual(def, AgentRoleDefinitions.ceo);
    assert.equal(def!.role, AgentRoleDefinitions.ceo.role);
    assert.equal(def!.name, AgentRoleDefinitions.ceo.name);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — getAllRoles
// ─────────────────────────────────────────────────────────────────────────────

describe('getAllRoles', () => {
  it('returns 12 roles', () => {
    const roles = getAllRoles();
    assert.equal(roles.length, 12);
  });

  it('returns all expected role keys', () => {
    const roles = getAllRoles();
    for (const role of EXPECTED_ROLES) {
      assert.ok(roles.includes(role), `missing role in list: ${role}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — getToolsForRole
// ─────────────────────────────────────────────────────────────────────────────

describe('getToolsForRole', () => {
  it('returns the correct tools for ceo', () => {
    const tools = getToolsForRole('ceo');
    assert.ok(tools.includes('read_company'));
    assert.ok(tools.includes('create_plan'));
    assert.ok(tools.includes('create_task'));
    assert.ok(tools.includes('assign_task'));
    assert.ok(tools.includes('notifications'));
  });

  it('returns the correct tools for engineering', () => {
    const tools = getToolsForRole('engineering');
    assert.ok(tools.includes('github'));
    assert.ok(tools.includes('code_exec'));
    assert.ok(tools.includes('test_runner'));
    assert.ok(tools.includes('file_read'));
    assert.ok(tools.includes('file_write'));
  });

  it('returns the correct tools for research', () => {
    const tools = getToolsForRole('research');
    assert.ok(tools.includes('web_search'));
    assert.ok(tools.includes('browser'));
    assert.ok(tools.includes('fetch_url'));
  });

  it('returns the correct tools for security', () => {
    const tools = getToolsForRole('security');
    assert.ok(tools.includes('security_scan'));
    assert.ok(tools.includes('read_audit'));
    assert.ok(tools.includes('read_policies'));
    assert.ok(tools.includes('create_alert'));
  });

  it('returns an empty array for an unknown role', () => {
    const tools = getToolsForRole('nonexistent_role');
    assert.deepEqual(tools, []);
  });

  it('returns a copy (not a reference) of the tools array', () => {
    const tools = getToolsForRole('ceo');
    tools.push('mutated_tool');
    // The original definition's tools must be unaffected (getToolsForRole spreads)
    assert.ok(!AgentRoleDefinitions.ceo.tools.includes('mutated_tool'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — getSystemPromptForRole
// ─────────────────────────────────────────────────────────────────────────────

describe('getSystemPromptForRole', () => {
  it('returns the correct prompt for ceo', () => {
    const prompt = getSystemPromptForRole('ceo');
    assert.ok(prompt.length > 0);
    assert.ok(prompt.includes('CEO'));
  });

  it('returns the correct prompt for engineering', () => {
    const prompt = getSystemPromptForRole('engineering');
    assert.ok(prompt.length > 0);
    assert.ok(prompt.includes('Engineering'));
  });

  it('returns the correct prompt for each known role', () => {
    for (const role of EXPECTED_ROLES) {
      const prompt = getSystemPromptForRole(role);
      assert.ok(prompt.length > 0, `empty prompt for ${role}`);
    }
  });

  it('returns an empty string for an unknown role', () => {
    const prompt = getSystemPromptForRole('nonexistent_role');
    assert.equal(prompt, '');
  });
});
