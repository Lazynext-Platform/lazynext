import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InternalAuditService } from '@/lib/services/internal-audit-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ schedules: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['planId', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const schedules = await InternalAuditService.listSchedules(organizationId, opts as never);
  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId || '').trim();
  const title = String(body.title || '').trim();
  const scheduledDate = String(body.scheduledDate || '').trim();
  if (!planId || !title || !scheduledDate) return NextResponse.json({ error: 'planId_title_scheduledDate_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const schedule = await InternalAuditService.createSchedule(ws.organizationId, ws.id, {
      planId, title, scheduledDate,
      duration: body.duration, location: body.location, participants: body.participants,
      status: body.status, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (e) {
    console.error('[internal-audit/schedules] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_schedule' }, { status: 500 });
  }
}
