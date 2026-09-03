import { NextResponse } from 'next/server';

/**
 * RFC 9728 OAuth 2.1 Protected Resource Metadata.
 * Tells MCP clients where to obtain authorization for the /mcp endpoint.
 */
export async function GET() {
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3100';

  return NextResponse.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [`${baseUrl}/api/auth`],
    bearer_methods_supported: ['header'],
    scopes_supported: ['read', 'write', 'admin'],
    resource_documentation: `${baseUrl}/docs/mcp`,
  });
}
