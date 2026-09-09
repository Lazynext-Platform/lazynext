import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ProductLifecycleService } from '@/lib/services/product-lifecycle-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ eols: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['productId', 'status', 'reason']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const eols = await ProductLifecycleService.listEols(organizationId, opts as never);
  return NextResponse.json({ eols });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || '').trim();
  const reason = String(body.reason || '').trim();
  if (!productId || !reason) return NextResponse.json({ error: 'productId_reason_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const eol = await ProductLifecycleService.createEol(ws.organizationId, ws.id, {
      productId, reason: reason as never,
      versionId: body.versionId, status: body.status,
      announcementDate: body.announcementDate, effectiveDate: body.effectiveDate,
      endOfSupportDate: body.endOfSupportDate, migrationPath: body.migrationPath,
      replacement: body.replacement, description: body.description, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ eol }, { status: 201 });
  } catch (e) {
    console.error('[product-lifecycle/eol] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_eol' }, { status: 500 });
  }
}
