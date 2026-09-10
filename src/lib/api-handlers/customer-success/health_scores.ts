import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/health-scores — list health scores */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ healthScores: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { customerId?: string; category?: string } = {};
  const customerId = url.searchParams.get('customerId');
  const category = url.searchParams.get('category');
  if (customerId) opts.customerId = customerId;
  if (category) opts.category = category;

  const healthScores = await CustomerSuccessService.listHealthScores(organizationId, opts as never);
  return NextResponse.json({ healthScores });
}

/** POST /api/customer-success/health-scores — create a health score */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId || '').trim();
  const category = String(body.category || '').trim();
  if (!customerId || !category) {
    return NextResponse.json({ error: 'customerId_and_category_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const healthScore = await CustomerSuccessService.createHealthScore(
      ws.organizationId, ws.id,
      {
        customerId, category: category as never,
        score: typeof body.score === 'number' ? body.score : 0,
        components: body.components, trend: body.trend,
        calculatedAt: body.calculatedAt, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ healthScore }, { status: 201 });
  } catch (e) {
    console.error('[customer-success/health-scores] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_health_score' }, { status: 500 });
  }
}
