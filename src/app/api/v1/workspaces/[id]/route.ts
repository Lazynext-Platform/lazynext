import { NextRequest, NextResponse } from 'next/server';
import { setRequestForAuth, requireApiKey } from '@/lib/auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

// GET /api/v1/workspaces/[id] — get workspace detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  setRequestForAuth(req);
  const ctx = await requireApiKey(['read']);
  if (ctx instanceof NextResponse) return ctx;

  const apiKeyCtx = ctx as { userId: string; workspaceId: string | null; scopes: string[]; keyId: string };
  const detail = await WorkspaceService.getForUser(id, apiKeyCtx.userId);
  if (!detail) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ workspace: detail });
}
