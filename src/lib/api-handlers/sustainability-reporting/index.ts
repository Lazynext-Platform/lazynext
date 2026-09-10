import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { safeError } from '@/lib/security';
import { SustainabilityReportingService } from '@/lib/services/sustainability-reporting-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ sustainabilityReports: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const items = await SustainabilityReportingService.listSustainabilityReports(organizationId, opts as never);
  return NextResponse.json({ sustainabilityReports: items });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const item = await SustainabilityReportingService.createSustainabilityReport(ws.organizationId, ws.id, { ...body, name, type } as never, session.user.id);
    return NextResponse.json({ sustainabilityReport: item }, { status: 201 });
  } catch (e) {
    return NextResponse.json(safeError(e, 'sustainability-reporting', 'create_failed'), { status: 500 });
  }
}
