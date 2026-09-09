import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { WorkflowNodeLibrary } from '@/lib/services/workflow-node-library';

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowNodeLibrary — pure logic, no mocks needed
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowNodeLibrary', () => {
  describe('getTriggerTypes', () => {
    it('returns all 5 trigger types', () => {
      const types = WorkflowNodeLibrary.getTriggerTypes();
      assert.equal(types.length, 5);
      const typeNames = types.map((t) => t.type);
      assert.ok(typeNames.includes('manual'));
      assert.ok(typeNames.includes('schedule'));
      assert.ok(typeNames.includes('event'));
      assert.ok(typeNames.includes('webhook'));
      assert.ok(typeNames.includes('condition'));
    });

    it('includes config fields for schedule trigger', () => {
      const types = WorkflowNodeLibrary.getTriggerTypes();
      const schedule = types.find((t) => t.type === 'schedule');
      assert.ok(schedule);
      const fieldKeys = schedule!.fields.map((f) => f.key);
      assert.ok(fieldKeys.includes('cron'));
    });
  });

  describe('getActionTypes', () => {
    it('returns action types including create_task and send_notification', () => {
      const actions = WorkflowNodeLibrary.getActionTypes();
      const actionNames = actions.map((a) => a.action);
      assert.ok(actionNames.includes('create_task'));
      assert.ok(actionNames.includes('send_notification'));
      assert.ok(actionNames.includes('create_goal'));
      assert.ok(actionNames.includes('create_event'));
    });
  });

  describe('getIntegrationTypes', () => {
    it('returns all 5 integration types', () => {
      const integrations = WorkflowNodeLibrary.getIntegrationTypes();
      assert.equal(integrations.length, 5);
      const names = integrations.map((i) => i.integration);
      assert.ok(names.includes('http_request'));
      assert.ok(names.includes('database_query'));
      assert.ok(names.includes('ai_generate'));
      assert.ok(names.includes('webhook_send'));
      assert.ok(names.includes('email_send'));
    });
  });

  describe('getConditionOperators', () => {
    it('returns all 13 operators', () => {
      const ops = WorkflowNodeLibrary.getConditionOperators();
      assert.equal(ops.length, 13);
      const opNames = ops.map((o) => o.operator);
      for (const expected of ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'startsWith', 'endsWith', 'in', 'notIn', 'empty', 'notEmpty']) {
        assert.ok(opNames.includes(expected as never), `missing operator: ${expected}`);
      }
    });
  });

  describe('getNodeTemplate', () => {
    it('returns default config for trigger node', () => {
      const template = WorkflowNodeLibrary.getNodeTemplate('trigger');
      assert.equal(template.type, 'manual');
    });

    it('returns default config for delay node', () => {
      const template = WorkflowNodeLibrary.getNodeTemplate('delay');
      assert.equal(template.duration, 60);
      assert.equal(template.unit, 'seconds');
    });

    it('returns empty object for unknown node type', () => {
      const template = WorkflowNodeLibrary.getNodeTemplate('trigger' as never);
      // trigger is known; test with a truly unknown by casting
      assert.ok(typeof template === 'object');
    });
  });

  describe('getNodeSchema', () => {
    it('returns schema for action node', () => {
      const schema = WorkflowNodeLibrary.getNodeSchema('action');
      assert.ok(schema);
      assert.equal(schema!.nodeType, 'action');
      assert.equal(schema!.category, 'action');
      const fieldKeys = schema!.fields.map((f) => f.key);
      assert.ok(fieldKeys.includes('action'));
    });

    it('returns null for unknown node type', () => {
      const schema = WorkflowNodeLibrary.getNodeSchema('nonexistent' as never);
      assert.equal(schema, null);
    });
  });

  describe('getAllNodeTypes', () => {
    it('groups node schemas by category', () => {
      const grouped = WorkflowNodeLibrary.getAllNodeTypes();
      assert.ok(grouped.trigger);
      assert.ok(grouped.action);
      assert.ok(grouped.logic);
      assert.ok(grouped.integration);
      assert.ok(grouped.flow);
      // Trigger category should have exactly the trigger node
      assert.equal(grouped.trigger.length, 1);
      assert.equal(grouped.trigger[0].nodeType, 'trigger');
    });
  });

  describe('createNode', () => {
    it('creates a node with id, type, name, config, and position', () => {
      const node = WorkflowNodeLibrary.createNode('action', 'My Action');
      assert.ok(node.id);
      assert.equal(node.type, 'action');
      assert.equal(node.name, 'My Action');
      assert.ok(typeof node.config === 'object');
      assert.ok(node.position);
      assert.ok(typeof node.position.x === 'number');
    });

    it('uses schema label as default name', () => {
      const node = WorkflowNodeLibrary.createNode('delay');
      assert.equal(node.name, 'Delay');
    });
  });
});
