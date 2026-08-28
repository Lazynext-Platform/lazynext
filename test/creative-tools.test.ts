import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the MCP-style creative operation contracts.
 *
 * Tests the tool registry definitions only — does NOT import from
 * src/lib/creative/intelligence.ts (which has relative extensionless imports
 * that break the Node test runner). Instead imports from the self-contained
 * tools.ts which defines schemas inline.
 */
import {
  registerTool,
  getTool,
  listTools,
  listToolNames,
  executeTool,
  validateAgainstSchema,
  CREATIVE_TOOL_COSTS,
  type CreativeTool,
} from '@/lib/creative/tools';

// ── Expected tool names ──

const EXPECTED_TOOLS = [
  'creative.generateBrief',
  'creative.generateHooks',
  'creative.generateAngles',
  'creative.generateScript',
  'creative.generateStoryboard',
  'creative.scoreCombination',
  'creative.generateVariants',
  'creative.refine',
  'creative.remix',
  'creative.analyzeReference',
];

// ── Registration tests ──

test('all expected creative tools are registered', () => {
  const names = listToolNames();
  for (const name of EXPECTED_TOOLS) {
    assert.ok(names.includes(name), `expected tool "${name}" to be registered`);
  }
});

test('exactly 10 creative tools are registered', () => {
  assert.equal(listTools().length, 10);
});

test('getTool returns undefined for unknown tools', () => {
  assert.equal(getTool('creative.nonexistent'), undefined);
  assert.equal(getTool(''), undefined);
  assert.equal(getTool('not-a-creative-tool'), undefined);
});

test('listTools returns all registered tools', () => {
  const tools = listTools();
  assert.equal(tools.length, EXPECTED_TOOLS.length);
  for (const tool of tools) {
    assert.ok(EXPECTED_TOOLS.includes(tool.name), `unexpected tool: ${tool.name}`);
  }
});

test('listToolNames returns all registered tool names', () => {
  const names = listToolNames();
  assert.equal(names.length, EXPECTED_TOOLS.length);
  for (const name of names) {
    assert.ok(EXPECTED_TOOLS.includes(name), `unexpected tool name: ${name}`);
  }
});

// ── Tool shape tests ──

test('each tool has a name, description, inputSchema, outputSchema, and cost', () => {
  for (const tool of listTools()) {
    assert.ok(tool.name, 'tool should have a name');
    assert.ok(tool.description, `${tool.name} should have a description`);
    assert.ok(tool.inputSchema, `${tool.name} should have an inputSchema`);
    assert.ok(tool.outputSchema, `${tool.name} should have an outputSchema`);
    assert.ok(typeof tool.cost === 'number', `${tool.name} cost should be a number`);
    assert.ok(tool.cost > 0, `${tool.name} cost should be positive, got ${tool.cost}`);
  }
});

test('each tool has required capabilities array', () => {
  for (const tool of listTools()) {
    assert.ok(Array.isArray(tool.capabilities), `${tool.name} should have capabilities array`);
    assert.ok(tool.capabilities.length > 0, `${tool.name} should have at least one capability`);
    for (const cap of tool.capabilities) {
      assert.ok(
        ['text', 'reasoning', 'vision'].includes(cap),
        `${tool.name} has invalid capability: ${cap}`,
      );
    }
  }
});

test('all creative tools require text capability', () => {
  for (const tool of listTools()) {
    assert.ok(
      tool.capabilities.includes('text'),
      `${tool.name} should require 'text' capability`,
    );
  }
});

test('all creative tools require reasoning capability', () => {
  for (const tool of listTools()) {
    assert.ok(
      tool.capabilities.includes('reasoning'),
      `${tool.name} should require 'reasoning' capability`,
    );
  }
});

// ── Naming convention tests ──

test('all tool names follow the creative.* convention', () => {
  for (const tool of listTools()) {
    assert.ok(
      tool.name.startsWith('creative.'),
      `${tool.name} should follow the creative.* naming convention`,
    );
  }
});

test('no duplicate tool names are registered', () => {
  const names = listToolNames();
  const unique = new Set(names);
  assert.equal(names.length, unique.size, 'there should be no duplicate tool names');
});

// ── Cost tests ──

test('tool costs match CREATIVE_TOOL_COSTS', () => {
  const costMap: Record<string, number> = {
    'creative.generateBrief': CREATIVE_TOOL_COSTS.brief,
    'creative.generateHooks': CREATIVE_TOOL_COSTS.hooks,
    'creative.generateAngles': CREATIVE_TOOL_COSTS.angles,
    'creative.generateScript': CREATIVE_TOOL_COSTS.script,
    'creative.generateStoryboard': CREATIVE_TOOL_COSTS.storyboard,
    'creative.scoreCombination': CREATIVE_TOOL_COSTS.score,
    'creative.generateVariants': CREATIVE_TOOL_COSTS.variants,
    'creative.refine': CREATIVE_TOOL_COSTS.refine,
    'creative.remix': CREATIVE_TOOL_COSTS.remix,
    'creative.analyzeReference': CREATIVE_TOOL_COSTS.referenceAnalysis,
  };

  for (const [name, expectedCost] of Object.entries(costMap)) {
    const tool = getTool(name);
    assert.ok(tool, `${name} should be registered`);
    assert.equal(tool!.cost, expectedCost, `${name} cost should be ${expectedCost}`);
  }
});

test('all credit costs are positive integers', () => {
  for (const cost of Object.values(CREATIVE_TOOL_COSTS)) {
    assert.ok(cost > 0, `cost should be positive, got ${cost}`);
    assert.ok(Number.isInteger(cost), `cost should be an integer, got ${cost}`);
  }
});

test('reference analysis is the most expensive tool', () => {
  const analyzeTool = getTool('creative.analyzeReference');
  assert.ok(analyzeTool, 'analyzeReference should be registered');
  const maxCost = Math.max(...listTools().map((t) => t.cost));
  assert.equal(analyzeTool!.cost, maxCost, 'analyzeReference should have the highest cost');
});

// ── Schema tests ──

test('input schemas are all objects', () => {
  for (const tool of listTools()) {
    assert.equal(
      tool.inputSchema.type,
      'object',
      `${tool.name} inputSchema should be type "object"`,
    );
  }
});

test('output schemas have a defined type', () => {
  for (const tool of listTools()) {
    assert.ok(
      tool.outputSchema.type,
      `${tool.name} outputSchema should have a type`,
    );
  }
});

test('generateBrief input schema requires product', () => {
  const tool = getTool('creative.generateBrief');
  assert.ok(tool);
  assert.ok(tool!.inputSchema.required?.includes('product'));
});

test('generateHooks input schema requires brief', () => {
  const tool = getTool('creative.generateHooks');
  assert.ok(tool);
  assert.ok(tool!.inputSchema.required?.includes('brief'));
});

test('generateScript input schema requires brief, angle, and hook', () => {
  const tool = getTool('creative.generateScript');
  assert.ok(tool);
  const required = tool!.inputSchema.required ?? [];
  assert.ok(required.includes('brief'));
  assert.ok(required.includes('angle'));
  assert.ok(required.includes('hook'));
});

test('refine input schema requires type, instruction, brief, and element', () => {
  const tool = getTool('creative.refine');
  assert.ok(tool);
  const required = tool!.inputSchema.required ?? [];
  assert.ok(required.includes('type'));
  assert.ok(required.includes('instruction'));
  assert.ok(required.includes('brief'));
  assert.ok(required.includes('element'));
});

test('analyzeReference input schema requires sourceUrl', () => {
  const tool = getTool('creative.analyzeReference');
  assert.ok(tool);
  assert.ok(tool!.inputSchema.required?.includes('sourceUrl'));
});

test('remix input schema requires analysis and product', () => {
  const tool = getTool('creative.remix');
  assert.ok(tool);
  const required = tool!.inputSchema.required ?? [];
  assert.ok(required.includes('analysis'));
  assert.ok(required.includes('product'));
});

// ── Validation tests ──

test('validateAgainstSchema accepts valid object input', () => {
  const errors = validateAgainstSchema(
    { product: 'A widget', productName: 'Widget' },
    {
      type: 'object',
      required: ['product'],
      properties: { product: { type: 'string' }, productName: { type: 'string' } },
    },
  );
  assert.equal(errors.length, 0);
});

test('validateAgainstSchema rejects missing required field', () => {
  const errors = validateAgainstSchema(
    { productName: 'Widget' },
    {
      type: 'object',
      required: ['product'],
      properties: { product: { type: 'string' } },
    },
  );
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes('product')));
});

test('validateAgainstSchema rejects wrong type', () => {
  const errors = validateAgainstSchema(
    { product: 123 },
    {
      type: 'object',
      required: ['product'],
      properties: { product: { type: 'string' } },
    },
  );
  assert.ok(errors.length > 0);
});

test('validateAgainstSchema validates enum values', () => {
  const errors = validateAgainstSchema('invalid', {
    type: 'string',
    enum: ['brief', 'hook', 'angle', 'script'],
  });
  assert.ok(errors.length > 0);
});

test('validateAgainstSchema validates number ranges', () => {
  const errors = validateAgainstSchema(15, { type: 'integer', minimum: 1, maximum: 10 });
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes('10')));
});

// ── Execution tests ──

test('executeTool returns error for unknown tool', async () => {
  const result = await executeTool('creative.nonexistent', {});
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes('unknown tool'));
  assert.equal(result.cost, 0);
});

test('executeTool validates input before execution', async () => {
  // generateBrief requires 'product' — pass empty object
  const result = await executeTool('creative.generateBrief', {});
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes('validation'));
  assert.equal(result.cost, 0);
});

test('executeTool returns contract-only error when execute is not wired up', async () => {
  // Pass valid input — tool has no execute function (contract only)
  const result = await executeTool('creative.generateBrief', { product: 'A widget' });
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes('no execute function') || result.error?.includes('contract'));
  assert.equal(result.cost, 0);
});

test('executeTool accepts valid input for generateBrief', async () => {
  // Should pass validation (even though execute is not wired up)
  const result = await executeTool('creative.generateBrief', {
    product: 'A widget',
    productName: 'Widget',
    platform: 'tiktok',
  });
  // Validation passes, but no execute function → contract-only error
  assert.equal(result.ok, false);
  assert.ok(!result.error?.includes('validation'), 'should not fail validation');
});

// ── Registry mutation tests ──

test('registerTool throws on duplicate name', () => {
  assert.throws(
    () => registerTool({
      name: 'creative.generateBrief',
      description: 'duplicate',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      cost: 1,
      capabilities: ['text'],
    }),
    /already registered/,
  );
});

test('registerTool can register a new custom tool', () => {
  const customTool: CreativeTool = {
    name: 'creative.customTest',
    description: 'A custom test tool',
    inputSchema: { type: 'object', required: ['input'] },
    outputSchema: { type: 'object' },
    cost: 1,
    capabilities: ['text'],
  };
  registerTool(customTool);
  const retrieved = getTool('creative.customTest');
  assert.ok(retrieved);
  assert.equal(retrieved!.name, 'creative.customTest');
  assert.equal(retrieved!.cost, 1);
});
