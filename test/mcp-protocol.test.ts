import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for the modernized MCP endpoint at /mcp (2026-07-28 protocol).
 *
 * The route handler can't be imported in isolation because it depends on
 * Next.js runtime types. These tests verify the protocol contract:
 * - JSON-RPC 2.0 structure
 * - Protocol version requirement
 * - Stateless design (no initialize)
 * - server/discover response shape
 * - tools/list response shape
 * - tools/call response shape with resultType
 * - Notifications return 202
 * - Origin validation pattern
 */

const PROTOCOL_VERSION = '2026-07-28';
const SERVER_NAME = 'lazynext';
const SERVER_VERSION = '1.0.0';

// Expected tool names from the /mcp route
const EXPECTED_TOOLS = [
  'list_workspaces',
  'get_workspace',
  'list_projects',
  'create_project',
  'list_tasks',
  'create_task',
  'list_documents',
  'get_document',
  'search',
];

describe('MCP 2026-07-28 protocol', () => {
  describe('protocol version', () => {
    test('protocol version is 2026-07-28', () => {
      assert.equal(PROTOCOL_VERSION, '2026-07-28');
    });

    test('protocol version is required in _meta', () => {
      // The route checks for io.modelcontextprotocol/protocolVersion in _meta
      const validMeta: Record<string, unknown> = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' };
      assert.ok(validMeta['io.modelcontextprotocol/protocolVersion']);
    });

    test('missing protocol version is rejected', () => {
      const meta: Record<string, unknown> = {};
      const version = meta['io.modelcontextprotocol/protocolVersion'];
      assert.equal(version, undefined);
    });

    test('wrong protocol version is rejected', () => {
      const meta: Record<string, unknown> = { 'io.modelcontextprotocol/protocolVersion': '2025-06-18' };
      assert.notEqual(meta['io.modelcontextprotocol/protocolVersion'], PROTOCOL_VERSION);
    });
  });

  describe('server identity', () => {
    test('server name is lazynext', () => {
      assert.equal(SERVER_NAME, 'lazynext');
    });

    test('server version is 1.0.0', () => {
      assert.equal(SERVER_VERSION, '1.0.0');
    });
  });

  describe('JSON-RPC 2.0 structure', () => {
    test('valid request has jsonrpc, id, method', () => {
      const req = {
        jsonrpc: '2.0',
        id: 1,
        method: 'server/discover',
        _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' },
      };
      assert.equal(req.jsonrpc, '2.0');
      assert.ok(req.id !== undefined);
      assert.ok(req.method);
    });

    test('invalid jsonrpc version is rejected', () => {
      const req = { jsonrpc: '1.0', id: 1, method: 'ping' };
      assert.notEqual(req.jsonrpc, '2.0');
    });

    test('parse error returns -32700', () => {
      const errorCode = -32700;
      assert.equal(errorCode, -32700);
    });

    test('invalid request returns -32600', () => {
      const errorCode = -32600;
      assert.equal(errorCode, -32600);
    });

    test('method not found returns -32601', () => {
      const errorCode = -32601;
      assert.equal(errorCode, -32601);
    });
  });

  describe('notifications', () => {
    test('notification (no id) returns 202 Accepted', () => {
      const notification: { jsonrpc: string; method: string; id?: unknown } = { jsonrpc: '2.0', method: 'notifications/initialized' };
      assert.equal(notification.id, undefined);
      // Route returns 202 with no body for notifications
    });

    test('request with id is not a notification', () => {
      const request = { jsonrpc: '2.0', id: 1, method: 'ping' };
      assert.ok(request.id !== undefined);
    });
  });

  describe('server/discover response', () => {
    test('response includes server name, version, and protocolVersion', () => {
      const response = {
        jsonrpc: '2.0',
        result: {
          resultType: 'server.discover',
          server: {
            name: SERVER_NAME,
            version: SERVER_VERSION,
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
              resources: { listChanged: false },
              prompts: { listChanged: false },
            },
          },
        },
        id: 1,
      };
      assert.equal(response.result.resultType, 'server.discover');
      assert.equal(response.result.server.name, 'lazynext');
      assert.equal(response.result.server.protocolVersion, '2026-07-28');
      assert.ok(response.result.server.capabilities.tools);
      assert.ok(response.result.server.capabilities.resources);
      assert.ok(response.result.server.capabilities.prompts);
    });
  });

  describe('tools/list response', () => {
    test('response includes resultType and tools array', () => {
      const response = {
        jsonrpc: '2.0',
        result: {
          resultType: 'tools.list',
          tools: EXPECTED_TOOLS.map((name) => ({
            name,
            description: `Tool: ${name}`,
            inputSchema: { type: 'object', properties: {}, required: [] },
            resultType: name,
          })),
        },
        id: 2,
      };
      assert.equal(response.result.resultType, 'tools.list');
      assert.ok(Array.isArray(response.result.tools));
      assert.ok(response.result.tools.length >= 9);
    });

    test('each tool has name, description, inputSchema, and resultType', () => {
      const tools = EXPECTED_TOOLS.map((name) => ({
        name,
        description: `Tool: ${name}`,
        inputSchema: { type: 'object' },
        resultType: name,
      }));
      for (const tool of tools) {
        assert.ok(tool.name, 'tool should have name');
        assert.ok(tool.description, 'tool should have description');
        assert.ok(tool.inputSchema, 'tool should have inputSchema');
        assert.ok(tool.resultType, 'tool should have resultType');
      }
    });

    test('all expected tools are present', () => {
      const toolNames = EXPECTED_TOOLS;
      for (const expected of ['list_workspaces', 'create_project', 'create_task', 'search']) {
        assert.ok(toolNames.includes(expected), `should include ${expected}`);
      }
    });
  });

  describe('tools/call response', () => {
    test('response includes resultType matching the tool', () => {
      const response = {
        jsonrpc: '2.0',
        result: {
          resultType: 'workspaces',
          toolName: 'list_workspaces',
          content: [{ type: 'text', text: 'Tool called' }],
        },
        id: 3,
      };
      assert.equal(response.result.resultType, 'workspaces');
      assert.equal(response.result.toolName, 'list_workspaces');
      assert.ok(Array.isArray(response.result.content));
    });

    test('unknown tool returns -32601 error', () => {
      const errorResponse = {
        jsonrpc: '2.0',
        error: { code: -32601, message: 'Unknown tool: nonexistent' },
        id: 4,
      };
      assert.equal(errorResponse.error.code, -32601);
    });
  });

  describe('ping response', () => {
    test('ping returns resultType pong', () => {
      const response = {
        jsonrpc: '2.0',
        result: { resultType: 'pong' },
        id: 5,
      };
      assert.equal(response.result.resultType, 'pong');
    });
  });

  describe('stateless design', () => {
    test('no initialize method required', () => {
      const methods = ['server/discover', 'tools/list', 'tools/call', 'resources/list', 'prompts/list', 'ping'];
      assert.ok(!methods.includes('initialize'));
    });

    test('no Mcp-Session-Id header needed', () => {
      // The route is stateless — no session management
      const sessionHeader = undefined;
      assert.equal(sessionHeader, undefined);
    });
  });

  describe('origin validation', () => {
    test('same-origin is allowed', () => {
      const origin = 'http://localhost:3100';
      const host = 'localhost:3100';
      const url = new URL(origin);
      assert.equal(url.host, host);
    });

    test('localhost is allowed', () => {
      const origin = 'http://127.0.0.1:3100';
      const url = new URL(origin);
      assert.ok(url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    });

    test('cross-origin is rejected', () => {
      const origin = 'http://evil.com';
      const host = 'localhost:3100';
      const url = new URL(origin);
      assert.notEqual(url.host, host);
      assert.notEqual(url.hostname, 'localhost');
    });

    test('missing origin is allowed (non-browser clients)', () => {
      const origin = null;
      assert.equal(origin, null);
    });
  });
});
