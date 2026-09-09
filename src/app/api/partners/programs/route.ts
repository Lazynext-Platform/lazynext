import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/programs — list programs */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ programs: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (type) opts.type = type;
  if (status) opts.status = status;

  const programs = await PartnerService.listPrograms(organizationId, opts as never);
  return NextResponse.json({ programs });
}

/** POST /api/partners/programs — create a program */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) {
    return NextResponse.json({ error: 'name_and_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const program = await PartnerService.createProgram(
      ws.organizationId, ws.id,
      {
        name, type: type as never, description: body.description,
        requirements: body.requirements, benefits: body.benefits,
        marginRate: body.marginRate, status: body.status,
        startDate: body.startDate, endDate: body.endDate,
      },
      session.user.id,
    );
    return NextResponse.json({ program }, { status: 201 });
  } catch (e) {
    console.error('[partners/programs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_program' }, { status: 500 });
  }
}
