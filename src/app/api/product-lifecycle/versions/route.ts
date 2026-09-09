import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ProductLifecycleService } from '@/lib/services/product-lifecycle-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ versions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['productId', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const versions = await ProductLifecycleService.listVersions(organizationId, opts as never);
  return NextResponse.json({ versions });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || '').trim();
  const version = String(body.version || '').trim();
  if (!productId || !version) return NextResponse.json({ error: 'productId_version_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const v = await ProductLifecycleService.createVersion(ws.organizationId, ws.id, {
      productId, version,
      status: body.status, releaseDate: body.releaseDate, description: body.description,
      changes: body.changes, features: body.features, bugFixes: body.bugFixes,
      breakingChanges: body.breakingChanges, downloadUrl: body.downloadUrl, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ version: v }, { status: 201 });
  } catch (e) {
    console.error('[product-lifecycle/versions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_version' }, { status: 500 });
  }
}
