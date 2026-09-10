import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ManagementSuccessionService } from '@/lib/services/management-succession-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ reviews: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['planId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const reviews = await ManagementSuccessionService.listReviews(organizationId, opts as never);
  return NextResponse.json({ reviews });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId || '').trim();
  const type = String(body.type || '').trim();
  if (!planId || !type) return NextResponse.json({ error: 'planId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const review = await ManagementSuccessionService.createReview(ws.organizationId, ws.id, {
      planId, type: type as never,
      description: body.description, status: body.status,
      scheduledDate: body.scheduledDate, completedDate: body.completedDate,
      reviewer: body.reviewer, findings: body.findings,
      recommendations: body.recommendations, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ review }, { status: 201 });
  } catch (e) {
    console.error('[management-succession/reviews] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_review' }, { status: 500 });
  }
}
