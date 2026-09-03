import { NextResponse } from 'next/server';

// The legacy MCP server (protocol 2024-11-05) has been consolidated into the
// canonical MCP endpoint at /mcp (protocol 2026-07-28).
// This route returns a 301 redirect for GET and a 410 Gone for POST to inform
// clients that the endpoint has moved.

export function GET(req: Request) {
  const url = new URL('/mcp', req.url);
  return NextResponse.redirect(url, {
    status: 301,
    headers: {
      'Deprecation': 'true',
      'Sunset': 'Sat, 31 Dec 2026 23:59:59 GMT',
      'Link': '</mcp>; rel="successor-version"',
    },
  });
}

export function POST() {
  return NextResponse.json(
    {
      error: 'endpoint_moved',
      message: 'The MCP server has moved to /mcp (protocol 2026-07-28). Update your client configuration.',
      newEndpoint: '/mcp',
    },
    {
      status: 410,
      headers: {
        'Deprecation': 'true',
        'Sunset': 'Sat, 31 Dec 2026 23:59:59 GMT',
        'Link': '</mcp>; rel="successor-version"',
      },
    },
  );
}
