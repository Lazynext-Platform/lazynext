/**
 * Creative MCP Server.
 *
 * Exposes LazyNext's creative tools as a standards-compliant Model Context
 * Protocol (MCP) server interface. External agents (Claude, Cursor, etc.)
 * can discover and invoke LazyNext creative operations via MCP transport.
 *
 * Inspired by adsturbo-creative-mcp (#37) and meta-ads-mcp (#29) —
 * adapted for LazyNext's existing tool registry in tools.ts.
 *
 * This module provides the MCP protocol layer (tools/list, tools/call,
 * resources/list, resources/read) that wraps the existing CreativeTool
 * registry. The actual HTTP/SSE transport is handled by the API route.
 */
import {
  listTools,
  listToolNames,
  getTool,
  validateAgainstSchema,
  type CreativeTool,
  type JsonSchema,
} from '@/lib/creative/tools';
import { CREATIVE_TOOL_COSTS } from '@/lib/creative/tools';

export const MCP_SERVER_COST = 0; // Discovery is free; execution costs are per-tool

// ── MCP Protocol Types ──

export type MCPMethod = 'initialize' | 'tools/list' | 'tools/call' | 'resources/list' | 'resources/read' | 'ping';

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: MCPMethod;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: {
    cost: number;
    capabilities: string[];
    category: string;
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools: { listChanged: boolean };
    resources: { listChanged: boolean };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPToolsListResult {
  tools: MCPToolDefinition[];
}

export interface MCPToolsCallResult {
  content: Array<{
    type: 'text' | 'json';
    text?: string;
    json?: unknown;
  }>;
  isError: boolean;
}

// ── MCP Error Codes ──

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TOOL_NOT_FOUND: -32001,
  TOOL_EXECUTION_FAILED: -32002,
  VALIDATION_ERROR: -32003,
  UNAUTHORIZED: -32004,
} as const;

// ── Server Info ──

export const MCP_SERVER_INFO = {
  name: 'lazynext-creative',
  version: '1.0.0',
  protocolVersion: '2024-11-05',
} as const;

// ── Tool categories for annotation ──

export type ToolCategory = 'generation' | 'analysis' | 'scoring' | 'variant' | 'refinement';

export function getToolCategory(toolName: string): ToolCategory {
  if (toolName.includes('generate') || toolName.includes('brief') || toolName.includes('hook') || toolName.includes('angle') || toolName.includes('script') || toolName.includes('storyboard')) return 'generation';
  if (toolName.includes('analyze') || toolName.includes('reference')) return 'analysis';
  if (toolName.includes('score')) return 'scoring';
  if (toolName.includes('variant') || toolName.includes('remix')) return 'variant';
  if (toolName.includes('refine')) return 'refinement';
  return 'generation';
}

// ── Convert internal tool to MCP definition ──

export function toMCPToolDefinition(tool: CreativeTool): MCPToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    annotations: {
      cost: tool.cost,
      capabilities: tool.capabilities,
      category: getToolCategory(tool.name),
    },
  };
}

// ── List available resources ──

export function listResources(): MCPResource[] {
  return [
    {
      uri: 'lazynext://tools/catalog',
      name: 'Creative Tools Catalog',
      description: 'Complete catalog of all available creative tools with schemas and costs',
      mimeType: 'application/json',
    },
    {
      uri: 'lazynext://tools/categories',
      name: 'Tool Categories',
      description: 'All tool categories and their member tools',
      mimeType: 'application/json',
    },
    {
      uri: 'lazynext://tools/costs',
      name: 'Tool Costs',
      description: 'Credit costs for each creative operation',
      mimeType: 'application/json',
    },
    {
      uri: 'lazynext://capabilities',
      name: 'Server Capabilities',
      description: 'Server capabilities and supported protocol features',
      mimeType: 'application/json',
    },
  ];
}

// ── Read a resource by URI ──

export function readResource(uri: string): { content: unknown } | null {
  switch (uri) {
    case 'lazynext://tools/catalog':
      return { content: listTools().map(toMCPToolDefinition) };
    case 'lazynext://tools/categories': {
      const categories: Record<string, string[]> = {};
      for (const name of listToolNames()) {
        const cat = getToolCategory(name);
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(name);
      }
      return { content: categories };
    }
    case 'lazynext://tools/costs':
      return { content: CREATIVE_TOOL_COSTS };
    case 'lazynext://capabilities':
      return {
        content: {
          protocolVersion: MCP_SERVER_INFO.protocolVersion,
          capabilities: {
            tools: { listChanged: true },
            resources: { listChanged: true },
          },
          serverInfo: MCP_SERVER_INFO,
        },
      };
    default:
      return null;
  }
}

// ── Validate MCP request ──

export function validateMCPRequest(request: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request || typeof request !== 'object') {
    errors.push('Request must be an object');
    return { valid: false, errors };
  }
  const r = request as Record<string, unknown>;
  if (r.jsonrpc !== '2.0') errors.push('jsonrpc must be "2.0"');
  if (typeof r.id !== 'string' && typeof r.id !== 'number') errors.push('id must be string or number');
  if (typeof r.method !== 'string') errors.push('method must be a string');
  const validMethods: MCPMethod[] = ['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read', 'ping'];
  if (typeof r.method === 'string' && !validMethods.includes(r.method as MCPMethod)) {
    errors.push(`method must be one of: ${validMethods.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

// ── Handle MCP request ──

export function handleMCPRequest(request: MCPRequest): MCPResponse {
  switch (request.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: MCP_SERVER_INFO.protocolVersion,
          capabilities: {
            tools: { listChanged: true },
            resources: { listChanged: true },
          },
          serverInfo: {
            name: MCP_SERVER_INFO.name,
            version: MCP_SERVER_INFO.version,
          },
        } as MCPInitializeResult,
      };

    case 'ping':
      return { jsonrpc: '2.0', id: request.id, result: {} };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: { tools: listTools().map(toMCPToolDefinition) } as MCPToolsListResult,
      };

    case 'tools/call': {
      const params = request.params || {};
      const toolName = params.name as string;
      const toolArgs = params.arguments as Record<string, unknown> | undefined;
      const tool = getTool(toolName);
      if (!tool) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: MCP_ERROR_CODES.TOOL_NOT_FOUND, message: `Tool not found: ${toolName}` },
        };
      }
      // Validate input against schema
      const validationErrors = validateAgainstSchema(toolArgs || {}, tool.inputSchema);
      if (validationErrors.length > 0) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: MCP_ERROR_CODES.VALIDATION_ERROR,
            message: `Input validation failed: ${validationErrors.join('; ')}`,
            data: validationErrors,
          },
        };
      }
      // Note: actual execution requires auth + credits, handled by the route layer
      // This returns a "ready to execute" response; the route will call executeTool
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          toolName,
          cost: tool.cost,
          capabilities: tool.capabilities,
          inputValidated: true,
          message: 'Tool is ready to execute. Route layer will handle auth, credits, and execution.',
        },
      };
    }

    case 'resources/list':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: { resources: listResources() },
      };

    case 'resources/read': {
      const params = request.params || {};
      const uri = params.uri as string;
      const resource = readResource(uri);
      if (!resource) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: MCP_ERROR_CODES.INVALID_PARAMS, message: `Resource not found: ${uri}` },
        };
      }
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(resource.content, null, 2),
            },
          ],
        },
      };
    }

    default:
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: MCP_ERROR_CODES.METHOD_NOT_FOUND, message: `Method not found: ${request.method}` },
      };
  }
}

// ── Batch handle multiple requests ──

export function handleMCPBatch(requests: MCPRequest[]): MCPResponse[] {
  return requests.map(handleMCPRequest);
}

// ── Get server manifest (for documentation) ──

export function getServerManifest(): {
  server: typeof MCP_SERVER_INFO;
  tools: MCPToolDefinition[];
  resources: MCPResource[];
  toolCount: number;
  resourceCount: number;
} {
  return {
    server: MCP_SERVER_INFO,
    tools: listTools().map(toMCPToolDefinition),
    resources: listResources(),
    toolCount: listTools().length,
    resourceCount: listResources().length,
  };
}
