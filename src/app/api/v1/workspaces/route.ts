import { NextRequest, NextResponse } from 'next/server';
import { setRequestForAuth, requireApiKey } from '@/lib/auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';
import { AuditService, AuditActions } from '@/lib/services/audit';

// GET /api/v1/workspaces — list workspaces for the API key's user
export async function GET(req: NextRequest) {
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['read']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; workspaceId: string | null; scopes: string[]; keyId: string };

  // Ensure user has a default workspace
  await WorkspaceService.ensureDefaultWorkspace(apiKeyCtx.userId);
  const workspaces = await WorkspaceService.listForUser(apiKeyCtx.userId);

  await AuditService.log({
    userId: apiKeyCtx.userId,
    action: AuditActions.API_REQUEST,
    targetType: 'workspace',
    metadata: { endpoint: 'GET /api/v1/workspaces', keyId: apiKeyCtx.keyId },
  });

  return NextResponse.json({ workspaces });
}
