import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ApprovalService } from '@/lib/services/approval';
import { WorkspaceService } from '@/lib/services/workspace';
import { TenantGuardService } from '@/lib/services/tenant-guard';

/**
 * GET /api/approvals/[id] — get an approval by ID.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const sp = req.nextUrl.searchParams;
  const workspaceIdParam = sp.get('workspaceId') || undefined;

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let workspaceId = workspaceIdParam;
  if (workspaceId) {
    const hasAccess = workspaces.some((w) => w.id === workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } else {
    workspaceId = workspaces[0].id;
  }

  const owned = await TenantGuardService.verifyApprovalOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const approval = await ApprovalService.get(id);
    if (!approval) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ approval });
  } catch (e) {
    console.error('[approvals] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_approval' }, { status: 500 });
  }
}

/**
 * POST /api/approvals/[id] — approve or reject an approval request.
 * Body: { decision: 'approve' | 'reject', note?: string }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const sp = req.nextUrl.searchParams;
  const workspaceIdParam = sp.get('workspaceId') || undefined;

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let workspaceId = workspaceIdParam;
  if (workspaceId) {
    const hasAccess = workspaces.some((w) => w.id === workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } else {
    workspaceId = workspaces[0].id;
  }

  const owned = await TenantGuardService.verifyApprovalOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: { decision?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const decision = body.decision?.trim();
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json({ error: 'decision_required' }, { status: 400 });
  }

  try {
    // Verify the approval exists
    const existing = await ApprovalService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'already_decided' }, { status: 400 });
    }

    const note = body.note?.trim() || undefined;
    const result =
      decision === 'approve'
        ? await ApprovalService.approve(id, session.user.id, note)
        : await ApprovalService.reject(id, session.user.id, note);

    if (!result) {
      return NextResponse.json({ error: 'failed_to_decide' }, { status: 400 });
    }
    return NextResponse.json({ approval: result });
  } catch (e) {
    console.error('[approvals] decide error:', e);
    return NextResponse.json({ error: 'failed_to_decide_approval' }, { status: 500 });
  }
}
