import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MCP_SERVER_COST,
  MCP_SERVER_INFO,
  MCP_ERROR_CODES,
  listResources,
  readResource,
  validateMCPRequest,
  handleMCPRequest,
  handleMCPBatch,
  getServerManifest,
  getToolCategory,
  toMCPToolDefinition,
  type MCPRequest,
  type MCPMethod,
} from '../src/lib/creative/mcp-server.ts';

describe('mcp-server', () => {
  describe('constants', () => {
    test('MCP_SERVER_COST is 0', () => { assert.equal(MCP_SERVER_COST, 0); });
    test('server info has name', () => { assert.ok(MCP_SERVER_INFO.name); });
    test('server info has version', () => { assert.ok(MCP_SERVER_INFO.version); });
    test('server info has protocolVersion', () => { assert.ok(MCP_SERVER_INFO.protocolVersion); });
    test('error codes defined', () => {
      assert.equal(MCP_ERROR_CODES.PARSE_ERROR, -32700);
      assert.equal(MCP_ERROR_CODES.METHOD_NOT_FOUND, -32601);
      assert.equal(MCP_ERROR_CODES.TOOL_NOT_FOUND, -32001);
    });
  });

  describe('type completeness', () => {
    test('MCPMethod has 6 methods', () => {
      const methods: MCPMethod[] = ['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read', 'ping'];
      assert.equal(methods.length, 6);
    });
  });

  describe('listResources', () => {
    test('returns resources', () => {
      const resources = listResources();
      assert.ok(resources.length >= 4);
      assert.ok(resources.every((r) => r.uri && r.name && r.mimeType));
    });
  });

  describe('readResource', () => {
    test('tools/catalog returns content', () => {
      const r = readResource('lazynext://tools/catalog');
      assert.ok(r);
      assert.ok(Array.isArray(r!.content));
    });
    test('tools/costs returns content', () => {
      const r = readResource('lazynext://tools/costs');
      assert.ok(r);
      assert.ok(typeof r!.content === 'object');
    });
    test('capabilities returns content', () => {
      const r = readResource('lazynext://capabilities');
      assert.ok(r);
    });
    test('unknown URI returns null', () => {
      assert.equal(readResource('lazynext://unknown'), null);
    });
  });

  describe('validateMCPRequest', () => {
    test('valid request passes', () => {
      const r = validateMCPRequest({ jsonrpc: '2.0', id: 1, method: 'ping' });
      assert.ok(r.valid);
    });
    test('missing jsonrpc fails', () => {
      const r = validateMCPRequest({ id: 1, method: 'ping' });
      assert.ok(!r.valid);
    });
    test('invalid method fails', () => {
      const r = validateMCPRequest({ jsonrpc: '2.0', id: 1, method: 'unknown' });
      assert.ok(!r.valid);
    });
  });

  describe('handleMCPRequest', () => {
    test('initialize returns server info', () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 1, method: 'initialize' };
      const res = handleMCPRequest(req);
      assert.ok(res.result);
      assert.equal(res.jsonrpc, '2.0');
    });

    test('ping returns empty result', () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 2, method: 'ping' };
      const res = handleMCPRequest(req);
      assert.ok(res.result);
    });

    test('tools/list returns tools array', () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 3, method: 'tools/list' };
      const res = handleMCPRequest(req);
      assert.ok(res.result);
      const result = res.result as { tools: unknown[] };
      assert.ok(Array.isArray(result.tools));
      assert.ok(result.tools.length > 0);
    });

    test('resources/list returns resources', () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 4, method: 'resources/list' };
      const res = handleMCPRequest(req);
      assert.ok(res.result);
    });

    test('resources/read returns content', () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 5, method: 'resources/read', params: { uri: 'lazynext://tools/costs' } };
      const res = handleMCPRequest(req);
      assert.ok(res.result);
    });

    test('resources/read unknown returns error', () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 6, method: 'resources/read', params: { uri: 'lazynext://unknown' } };
      const res = handleMCPRequest(req);
      assert.ok(res.error);
    });

    test('tools/call unknown tool returns error', () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'nonexistent', arguments: {} } };
      const res = handleMCPRequest(req);
      assert.ok(res.error);
    });

    test('tools/call valid tool returns ready response', () => {
      const req: MCPRequest = { jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'creative.generateBrief', arguments: { product: 'test product' } } };
      const res = handleMCPRequest(req);
      assert.ok(res.result);
    });
  });

  describe('handleMCPBatch', () => {
    test('handles multiple requests', () => {
      const requests: MCPRequest[] = [
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      ];
      const responses = handleMCPBatch(requests);
      assert.equal(responses.length, 2);
    });
  });

  describe('getServerManifest', () => {
    test('returns manifest with tools and resources', () => {
      const m = getServerManifest();
      assert.ok(m.server);
      assert.ok(m.tools.length > 0);
      assert.ok(m.resources.length > 0);
      assert.ok(m.toolCount > 0);
      assert.ok(m.resourceCount > 0);
    });
  });

  describe('getToolCategory', () => {
    test('generateBrief = generation', () => {
      assert.equal(getToolCategory('creative.generateBrief'), 'generation');
    });
    test('analyzeReference = analysis', () => {
      assert.equal(getToolCategory('creative.analyzeReference'), 'analysis');
    });
    test('scoreCombination = scoring', () => {
      assert.equal(getToolCategory('creative.scoreCombination'), 'scoring');
    });
    test('remix = variant', () => {
      assert.equal(getToolCategory('creative.remix'), 'variant');
    });
  });
});
