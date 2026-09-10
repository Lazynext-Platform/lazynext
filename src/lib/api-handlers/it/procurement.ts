import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITProcurementService } from '@/lib/services/it-procurement-service';

/** GET /api/it/procurement — list procurement requests */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ requests: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const type = url.searchParams.get('type') || undefined;

  const requests = await ITProcurementService.list(organizationId, { status, type });
  return NextResponse.json({ requests });
}

/** POST /api/it/procurement — create a procurement request */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const requestName = String(body.requestName || '').trim();
  if (!requestName) {
    return NextResponse.json({ error: 'requestName_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const request = await ITProcurementService.create({
      organizationId,
      requestName,
      description: body.description,
      type: body.type,
      items: Array.isArray(body.items) ? body.items : undefined,
      currency: body.currency,
      vendorId: body.vendorId,
      requestedBy: session.user.id,
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error('[it/procurement] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_procurement' }, { status: 500 });
  }
}
