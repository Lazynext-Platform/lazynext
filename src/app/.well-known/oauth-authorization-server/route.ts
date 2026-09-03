import { NextResponse } from 'next/server';

/**
 * RFC 8414 OAuth 2.0 Authorization Server Metadata.
 *
 * This endpoint completes the OAuth 2.1 discovery flow for MCP clients:
 *   1. Client calls /.well-known/oauth-protected-resource → gets authorization_servers
 *   2. Client calls /.well-known/oauth-authorization-server → gets this metadata
 *   3. Client redirects user to authorization_endpoint to log in
 *   4. User authenticates via NextAuth (Google or credentials)
 *   5. Client receives a session token for MCP requests
 *
 * NextAuth v5 handles the actual authorization and token issuance at
 * /api/auth/* endpoints. This metadata advertises those endpoints to
 * standards-compliant MCP clients.
 */
export async function GET() {
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3100';

  return NextResponse.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/signin`,
    token_endpoint: `${baseUrl}/api/auth/session`,
    registration_endpoint: `${baseUrl}/api/auth/providers`,
    response_types_supported: ['code', 'token'],
    grant_types_supported: ['authorization_code', 'implicit'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['read', 'write', 'admin', 'openid', 'profile', 'email'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    revocation_endpoint: `${baseUrl}/api/auth/signout`,
    introspection_endpoint: `${baseUrl}/api/auth/session`,
    service_documentation: `${baseUrl}/docs/mcp`,
    op_policy_uri: `${baseUrl}/terms`,
    op_tos_uri: `${baseUrl}/terms`,
  });
}
