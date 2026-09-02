import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CREATIVE_TOOL_COSTS,
  registerTool,
  getTool,
  listTools,
  listToolNames,
  validateAgainstSchema,
  type CreativeTool,
  type JsonSchema,
  type ToolContext,
  type ToolResult,
  type ToolCapability,
} from '@/lib/creative/tools';

// ── CREATIVE_TOOL_COSTS ──

test('CREATIVE_TOOL_COSTS has expected keys', () => {
  assert.ok('brief' in CREATIVE_TOOL_COSTS);
  assert.ok('hooks' in CREATIVE_TOOL_COSTS);
  assert.ok('angles' in CREATIVE_TOOL_COSTS);
  assert.ok('script' in CREATIVE_TOOL_COSTS);
  assert.ok('storyboard' in CREATIVE_TOOL_COSTS);
  assert.ok('score' in CREATIVE_TOOL_COSTS);
  assert.ok('variants' in CREATIVE_TOOL_COSTS);
});

test('CREATIVE_TOOL_COSTS values are positive integers', () => {
  for (const [key, val] of Object.entries(CREATIVE_TOOL_COSTS)) {
    assert.ok(typeof val === 'number', `${key} should be a number`);
    assert.ok(val > 0, `${key} should be positive`);
    assert.ok(Number.isInteger(val), `${key} should be an integer`);
  }
});

// ── Tool registry ──

test('getTool returns undefined for unregistered tool', () => {
  assert.equal(getTool('creative.nonexistent'), undefined);
});

test('registerTool and getTool work round-trip', () => {
  const tool: CreativeTool = {
    name: 'creative.test-tool-' + Date.now(),
    description: 'Test tool',
    inputSchema: { type: 'object', required: ['x'] },
    outputSchema: { type: 'object' },
    cost: 1,
    capabilities: ['text'],
  };
  registerTool(tool);
  const retrieved = getTool(tool.name);
  assert.ok(retrieved);
  assert.equal(retrieved!.name, tool.name);
  assert.equal(retrieved!.cost, 1);
});

test('registerTool throws on duplicate name', () => {
  const name = 'creative.duplicate-' + Date.now();
  const tool: CreativeTool = {
    name,
    description: 'First',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    cost: 1,
    capabilities: ['text'],
  };
  registerTool(tool);
  assert.throws(() => registerTool(tool), /already registered/);
});

test('listTools returns array of tools', () => {
  const tools = listTools();
  assert.ok(Array.isArray(tools));
});

test('listToolNames returns array of strings', () => {
  const names = listToolNames();
  assert.ok(Array.isArray(names));
  for (const n of names) assert.equal(typeof n, 'string');
});

// ── validateAgainstSchema ──

test('validateAgainstSchema accepts valid object', () => {
  const schema: JsonSchema = { type: 'object', required: ['name'] };
  const errors = validateAgainstSchema({ name: 'test' }, schema);
  assert.equal(errors.length, 0);
});

test('validateAgainstSchema rejects missing required field', () => {
  const schema: JsonSchema = { type: 'object', required: ['name'] };
  const errors = validateAgainstSchema({}, schema);
  assert.ok(errors.length > 0);
  assert.ok(errors[0].includes('name'));
});

test('validateAgainstSchema rejects wrong type', () => {
  const schema: JsonSchema = { type: 'object' };
  const errors = validateAgainstSchema('not-object', schema);
  assert.ok(errors.length > 0);
  assert.ok(errors[0].includes('object'));
});

test('validateAgainstSchema rejects non-array for array type', () => {
  const schema: JsonSchema = { type: 'array', items: { type: 'string' } };
  const errors = validateAgainstSchema('not-array', schema);
  assert.ok(errors.length > 0);
  assert.ok(errors[0].includes('array'));
});

test('validateAgainstSchema validates array items', () => {
  const schema: JsonSchema = { type: 'array', items: { type: 'string' } };
  const errors = validateAgainstSchema([1, 2, 3], schema);
  assert.ok(errors.length > 0);
});

test('validateAgainstSchema validates string enum', () => {
  const schema: JsonSchema = { type: 'string', enum: ['a', 'b', 'c'] };
  assert.equal(validateAgainstSchema('a', schema).length, 0);
  assert.ok(validateAgainstSchema('d', schema).length > 0);
});

test('validateAgainstSchema validates number type', () => {
  const schema: JsonSchema = { type: 'number' };
  assert.equal(validateAgainstSchema(42, schema).length, 0);
  assert.ok(validateAgainstSchema('42', schema).length > 0);
});

test('validateAgainstSchema validates integer type', () => {
  const schema: JsonSchema = { type: 'integer' };
  assert.equal(validateAgainstSchema(42, schema).length, 0);
  assert.ok(validateAgainstSchema(3.14, schema).length > 0);
});

// ── Type shape tests ──

test('ToolContext accepts valid shape', () => {
  const ctx: ToolContext = {
    userId: 'user-1',
    credits: 100,
    model: 'gpt-4',
    language: 'en',
  };
  assert.equal(ctx.userId, 'user-1');
});

test('ToolResult accepts success shape', () => {
  const result: ToolResult<string> = {
    tool: 'creative.test',
    ok: true,
    output: 'success',
    cost: 3,
  };
  assert.equal(result.ok, true);
  assert.equal(result.output, 'success');
  assert.equal(result.cost, 3);
});

test('ToolResult accepts error shape', () => {
  const result: ToolResult = {
    tool: 'creative.test',
    ok: false,
    error: 'Something went wrong',
    cost: 0,
  };
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Something went wrong');
  assert.equal(result.cost, 0);
});

test('ToolCapability type accepts valid values', () => {
  const caps: ToolCapability[] = ['text', 'reasoning', 'vision'];
  assert.equal(caps.length, 3);
});
