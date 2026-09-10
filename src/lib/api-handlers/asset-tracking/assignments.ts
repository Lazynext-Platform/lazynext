import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ assignments: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['assetId', 'assignedTo', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const assignments = await AssetTrackingService.listAssignments(organizationId, opts as never);
  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const assetId = String(body.assetId || '').trim();
  const assignedTo = String(body.assignedTo || '').trim();
  const assignedToName = String(body.assignedToName || '').trim();
  if (!assetId || !assignedTo || !assignedToName) return NextResponse.json({ error: 'assetId_assignedTo_assignedToName_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const assignment = await AssetTrackingService.createAssignment(ws.organizationId, ws.id, {
      assetId, assignedTo, assignedToName,
      status: body.status, assignedDate: body.assignedDate, returnDate: body.returnDate,
      expectedReturnDate: body.expectedReturnDate, conditionAtAssignment: body.conditionAtAssignment, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (e) {
    console.error('[asset-tracking/assignments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_assignment' }, { status: 500 });
  }
}
