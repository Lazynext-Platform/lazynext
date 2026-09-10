import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ProductLifecycleService } from '@/lib/services/product-lifecycle-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ products: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['status', 'category', 'owner']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const products = await ProductLifecycleService.listProducts(organizationId, opts as never);
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const product = await ProductLifecycleService.createProduct(ws.organizationId, ws.id, {
      name,
      description: body.description, category: body.category, status: body.status,
      owner: body.owner, startDate: body.startDate, targetLaunchDate: body.targetLaunchDate,
      actualLaunchDate: body.actualLaunchDate, budget: body.budget, priority: body.priority,
      tags: body.tags, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    console.error('[product-lifecycle/products] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_product' }, { status: 500 });
  }
}
