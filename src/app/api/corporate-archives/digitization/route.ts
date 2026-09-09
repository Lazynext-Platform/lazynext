import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateArchivesService } from '@/lib/services/corporate-archives-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ digitization: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['recordId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const digitization = await CorporateArchivesService.listDigitization(organizationId, opts as never);
  return NextResponse.json({ digitization });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const recordId = String(body.recordId || '').trim();
  const type = String(body.type || '').trim();
  if (!recordId || !type) return NextResponse.json({ error: 'recordId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const digitization = await CorporateArchivesService.createDigitization(ws.organizationId, ws.id, {
      recordId, type: type as never,
      description: body.description, status: body.status, priority: body.priority,
      assignedTo: body.assignedTo, startDate: body.startDate, completedDate: body.completedDate,
      fileFormat: body.fileFormat, fileSize: body.fileSize, resolution: body.resolution,
      qualityScore: body.qualityScore, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ digitization }, { status: 201 });
  } catch (e) {
    console.error('[corporate-archives/digitization] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_digitization' }, { status: 500 });
  }
}
