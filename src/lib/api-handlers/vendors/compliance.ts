import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorComplianceService } from '@/lib/services/vendor-compliance-service';

/** GET /api/vendors/compliance — list compliance records */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ records: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const records = await VendorComplianceService.list(organizationId, {
    vendorId: sp.get('vendorId') || undefined,
    type: (sp.get('type') as 'insurance' | 'certification' | 'security' | 'regulatory' | 'contractual') || undefined,
    status: (sp.get('status') as 'compliant' | 'non_compliant' | 'pending' | 'expired') || undefined,
  });

  return NextResponse.json({ records });
}

/** POST /api/vendors/compliance — create a compliance record */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.vendorId || !body.type || !body.name || !body.status) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const record = await VendorComplianceService.create(organizationId, {
      vendorId: body.vendorId,
      type: body.type,
      name: body.name,
      status: body.status,
      expiryDate: body.expiryDate,
      documentUrl: body.documentUrl,
      notes: body.notes,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    console.error('[vendors/compliance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_record' }, { status: 500 });
  }
}
