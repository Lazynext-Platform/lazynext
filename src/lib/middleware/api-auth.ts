import { ApiKeyService } from '@/lib/services/api-key-service';
import { RateLimiter } from '@/lib/services/rate-limiter';

// ── API Auth Middleware (Phase 12: API Platform) ──
//
// Helper for authenticating public API routes via org-scoped API keys.
// Extracts the key from the `Authorization: Bearer lnxt_...` header (or the
// `X-API-Key` header as a fallback), verifies it, and checks rate limits.

export interface ApiAuthResult {
  authenticated: boolean;
  apiKey?: {
    id: string;
    organizationId: string;
    workspaceId: string | null;
    scopes: string[];
    rateLimitPerMin: number;
    rateLimitPerDay: number;
  };
  organizationId?: string;
  rateLimited: boolean;
  error?: string;
  remainingMin?: number;
  remainingDay?: number;
}

function extractKey(request: Request): string | null {
  // Authorization: Bearer lnxt_...
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(lnxt_\S+)$/i);
    if (match) return match[1];
  }
  // X-API-Key fallback
  const xKey = request.headers.get('x-api-key');
  if (xKey && xKey.startsWith('lnxt_')) return xKey;
  return null;
}

function parseScopes(scopesJson: string): string[] {
  try {
    return JSON.parse(scopesJson) as string[];
  } catch {
    return [];
  }
}

export async function authenticateApiKey(request: Request): Promise<ApiAuthResult> {
  const plaintextKey = extractKey(request);
  if (!plaintextKey) {
    return { authenticated: false, rateLimited: false, error: 'Missing API key. Use: Authorization: Bearer lnxt_...' };
  }

  const apiKey = await ApiKeyService.verify(plaintextKey);
  if (!apiKey) {
    return { authenticated: false, rateLimited: false, error: 'Invalid, revoked, or expired API key' };
  }

  const scopes = parseScopes(apiKey.scopes);

  // Check rate limits
  const limits = { perMin: apiKey.rateLimitPerMin, perDay: apiKey.rateLimitPerDay };
  const check = RateLimiter.check(apiKey.id, limits);

  if (!check.allowed) {
    // Record the rate-limited request
    RateLimiter.record(apiKey.id);
    return {
      authenticated: true,
      apiKey: {
        id: apiKey.id,
        organizationId: apiKey.organizationId,
        workspaceId: apiKey.workspaceId,
        scopes,
        rateLimitPerMin: apiKey.rateLimitPerMin,
        rateLimitPerDay: apiKey.rateLimitPerDay,
      },
      organizationId: apiKey.organizationId,
      rateLimited: true,
      error: 'Rate limit exceeded',
      remainingMin: check.remainingMin,
      remainingDay: check.remainingDay,
    };
  }

  // Record the allowed request
  RateLimiter.record(apiKey.id);

  return {
    authenticated: true,
    apiKey: {
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      workspaceId: apiKey.workspaceId,
      scopes,
      rateLimitPerMin: apiKey.rateLimitPerMin,
      rateLimitPerDay: apiKey.rateLimitPerDay,
    },
    organizationId: apiKey.organizationId,
    rateLimited: false,
    remainingMin: check.remainingMin,
    remainingDay: check.remainingDay,
  };
}
