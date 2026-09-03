import { NextRequest, NextResponse } from 'next/server';

/**
 * MCP (Model Context Protocol) endpoint — 2026-07-28 protocol.
 *
 * Key protocol requirements implemented:
 * - Stateless core: no initialize/handshake, no Mcp-Session-Id
 * - Every request carries _meta with protocolVersion + clientCapabilities
 * - io.modelcontextprotocol/protocolVersion is required
 * - server/discover is required
 * - Streamable HTTP: single POST endpoint, Accept: application/json, text/event-stream
 * - Notifications receive 202 Accepted (no body)
 * - Results include resultType
 * - Origin validation for DNS rebinding prevention
 * - OAuth 2.1 protected-resource metadata at /.well-known/oauth-protected-resource
 */

const PROTOCOL_VERSION = '2026-07-28';
const SERVER_NAME = 'lazynext';
const SERVER_VERSION = '1.0.0';

// ── Tool definitions ──

const TOOLS = [
  {
    name: 'list_workspaces',
    description: 'List all workspaces the authenticated user is a member of.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    resultType: 'workspaces',
  },
  {
    name: 'get_workspace',
    description: 'Get details of a specific workspace.',
    inputSchema: {
      type: 'object',
      properties: { workspaceId: { type: 'string', description: 'Workspace ID' } },
      required: ['workspaceId'],
    },
    resultType: 'workspace',
  },
  {
    name: 'list_projects',
    description: 'List projects in a workspace.',
    inputSchema: {
      type: 'object',
      properties: { workspaceId: { type: 'string' } },
      required: ['workspaceId'],
    },
    resultType: 'projects',
  },
  {
    name: 'create_project',
    description: 'Create a new project in a workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['workspaceId', 'name'],
    },
    resultType: 'project',
  },
  {
    name: 'list_tasks',
    description: 'List tasks in a project.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
    resultType: 'tasks',
  },
  {
    name: 'create_task',
    description: 'Create a new task in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
      },
      required: ['projectId', 'title'],
    },
    resultType: 'task',
  },
  {
    name: 'list_documents',
    description: 'List documents in a workspace.',
    inputSchema: {
      type: 'object',
      properties: { workspaceId: { type: 'string' } },
      required: ['workspaceId'],
    },
    resultType: 'documents',
  },
  {
    name: 'get_document',
    description: 'Get a document by ID.',
    inputSchema: {
      type: 'object',
      properties: { documentId: { type: 'string' } },
      required: ['documentId'],
    },
    resultType: 'document',
  },
  {
    name: 'search',
    description: 'Search across projects, tasks, documents, and creative work.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    resultType: 'search_results',
  },
];

// ── Origin validation ──

function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) return true; // Non-browser clients may not send Origin
  try {
    const url = new URL(origin);
    // Allow same-origin and localhost
    if (url.host === host) return true;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}

// ── Protocol version check ──

function checkProtocolVersion(meta: Record<string, unknown> | undefined): string | null {
  const version = meta?.['io.modelcontextprotocol/protocolVersion'] as string | undefined;
  if (!version) return 'Missing io.modelcontextprotocol/protocolVersion in _meta';
  if (version !== PROTOCOL_VERSION) {
    return `Unsupported protocol version: ${version}. Expected: ${PROTOCOL_VERSION}`;
  }
  return null;
}

// ── POST handler ──

export async function POST(req: NextRequest) {
  // Origin validation (DNS rebinding prevention)
  if (!validateOrigin(req)) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid origin' }, id: null },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
      { status: 400 },
    );
  }

  const { jsonrpc, id, method, params, _meta } = body;

  // Validate JSON-RPC 2.0
  if (jsonrpc !== '2.0') {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' }, id: id ?? null },
      { status: 400 },
    );
  }

  // Notifications (no id) → 202 Accepted, no body
  if (id === undefined || id === null) {
    return new NextResponse(null, { status: 202 });
  }

  // Check protocol version for requests (not notifications)
  const versionError = checkProtocolVersion(_meta);
  if (versionError) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'UnsupportedProtocolVersionError', data: versionError },
        id,
      },
      { status: 400 },
    );
  }

  // ── Handle methods ──

  switch (method) {
    case 'server/discover': {
      return NextResponse.json({
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
            metadata: {
              description: 'Lazynext operating system MCP server',
              documentation: 'https://lazynext.com/docs/mcp',
            },
          },
        },
        id,
      });
    }

    case 'tools/list': {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          resultType: 'tools.list',
          tools: TOOLS,
        },
        id,
      });
    }

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find((t) => t.name === toolName);
      if (!tool) {
        return NextResponse.json({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Unknown tool: ${toolName}` },
          id,
        }, { status: 400 });
      }

      // In a full implementation, this would call the actual tool.
      // For now, return a structured placeholder that indicates the tool was recognized.
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          resultType: tool.resultType,
          toolName,
          args: toolArgs,
          content: [
            {
              type: 'text',
              text: `Tool "${toolName}" was called. Authentication and execution will be wired in the next sub-phase.`,
            },
          ],
        },
        id,
      });
    }

    case 'resources/list': {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          resultType: 'resources.list',
          resources: [
            { uri: 'lazynext://workspaces', name: 'Workspaces', description: 'List of accessible workspaces' },
            { uri: 'lazynext://projects', name: 'Projects', description: 'List of accessible projects' },
          ],
        },
        id,
      });
    }

    case 'prompts/list': {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          resultType: 'prompts.list',
          prompts: [],
        },
        id,
      });
    }

    case 'ping': {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: { resultType: 'pong' },
        id,
      });
    }

    default: {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id,
      }, { status: 400 });
    }
  }
}

// ── GET handler: return server metadata ──

export async function GET() {
  return NextResponse.json({
    server: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      protocolVersion: PROTOCOL_VERSION,
    },
    endpoint: '/mcp',
    transports: ['streamable-http'],
    authentication: '/.well-known/oauth-protected-resource',
  });
}

// ── DELETE handler: not used in stateless protocol ──

export async function DELETE() {
  return NextResponse.json(
    { error: 'Stateless protocol: session deletion not applicable' },
    { status: 405 },
  );
}
