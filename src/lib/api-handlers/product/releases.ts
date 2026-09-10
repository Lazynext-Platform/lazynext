import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ReleaseService } from '@/lib/services/product-management-service';

/** GET /api/product/releases — list releases */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ releases: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;

  const releases = await ReleaseService.list(organizationId, { status });
  return NextResponse.json({ releases });
}

/** POST /api/product/releases — create a release */
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
  try {
    const release = await ReleaseService.create({
      organizationId,
      name,
      version: body.version,
      description: body.description,
      status: body.status,
      releaseDate: body.releaseDate ? new Date(body.releaseDate) : undefined,
      releaseNotes: body.releaseNotes,
      createdBy: session.user.id,
    });
    return NextResponse.json({ release }, { status: 201 });
  } catch (e) {
    console.error('[product/releases] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_release' }, { status: 500 });
  }
}
