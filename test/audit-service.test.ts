import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AuditActions } from '../src/lib/services/audit.ts';

/**
 * Tests for the audit service.
 *
 * AuditService.log and list methods depend on Prisma, which can't be
 * easily imported in isolation. These tests verify the AuditActions
 * constants and the interface contract.
 */

describe('AuditService', () => {
  describe('AuditActions constants', () => {
    test('auth actions are defined', () => {
      assert.equal(AuditActions.AUTH_LOGIN, 'auth.login');
      assert.equal(AuditActions.AUTH_LOGOUT, 'auth.logout');
      assert.equal(AuditActions.AUTH_FAILED, 'auth.failed');
      assert.equal(AuditActions.AUTH_SIGNUP, 'auth.signup');
    });

    test('API key actions are defined', () => {
      assert.equal(AuditActions.API_KEY_CREATE, 'api_key.create');
      assert.equal(AuditActions.API_KEY_REVOKE, 'api_key.revoke');
      assert.equal(AuditActions.API_KEY_USE, 'api_key.use');
    });

    test('workspace actions are defined', () => {
      assert.equal(AuditActions.WORKSPACE_CREATE, 'workspace.create');
      assert.equal(AuditActions.WORKSPACE_UPDATE, 'workspace.update');
      assert.equal(AuditActions.WORKSPACE_DELETE, 'workspace.delete');
    });

    test('member actions are defined', () => {
      assert.equal(AuditActions.MEMBER_ADD, 'member.add');
      assert.equal(AuditActions.MEMBER_REMOVE, 'member.remove');
      assert.equal(AuditActions.MEMBER_ROLE_UPDATE, 'member.role_update');
    });

    test('project actions are defined', () => {
      assert.equal(AuditActions.PROJECT_CREATE, 'project.create');
      assert.equal(AuditActions.PROJECT_UPDATE, 'project.update');
      assert.equal(AuditActions.PROJECT_DELETE, 'project.delete');
    });

    test('task actions are defined', () => {
      assert.equal(AuditActions.TASK_CREATE, 'task.create');
      assert.equal(AuditActions.TASK_UPDATE, 'task.update');
      assert.equal(AuditActions.TASK_DELETE, 'task.delete');
    });

    test('document actions are defined', () => {
      assert.equal(AuditActions.DOCUMENT_CREATE, 'document.create');
      assert.equal(AuditActions.DOCUMENT_UPDATE, 'document.update');
      assert.equal(AuditActions.DOCUMENT_DELETE, 'document.delete');
    });

    test('file actions are defined', () => {
      assert.equal(AuditActions.FILE_UPLOAD, 'file.upload');
      assert.equal(AuditActions.FILE_DELETE, 'file.delete');
    });

    test('automation actions are defined', () => {
      assert.equal(AuditActions.AUTOMATION_CREATE, 'automation.create');
      assert.equal(AuditActions.AUTOMATION_UPDATE, 'automation.update');
      assert.equal(AuditActions.AUTOMATION_DELETE, 'automation.delete');
    });

    test('agent actions are defined', () => {
      assert.equal(AuditActions.AGENT_CREATE, 'agent.create');
      assert.equal(AuditActions.AGENT_RUN, 'agent.run');
    });

    test('MCP and API request actions are defined', () => {
      assert.equal(AuditActions.MCP_REQUEST, 'mcp.request');
      assert.equal(AuditActions.API_REQUEST, 'api.request');
    });

    test('all action values are non-empty strings with dot notation', () => {
      for (const [key, value] of Object.entries(AuditActions)) {
        assert.ok(typeof value === 'string', `${key} should be a string`);
        assert.ok(value.length > 0, `${key} should be non-empty`);
        assert.ok(value.includes('.'), `${key} value "${value}" should use dot notation`);
      }
    });

    test('all action values are unique', () => {
      const values = Object.values(AuditActions);
      const unique = new Set(values);
      assert.equal(values.length, unique.size, 'AuditActions values should be unique');
    });
  });
});
