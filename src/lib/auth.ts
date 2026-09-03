import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { generateApiKey, hashApiKey } from '@/lib/api-key-crypto';

// Re-export for backward compatibility
export { generateApiKey, hashApiKey };

// ── Types ──

export interface AuthContext {
  userId: string;
  email: string | null;
  name: string | null;
  workspaceId?: string;
  role?: string;
}

export interface ApiKeyContext {
  userId: string;
  workspaceId: string | null;
  scopes: string[];
  keyId: string;
}

// ── Session-based auth ──

/**
 * Require an authenticated session. Returns the auth context or a 401 response.
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return {
    userId: session.user.id,
    email: session.user.email || null,
    name: session.user.name || null,
  };
}

/**
 * Require an authenticated session with a specific workspace role.
 */
export async function requireRole(
  workspaceId: string,
  roles: string[],
): Promise<AuthContext | NextResponse> {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const ctx = authResult as AuthContext;
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: ctx.userId, workspaceId } },
  });

  if (!membership) {
    return NextResponse.json({ error: 'forbidden', message: 'Not a member of this workspace' }, { status: 403 });
  }

  if (!roles.includes(membership.role)) {
    return NextResponse.json(
      { error: 'forbidden', message: `Requires one of: ${roles.join(', ')}` },
      { status: 403 },
    );
  }

  return {
    ...ctx,
    workspaceId,
    role: membership.role,
  };
}

// ── API Key auth ──

/**
 * Authenticate via API key from the Authorization header.
 * Format: `Authorization: Bearer ln_live_xxxxxxxx`
 */
export async function requireApiKey(scopes: string[] = ['read']): Promise<ApiKeyContext | NextResponse> {
  const header = requireApiKeyHeader();
  if (!header) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Missing or invalid API key. Use: Authorization: Bearer ln_live_...' },
      { status: 401 },
    );
  }

  const keyHash = hashApiKey(header);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey || apiKey.revokedAt) {
    return NextResponse.json({ error: 'unauthorized', message: 'Invalid or revoked API key' }, { status: 401 });
  }

  // Check scopes
  const keyScopes: string[] = JSON.parse(apiKey.scopes || '[]');
  const hasScope = scopes.some((s) => keyScopes.includes(s) || keyScopes.includes('admin'));
  if (!hasScope) {
    return NextResponse.json(
      { error: 'forbidden', message: `API key requires scope: ${scopes.join(' or ')}` },
      { status: 403 },
    );
  }

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    userId: apiKey.userId,
    workspaceId: apiKey.workspaceId,
    scopes: keyScopes,
    keyId: apiKey.id,
  };
}

// We need to read from the request headers — use a module-level approach
let _currentRequest: NextRequest | null = null;

export function setRequestForAuth(req: NextRequest) {
  _currentRequest = req;
}

function requireApiKeyHeader(): string | null {
  if (!_currentRequest) return null;
  const authHeader = _currentRequest.headers.get('authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(ln_live_\S+)$/i);
  return match ? match[1] : null;
}

// ── API Key generation ──
// generateApiKey and hashApiKey are imported from @/lib/api-key-crypto

// ── Helper to get client IP ──

export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
