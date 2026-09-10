import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ApiKeyService } from '@/lib/services/api-key-service';

/** GET /api/platform/keys — list API keys for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ keys: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const keys = await ApiKeyService.list(organizationId);
  return NextResponse.json({ keys });
}

/** POST /api/platform/keys — create a new API key */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  const workspaceId = body.workspaceId || undefined;
  const scopes = Array.isArray(body.scopes) ? body.scopes : ['read'];

  try {
    const { apiKey, plaintextKey } = await ApiKeyService.create(organizationId, {
      name,
      description: body.description,
      workspaceId,
      scopes,
      rateLimitPerMin: body.rateLimitPerMin,
      rateLimitPerDay: body.rateLimitPerDay,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      createdBy: session.user.id,
    });
    return NextResponse.json({ apiKey, plaintextKey }, { status: 201 });
  } catch (e) {
    console.error('[platform/keys] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_key' }, { status: 500 });
  }
}
