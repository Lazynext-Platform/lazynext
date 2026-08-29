import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  handleMCPRequest,
  handleMCPBatch,
  validateMCPRequest,
  getServerManifest,
  type MCPRequest,
} from '@/lib/creative/mcp-server';

export const maxDuration = 30;

// GET returns the server manifest (public discovery, no auth required)
export async function GET() {
  const manifest = getServerManifest();
  return NextResponse.json(manifest);
}

// POST handles MCP protocol requests (requires auth for tool execution)
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Handle batch requests
  if (Array.isArray(body)) {
    const requests = body as MCPRequest[];
    const responses = handleMCPBatch(requests);
    return NextResponse.json(responses);
  }

  // Validate single request
  const validation = validateMCPRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: body?.id ?? null,
        error: { code: -32600, message: 'Invalid Request', data: validation.errors },
      },
      { status: 400 },
    );
  }

  const request = body as MCPRequest;
  const response = handleMCPRequest(request);
  return NextResponse.json(response);
}

export const POST = withAtlas(__byokPOST);
