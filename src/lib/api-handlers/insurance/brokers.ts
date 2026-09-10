import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/brokers — list brokers (query: organizationId, company) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ brokers: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { company?: string } = {};
  const company = sp.get('company');
  if (company) opts.company = company;

  const brokers = await InsuranceService.listBrokers(organizationId, opts);
  return NextResponse.json({ brokers });
}

/** POST /api/insurance/brokers — create a broker */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const broker = await InsuranceService.createBroker(
      organizationId,
      workspaceId,
      {
        name: body.name,
        company: body.company,
        email: body.email,
        phone: body.phone,
        licenseNumber: body.licenseNumber,
        specialties: body.specialties,
        commissionRate: body.commissionRate !== undefined ? Number(body.commissionRate) : undefined,
      },
      session.user.id,
    );
    return NextResponse.json({ broker }, { status: 201 });
  } catch (e) {
    console.error('[insurance/brokers] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_broker' }, { status: 500 });
  }
}
